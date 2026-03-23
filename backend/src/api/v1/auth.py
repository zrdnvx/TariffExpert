from datetime import datetime, timedelta, timezone
from typing import Literal, Optional
from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from passlib.context import CryptContext

from src.core.config import settings
from src.db.database import get_async_session
from src.db.models.models import (
    OperatorSession,
    OrganizationUser,
    OrgUserRole,
    Organization,
    City,
)


router = APIRouter(prefix="/auth", tags=["Auth"])

bearer_scheme = HTTPBearer(auto_error=True)
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


def _create_access_token(session_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    to_encode = {
        "sub": "user",
        "sid": str(session_id),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(
            (now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()
        ),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def _create_refresh_token(session_id: UUID, expires_at: datetime) -> str:
    now = datetime.now(timezone.utc)
    to_encode = {
        "sub": "user",
        "sid": str(session_id),
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


async def _create_session(db: AsyncSession, user_id: UUID) -> OperatorSession:
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    session = OperatorSession(expires_at=expires_at, user_id=user_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


class CurrentUser(BaseModel):
    user_id: UUID
    organization_id: UUID
    city_id: UUID
    role: OrgUserRole


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_async_session),
) -> CurrentUser:
    """
    Достает и проверяет access-токен.
    Возвращает ID сессии оператора (sid), если всё ок.
    """
    token = creds.credentials
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    sid = payload.get("sid")
    if not sid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    session_id = UUID(sid)

    stmt = (
        select(OperatorSession)
        .options(selectinload(OperatorSession.user).selectinload(OrganizationUser.organization))
        .where(OperatorSession.id == session_id)
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if not session or session.revoked or session.expires_at <= now or not session.user:
        raise HTTPException(status_code=401, detail="Session expired")
    if not session.user.is_active or not session.user.organization.is_active:
        raise HTTPException(status_code=403, detail="User or organization disabled")

    org = session.user.organization
    return CurrentUser(
        user_id=session.user.id,
        organization_id=org.id,
        city_id=org.city_id,
        role=session.user.role,
    )


@router.post("/login", response_model=TokenPair)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_async_session),
) -> TokenPair:
    """
    Вход пользователя организации по логину/паролю (пользователей создаём в БД вручную).
    Выдает пару access/refresh токенов.
    """
    stmt = (
        select(OrganizationUser)
        .options(selectinload(OrganizationUser.organization))
        .where(OrganizationUser.username == body.username)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user or not user.is_active or not user.organization.is_active:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not pwd_context.verify(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session = await _create_session(db, user.id)
    access = _create_access_token(session.id)
    refresh = _create_refresh_token(session.id, session.expires_at)
    return TokenPair(access_token=access, refresh_token=refresh)


class MeResponse(BaseModel):
    user_id: UUID
    username: str
    role: OrgUserRole
    organization_id: UUID
    organization_name: str
    city_id: UUID
    city_name: str


@router.get("/me", response_model=MeResponse)
async def me(
    user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
) -> MeResponse:
    org_stmt = select(Organization).where(Organization.id == user.organization_id)
    org_res = await db.execute(org_stmt)
    org = org_res.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    city_stmt = select(City).where(City.id == user.city_id)
    city_res = await db.execute(city_stmt)
    city = city_res.scalar_one_or_none()
    if not city:
        raise HTTPException(status_code=404, detail="City not found")

    user_stmt = select(OrganizationUser).where(OrganizationUser.id == user.user_id)
    user_res = await db.execute(user_stmt)
    db_user = user_res.scalar_one_or_none()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    return MeResponse(
        user_id=user.user_id,
        username=db_user.username,
        role=user.role,
        organization_id=org.id,
        organization_name=org.name,
        city_id=city.id,
        city_name=city.name,
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_async_session),
) -> TokenPair:
    """
    Обновление access-токена по refresh.
    При каждом обновлении проверяется сессия в БД.
    """
    token = body.refresh_token
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    sid = payload.get("sid")
    if not sid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    stmt = select(OperatorSession).where(OperatorSession.id == UUID(sid))
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if not session or session.revoked or session.expires_at <= now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh session invalid or expired",
        )

    access = _create_access_token(session.id)
    # refresh не ротируем, но можно добавить ротацию при желании
    refresh = _create_refresh_token(session.id, session.expires_at)
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/logout")
async def logout(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Выход: по access-токену находим сессию и помечаем её как revoked.
    """
    token = creds.credentials
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    sid = payload.get("sid")
    if not sid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    stmt = select(OperatorSession).where(OperatorSession.id == UUID(sid))
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if session:
        session.revoked = True
        await db.commit()

    return {"status": "logged_out"}


