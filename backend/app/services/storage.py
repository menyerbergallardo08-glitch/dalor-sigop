import os
import io
import uuid
import base64
from typing import Optional, Tuple
from PIL import Image
import boto3
from botocore.config import Config

R2_ENDPOINT = os.getenv("R2_ENDPOINT", "https://59ecd0c0c76314597b42719a564a6eb8.r2.cloudflarestorage.com")
R2_ACCESS_KEY = os.getenv("R2_ACCESS_KEY", "5148d76de0731fe95c3fce0ded7fea92")
R2_SECRET_KEY = os.getenv("R2_SECRET_KEY", "9d6a5329fafc5a729fbe772f69dc10c9bc6a4caf6cc9fa8af156320370b1fe09")
R2_BUCKET = os.getenv("R2_BUCKET", "dalor-comprobantes")
R2_PUBLIC_URL = os.getenv("R2_PUBLIC_URL", "https://pub-99920f720f2d4f58903e93998a2f4900.r2.dev")

class R2StorageService:
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            try:
                cls._client = boto3.client(
                    "s3",
                    endpoint_url=R2_ENDPOINT,
                    aws_access_key_id=R2_ACCESS_KEY,
                    aws_secret_access_key=R2_SECRET_KEY,
                    config=Config(signature_version="s3v4"),
                    region_name="auto"
                )
            except Exception as e:
                print(f"[R2Storage] Init Error: {e}")
                cls._client = None
        return cls._client

    @classmethod
    def upload_receipt_image(cls, image_bytes: bytes, filename: str = "receipt.jpg") -> Tuple[str, str]:
        """
        Optimiza la imagen con PIL (JPEG quality 80, max 1400px),
        la sube directamente a Cloudflare R2 y devuelve (presigned_url, s3_key).
        Si R2 no está disponible, genera un Data URL Base64 de fallback.
        """
        try:
            # 1. Optimizar imagen
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            max_dim = 1400
            if max(img.size) > max_dim:
                img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
            
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=80, optimize=True)
            optimized_bytes = buf.getvalue()

            # 2. Subir a Cloudflare R2
            client = cls.get_client()
            unique_key = f"receipts/{uuid.uuid4().hex[:12]}_{filename}"
            
            if client:
                client.put_object(
                    Bucket=R2_BUCKET,
                    Key=unique_key,
                    Body=optimized_bytes,
                    ContentType="image/jpeg"
                )
                
                # Generar Presigned URL segura de 7 días
                try:
                    presigned_url = client.generate_presigned_url(
                        "get_object",
                        Params={"Bucket": R2_BUCKET, "Key": unique_key},
                        ExpiresIn=604800 # 7 días
                    )
                    return presigned_url, unique_key
                except Exception:
                    return f"{R2_PUBLIC_URL}/{unique_key}", unique_key
            else:
                # Fallback Base64 si R2 no responde
                b64 = base64.b64encode(optimized_bytes).decode("utf-8")
                return f"data:image/jpeg;base64,{b64}", "local_base64"

        except Exception as e:
            print(f"[R2Storage] Upload error: {e}")
            b64 = base64.b64encode(image_bytes).decode("utf-8")
            return f"data:image/jpeg;base64,{b64}", "fallback_base64"

    @classmethod
    def get_file_url(cls, key_or_url: str) -> Optional[str]:
        """
        Devuelve una URL fresca firmada para visualizar la imagen en cualquier momento.
        """
        if not key_or_url:
            return None
        if key_or_url.startswith("data:") or ("X-Amz-Signature" in key_or_url and "X-Amz-Expires" in key_or_url):
            return key_or_url
        
        # Extraer key si es una URL antigua
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
