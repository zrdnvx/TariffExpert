from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.core.config import settings
from src.api.v1.buildings import router as buildings_router
from src.api.v1.calculations import router as calculations_router
from src.api.v1.admins import router as admins_router
from src.api.v1.auth import router as auth_router
from src.api.v1.tariffs import router as tariffs_router

def get_application() -> FastAPI:
    application = FastAPI(
        title=settings.APP_TITLE,
        version=settings.APP_VERSION,
        docs_url="/docs",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return application

app = get_application()
app.include_router(buildings_router, prefix="/api/v1")
app.include_router(calculations_router, prefix="/api/v1")
app.include_router(admins_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(tariffs_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "database": "connected" # Здесь потом добавим реальную проверку
    }