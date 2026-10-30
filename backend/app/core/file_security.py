from fastapi import UploadFile, HTTPException, status
from typing import Set

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_IMAGE_MIME_TYPES: Set[str] = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif"
}

ALLOWED_DOCUMENT_MIME_TYPES: Set[str] = ALLOWED_IMAGE_MIME_TYPES | {
    "application/pdf"
}

async def read_and_validate_file(
    file: UploadFile,
    max_bytes: int = MAX_FILE_SIZE_BYTES,
    allowed_mime_types: Set[str] = ALLOWED_DOCUMENT_MIME_TYPES
) -> bytes:
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se ha proporcionado ningún archivo para procesar."
        )

    content_type = (file.content_type or "").lower().strip()
    if content_type not in allowed_mime_types:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Formato de archivo no permitido ({content_type}). Formatos soportados: JPG, PNG, WEBP, PDF."
        )

    contents = bytearray()
    chunk_size = 1024 * 64
    total_read = 0

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_read += len(chunk)
        if total_read > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"El archivo excede el tamaño máximo permitido de {max_bytes // (1024 * 1024)} MB."
            )
        contents.extend(chunk)

    if len(contents) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo proporcionado está vacío."
        )

    return bytes(contents)
