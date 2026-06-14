from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    es_admin = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    partidos = relationship("Partido", back_populates="fotografo")


class Partido(Base):
    __tablename__ = "partidos"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    fecha = Column(String, nullable=False)
    descripcion = Column(Text, nullable=True)
    precio_por_foto = Column(Float, nullable=False, default=800.0)
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    fotografo_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fotografo = relationship("Usuario", back_populates="partidos")
    fotos = relationship("Foto", back_populates="partido")


class Foto(Base):
    __tablename__ = "fotos"

    id = Column(Integer, primary_key=True, index=True)
    nombre_archivo = Column(String, nullable=False)
    url_marca_agua = Column(String, nullable=False)
    url_thumbnail = Column(String, nullable=False)
    url_original = Column(String, nullable=False)
    partido_id = Column(Integer, ForeignKey("partidos.id"), nullable=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    partido = relationship("Partido", back_populates="fotos")


class Solicitud(Base):
    __tablename__ = "solicitudes"

    id = Column(Integer, primary_key=True, index=True)
    nombre_jugador = Column(String, nullable=False)
    contacto = Column(String, nullable=False)
    partido_id = Column(Integer, ForeignKey("partidos.id"), nullable=False)
    partido = relationship("Partido")
    fotos_ids = Column(Text, nullable=False)
    total = Column(Float, nullable=False)
    estado = Column(String, default="nueva")
    descarga_habilitada = Column(Boolean, default=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())