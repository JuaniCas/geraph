from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_usuario_actual
from app.core.config import get_settings
from app.models.models import Partido, Foto, Usuario
from app.schemas.schemas import PartidoCrear, PartidoResponse, FotoResponse
from app.services.watermark import procesar_imagen
from app.services.storage import subir_archivo
import uuid
from supabase import create_client

router = APIRouter(prefix="/partidos", tags=["Partidos y Fotos"])
settings = get_settings()

def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# ─── ENDPOINTS PÚBLICOS ───────────────────────────────────────────────────────

@router.get("/", response_model=List[PartidoResponse])
def listar_partidos(db: Session = Depends(get_db)):
    partidos = db.query(Partido).filter(
        Partido.activo == True
    ).order_by(Partido.creado_en.desc()).all()

    return [
        PartidoResponse(
            id=p.id,
            titulo=p.titulo,
            fecha=p.fecha,
            descripcion=p.descripcion,
            precio_por_foto=p.precio_por_foto,
            activo=p.activo,
            total_fotos=len(p.fotos),
            creado_en=p.creado_en,
        )
        for p in partidos
    ]


@router.get("/{partido_id}/fotos", response_model=List[FotoResponse])
def listar_fotos_partido(partido_id: int, db: Session = Depends(get_db)):
    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return partido.fotos


# ─── ENDPOINTS PROTEGIDOS ─────────────────────────────────────────────────────

@router.get("/todos", response_model=List[PartidoResponse])
def listar_todos_partidos(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    """Devuelve todos los partidos (activos e inactivos) para el panel admin."""
    partidos = db.query(Partido).order_by(Partido.creado_en.desc()).all()
    return [
        PartidoResponse(
            id=p.id,
            titulo=p.titulo,
            fecha=p.fecha,
            descripcion=p.descripcion,
            precio_por_foto=p.precio_por_foto,
            activo=p.activo,
            total_fotos=len(p.fotos),
            creado_en=p.creado_en,
        )
        for p in partidos
    ]

@router.post("/", response_model=PartidoResponse, status_code=status.HTTP_201_CREATED)
def crear_partido(
    datos: PartidoCrear,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    partido = Partido(**datos.model_dump(), fotografo_id=usuario_actual.id)
    db.add(partido)
    db.commit()
    db.refresh(partido)
    return PartidoResponse(
        id=partido.id,
        titulo=partido.titulo,
        fecha=partido.fecha,
        descripcion=partido.descripcion,
        precio_por_foto=partido.precio_por_foto,
        activo=partido.activo,
        total_fotos=0,
        creado_en=partido.creado_en,
    )


@router.post("/{partido_id}/fotos", response_model=FotoResponse, status_code=status.HTTP_201_CREATED)
async def subir_foto(
    partido_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    if not archivo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes")

    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    # Leemos la imagen y generamos las dos versiones
    bytes_originales = await archivo.read()
    preview_bytes, thumbnail_bytes = procesar_imagen(bytes_originales)

    # Generamos rutas únicas para cada versión
    nombre_base = uuid.uuid4().hex
    ruta_preview = f"publicas/partido-{partido_id}/{nombre_base}_wm.jpg"
    ruta_thumbnail = f"publicas/partido-{partido_id}/{nombre_base}_thumb.jpg"
    ruta_original = f"publicas/partido-{partido_id}/{nombre_base}.jpg"

    # preview con marca de agua
    url_preview = subir_archivo(ruta_preview, preview_bytes)
    #subimos thumbnail
    url_thumbnail = subir_archivo (ruta_thumbnail, thumbnail_bytes)
    #subimos original
    subir_archivo(ruta_original, bytes_originales)

    # Guardamos en la base de datos
    foto = Foto(
        nombre_archivo=archivo.filename,
        url_marca_agua=url_preview,
        url_thumbnail=url_thumbnail,
        url_original=ruta_original,
        partido_id=partido_id,
    )
    db.add(foto)
    db.commit()
    db.refresh(foto)
    return foto

@router.patch("/{partido_id}/activar", status_code=status.HTTP_200_OK)
def activar_partido(
    partido_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    """Reactiva un partido desactivado."""
    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    partido.activo = True
    db.commit()
    db.refresh(partido)
    return partido

@router.delete("/{partido_id}", status_code=status.HTTP_204_NO_CONTENT)
def desactivar_partido(
    partido_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    partido.activo = False
    db.commit()

@router.delete("/{partido_id}/definitivo", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_partido_definitivo(
    partido_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    """
    Elimina el partido y todas sus fotos definitivamente.
    También borra las imágenes de Supabase Storage.
    """
    partido = db.query(Partido).filter(Partido.id == partido_id).first()
    if not partido:
        raise HTTPException(status_code=404, detail="Partido no encontrado")

    # Borramos las imágenes de Supabase
    supabase = get_supabase()
    for foto in partido.fotos:
        try:
            # Borramos preview y thumbnail
            ruta_preview = foto.url_marca_agua.split('/publicas/')[-1]
            supabase.storage.from_(settings.SUPABASE_BUCKET).remove(
                [f"publicas/{ruta_preview}"]
            )
        except Exception:
            pass  # Si falla el borrado en Supabase continuamos igual

    from app.models.models import Solicitud
    db.query(Solicitud).filter(Solicitud.partido_id == partido_id).delete()

    # Borramos las fotos de la base de datos
    db.query(Foto).filter(Foto.partido_id == partido_id).delete()

    # Borramos el partido
    db.delete(partido)
    db.commit()



