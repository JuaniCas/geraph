from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_usuario_actual
from app.models.models import Solicitud, Foto, Partido, Usuario
from app.schemas.schemas import SolicitudCrear, SolicitudResponse, SolicitudActualizarEstado
from app.services.storage import generar_url_firmada

router = APIRouter(prefix="/solicitudes", tags=["Solicitudes"])


@router.post("/", response_model=SolicitudResponse, status_code=status.HTTP_201_CREATED)
def crear_solicitud(datos: SolicitudCrear, db: Session = Depends(get_db)):
    if not datos.fotos_ids:
        raise HTTPException(status_code=400, detail="Seleccioná al menos una foto")

    fotos = db.query(Foto).filter(Foto.id.in_(datos.fotos_ids)).all()

    if len(fotos) != len(datos.fotos_ids):
        raise HTTPException(status_code=400, detail="Una o más fotos no existen")

    partido = db.query(Partido).filter(Partido.id == fotos[0].partido_id).first()
    total = len(fotos) * partido.precio_por_foto

    solicitud = Solicitud(
        nombre_jugador=datos.nombre_jugador,
        contacto=datos.contacto,
        fotos_ids=",".join(str(id) for id in datos.fotos_ids),
        total=total,
        partido_id=partido.id,
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return SolicitudResponse(
        id=solicitud.id,
        nombre_jugador=solicitud.nombre_jugador,
        contacto=solicitud.contacto,
        fotos_ids=solicitud.fotos_ids,
        total=solicitud.total,
        estado=solicitud.estado,
        partido_id=solicitud.partido_id,
        partido_titulo=partido.titulo,
        creado_en=solicitud.creado_en
    )


@router.get("/", response_model=List[SolicitudResponse])
def listar_solicitudes(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    solicitudes = db.query(Solicitud).order_by(Solicitud.creado_en.desc()).all()
    resultado = []
    for s in solicitudes:
        partido_titulo = None
        if s.partido_id:
            partido = db.query(Partido).filter(Partido.id == s.partido_id).first()
            partido_titulo = partido.titulo if partido else None
        resultado.append(SolicitudResponse(
            id=s.id,
            nombre_jugador=s.nombre_jugador,
            contacto=s.contacto,
            fotos_ids=s.fotos_ids,
            total=s.total,
            estado=s.estado,
            partido_id=s.partido_id,
            partido_titulo=partido_titulo,
            descarga_habilitada=s.descarga_habilitada,
            creado_en=s.creado_en
        ))
    return resultado


@router.patch("/{solicitud_id}/estado", response_model=SolicitudResponse)
def actualizar_estado(
    solicitud_id: int,
    datos: SolicitudActualizarEstado,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    estados_validos = ["nueva", "contactado", "entregada"]
    if datos.estado not in estados_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Estado inválido. Usá: {estados_validos}"
        )

    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    solicitud.estado = datos.estado
    db.commit()
    db.refresh(solicitud)
    return solicitud

@router.delete("/{solicitud_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_solicitud(
    solicitud_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    """Elimina una solicitud definitivamente."""
    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    db.delete(solicitud)
    db.commit()

@router.patch("/{solicitud_id}/habilitar-descarga", response_model=SolicitudResponse)
def habilitar_descarga(
    solicitud_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    """El fotógrafo habilita la descarga después de que el jugador paga."""
    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    solicitud.descarga_habilitada = True
    solicitud.estado = "entregada"
    db.commit()
    db.refresh(solicitud)

    partido = db.query(Partido).filter(Partido.id == solicitud.partido_id).first()
    return SolicitudResponse(
        id=solicitud.id,
        nombre_jugador=solicitud.nombre_jugador,
        contacto=solicitud.contacto,
        fotos_ids=solicitud.fotos_ids,
        total=solicitud.total,
        estado=solicitud.estado,
        partido_id=solicitud.partido_id,
        partido_titulo=partido.titulo if partido else None,
        descarga_habilitada=solicitud.descarga_habilitada,
        creado_en=str(solicitud.creado_en),
    )


@router.get("/{solicitud_id}/descargas")
def obtener_links_descarga(
    solicitud_id: int,
    db: Session = Depends(get_db),
):
    """
    Endpoint público — el jugador accede con el ID de su solicitud.
    Devuelve las URLs firmadas de descarga si la descarga está habilitada.
    """
    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    if not solicitud.descarga_habilitada:
        raise HTTPException(
            status_code=403,
            detail="La descarga no está habilitada para esta solicitud"
        )

    # Obtenemos las fotos
    ids = [int(i) for i in solicitud.fotos_ids.split(",")]
    fotos = db.query(Foto).filter(Foto.id.in_(ids)).all()

    links = []
    for foto in fotos:
        try:
            url = generar_url_firmada(foto.url_original, expira_en=604800)
            links.append({
                "foto_id": foto.id,
                "url": url,
                "nombre": foto.nombre_archivo,
            })
        except Exception:
            pass

    return {
        "solicitud_id": solicitud_id,
        "nombre_jugador": solicitud.nombre_jugador,
        "total_fotos": len(links),
        "links": links,
    }

@router.patch("/{solicitud_id}/deshabilitar-descarga", response_model=SolicitudResponse)
def deshabilitar_descarga(
    solicitud_id: int,
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    """El fotógrafo deshabilita la descarga."""
    solicitud = db.query(Solicitud).filter(Solicitud.id == solicitud_id).first()
    if not solicitud:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")
    
    solicitud.descarga_habilitada = False
    db.commit()
    db.refresh(solicitud)

    partido = db.query(Partido).filter(Partido.id == solicitud.partido_id).first()
    return SolicitudResponse(
        id=solicitud.id,
        nombre_jugador=solicitud.nombre_jugador,
        contacto=solicitud.contacto,
        fotos_ids=solicitud.fotos_ids,
        total=solicitud.total,
        estado=solicitud.estado,
        partido_id=solicitud.partido_id,
        partido_titulo=partido.titulo if partido else None,
        descarga_habilitada=solicitud.descarga_habilitada,
        creado_en=str(solicitud.creado_en),
    )