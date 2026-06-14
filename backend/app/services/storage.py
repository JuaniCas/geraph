from supabase import create_client
from app.core.config import get_settings

settings = get_settings()


def _get_client():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)


def subir_archivo(ruta: str, contenido: bytes, content_type: str = "image/jpeg") -> str:
    """
    Sube un archivo a Supabase Storage y devuelve la URL pública.
    
    ruta: la ruta dentro del bucket, ej: "publicas/partido-1/foto_wm.jpg"
    contenido: los bytes del archivo
    content_type: el tipo de archivo, por defecto imagen JPEG
    """
    cliente = _get_client()
    cliente.storage.from_(settings.SUPABASE_BUCKET).upload(
        path=ruta,
        file=contenido,
        file_options={"content-type": content_type},
    )
    return cliente.storage.from_(settings.SUPABASE_BUCKET).get_public_url(ruta)


def eliminar_archivo(ruta: str) -> None:
    """
    Elimina un archivo de Supabase Storage.
    Se usa cuando el fotógrafo borra una foto.
    """
    cliente = _get_client()
    cliente.storage.from_(settings.SUPABASE_BUCKET).remove([ruta])