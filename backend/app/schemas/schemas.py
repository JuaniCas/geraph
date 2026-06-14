from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ─── AUTH ────────────────────────────────────────────────────────────────────

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── PARTIDOS ────────────────────────────────────────────────────────────────

class PartidoCrear(BaseModel):
    titulo: str
    fecha: str
    descripcion: Optional[str] = None
    precio_por_foto: float = 800.0


class PartidoResponse(BaseModel):
    id: int
    titulo: str
    fecha: str
    descripcion: Optional[str]
    precio_por_foto: float
    activo: bool
    total_fotos: int = 0
    creado_en: datetime

    class Config:
        from_attributes = True


# ─── FOTOS ───────────────────────────────────────────────────────────────────

class FotoResponse(BaseModel):
    id: int
    url_marca_agua: str
    url_thumbnail: Optional[str] = None   
    partido_id: int
    creado_en: datetime

    class Config:
        from_attributes = True


# ─── SOLICITUDES ─────────────────────────────────────────────────────────────

class SolicitudCrear(BaseModel):
    nombre_jugador: str
    contacto: str
    fotos_ids: List[int]


class SolicitudResponse(BaseModel):
    id: int
    nombre_jugador: str
    contacto: str
    fotos_ids: str
    total: float
    estado: str
    partido_id: Optional[int] = None
    partido_titulo: Optional[str] = None
    descarga_habilitada: bool = False
    creado_en: datetime

    class Config:
        from_attributes = True


class SolicitudActualizarEstado(BaseModel):
    estado: str