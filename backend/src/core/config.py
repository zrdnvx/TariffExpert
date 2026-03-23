from pydantic_settings import BaseSettings
from pydantic import PostgresDsn, computed_field


class Settings(BaseSettings):
    APP_NAME: str = "TariffExpert"
    APP_TITLE: str = "TariffExpert API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str

    # Пароль оператора для входа в модуль (ТЗ: вход через пароль)
    OPERATOR_PASSWORD: str = "change_me"

    # JWT / auth
    SECRET_KEY: str = "change_me_secret"  # переопредели в .env
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    JWT_ALGORITHM: str = "HS256"

    # Пароль для первоначальной админской панели (регистрация городов/организаций/пользователей)
    SETUP_ADMIN_PASSWORD: str = "change_me_admin"


    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()