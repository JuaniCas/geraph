from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
from app.core.config import get_settings
from app.core.security import hashear_password
from app.core.database import SessionLocal
from app.models.models import Usuario
from app.routers import auth, partidos, solicitudes

settings = get_settings()

app = FastAPI(
    title="Geraph API",
    description="Backend para la plataforma de fotos de fútbol",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://geraph.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(partidos.router)
app.include_router(solicitudes.router)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        admin = db.query(Usuario).filter(
            Usuario.email == settings.ADMIN_EMAIL
        ).first()

        if not admin:
            admin = Usuario(
                email=settings.ADMIN_EMAIL,
                hashed_password=hashear_password(settings.ADMIN_PASSWORD),
                es_admin=True,
            )
            db.add(admin)
            db.commit()
            print(f"✅ Admin creado: {settings.ADMIN_EMAIL}")
        else:
            print(f"✅ Admin ya existe: {settings.ADMIN_EMAIL}")
    finally:
        db.close()


@app.get("/")
def root():
    return {"mensaje": "Geraph API funcionando 🚀", "docs": "/docs"}