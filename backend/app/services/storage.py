import boto3
from botocore.config import Config as BotoConfig
from app.core.config import get_settings

settings = get_settings()


def _get_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT,
        aws_access_key_id=settings.R2_ACCESS_KEY,
        aws_secret_access_key=settings.R2_SECRET_KEY,
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )


def subir_archivo(ruta: str, contenido: bytes, content_type: str = "image/jpeg") -> str:
    """
    Sube un archivo a Cloudflare R2 y devuelve la URL pública.
    """
    cliente = _get_client()
    cliente.put_object(
        Bucket=settings.R2_BUCKET,
        Key=ruta,
        Body=contenido,
        ContentType=content_type,
    )
    return f"{settings.R2_PUBLIC_URL}/{ruta}"


def eliminar_archivo(ruta: str) -> None:
    """Elimina un archivo de Cloudflare R2."""
    cliente = _get_client()
    cliente.delete_object(Bucket=settings.R2_BUCKET, Key=ruta)


def generar_url_firmada(ruta: str, expira_en: int = 604800) -> str:
    """
    Genera una URL firmada temporal para descargar un archivo privado.
    expira_en está en segundos (default 7 días).
    """
    cliente = _get_client()
    return cliente.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.R2_BUCKET, "Key": ruta},
        ExpiresIn=expira_en,
    )