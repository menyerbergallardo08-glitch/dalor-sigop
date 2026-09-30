import os
import io
import uuid
import base64
from typing import Optional, Tuple
from PIL import Image
import boto3
from botocore.config import Config

R2_ENDPOINT = os.getenv("R2_ENDPOINT")
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY")
R2_BUCKET = os.getenv("R2_BUCKET", "dalor-comprobantes")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "")

class R2StorageService:
    _client = None

    @classmethod
    def get_client(cls):
        if not R2_ENDPOINT or not R2_ACCESS_KEY or not R2_SECRET_KEY:
            return None
        if cls._client is None:
            try:
                cls._client = boto3.client(
                    "s3",
                    endpoint_url=R2_ENDPOINT,
                    aws_access_key_id=R2_ACCESS_KEY,
                    aws_secret_access_key=R2_SECRET_KEY,
                    config=Config(signature_version="s3v4", connect_timeout=2, read_timeout=3, retries={"max_attempts": 1}),
                    region_name="auto"
                )
            except Exception as e:
                print(f"[R2Storage] Init Error: {e}")
                cls._client = None
        return cls._client

    @classmethod
    def upload_receipt_image(cls, image_bytes: bytes, filename: str = "receipt.jpg") -> Tuple[str, str]:
        """
        Optimiza la imagen con PIL (JPEG quality 78, max 1280px).
        Si Cloudflare R2 está configurado, la sube a R2.
        Si R2 no está configurado (o falla), devuelve una Data URL base64 comprimida persistente
        que se almacena directamente en la base de datos PostgreSQL, inmune a reinicios del contenedor en Render.
        También guarda una copia local en /uploads/ si el disco lo permite.
        """
        try:
            is_pdf = filename.lower().endswith(".pdf") or image_bytes.startswith(b"%PDF")
            
            if is_pdf:
                optimized_bytes = image_bytes
                content_type = "application/pdf"
            else:
                # 1. Optimizar imagen
                img = Image.open(io.BytesIO(image_bytes))
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                
                max_dim = 1280
                if max(img.size) > max_dim:
                    img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
                
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=78, optimize=True)
                optimized_bytes = buf.getvalue()
                content_type = "image/jpeg"

            # 2. Guardar copia local en uploads/ si existe el directorio (caché en disco)
            try:
                from app.core.config import settings
                os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
                local_disk_path = os.path.join(settings.UPLOAD_DIR, filename)
                with open(local_disk_path, "wb") as f_loc:
                    f_loc.write(optimized_bytes)
            except Exception as loc_err:
                print(f"[R2Storage] Local cache warning: {loc_err}")

            # 3. Intentar Cloudflare R2 si está configurado
            client = cls.get_client()
            unique_key = f"receipts/{uuid.uuid4().hex[:12]}_{filename}"
            if client:
                try:
                    client.put_object(
                        Bucket=R2_BUCKET,
                        Key=unique_key,
                        Body=optimized_bytes,
                        ContentType=content_type
                    )
                    
                    try:
                        presigned_url = client.generate_presigned_url(
                            "get_object",
                            Params={"Bucket": R2_BUCKET, "Key": unique_key},
                            ExpiresIn=604800 # 7 días
                        )
                        return presigned_url, unique_key
                    except Exception:
                        if R2_PUBLIC_URL:
                            return f"{R2_PUBLIC_URL}/{unique_key}", unique_key
                except Exception as r2_err:
                    print(f"[R2Storage] R2 put_object warning, recurriendo a persistencia base64: {r2_err}")

            # 4. Persistencia definitiva: Base64 Data URL (almacenada en PostgreSQL, inmune a reinicios)
            b64_str = base64.b64encode(optimized_bytes).decode("ascii")
            data_url = f"data:{content_type};base64,{b64_str}"
            return data_url, f"db_{filename}"

        except Exception as e:
            print(f"[R2Storage] Upload error: {e}")
            try:
                b64_str = base64.b64encode(image_bytes).decode("ascii")
                mime = "application/pdf" if filename.lower().endswith(".pdf") else "image/jpeg"
                return f"data:{mime};base64,{b64_str}", f"db_{filename}"
            except Exception:
                return f"/uploads/{filename}", f"local_{filename}"

    @classmethod
    def get_file_url(cls, key_or_url: str) -> Optional[str]:
        """
        Devuelve una URL fresca firmada o base64 para visualizar la imagen en cualquier momento.
        """
        if not key_or_url:
            return None
        if key_or_url.startswith("data:") or ("X-Amz-Signature" in key_or_url and "X-Amz-Expires" in key_or_url):
            return key_or_url
        
        # Si es una ruta local en uploads/ y el archivo existe en disco, devolver data URL para resiliencia absoluta
        if key_or_url.startswith("/uploads/"):
            try:
                from app.core.config import settings
                local_fname = key_or_url.replace("/uploads/", "")
                local_fpath = os.path.join(settings.UPLOAD_DIR, local_fname)
                if os.path.exists(local_fpath):
                    with open(local_fpath, "rb") as f_in:
                        b = f_in.read()
                        mime = "application/pdf" if local_fname.lower().endswith(".pdf") else "image/jpeg"
                        return f"data:{mime};base64,{base64.b64encode(b).decode('ascii')}"
            except Exception as e_loc:
                print(f"[R2Storage] Error reading local file {key_or_url}: {e_loc}")

        # Extraer key si es una URL antigua de Cloudflare R2
        key = key_or_url
        if "r2.cloudflarestorage.com" in key_or_url or "r2.dev" in key_or_url:
            parts = key_or_url.split("/")
            if len(parts) >= 2:
                key = "/".join(parts[-2:])
        
        try:
            client = cls.get_client()
            if client:
                return client.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": R2_BUCKET, "Key": key},
                    ExpiresIn=86400 # 24 horas
                )
        except Exception:
            pass
        return key_or_url
