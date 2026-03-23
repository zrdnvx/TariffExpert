from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from src.core.config import settings
from src.db.database import get_async_session
from src.db.models.models import City, Organization, OrganizationUser, OrgUserRole

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def verify_setup_admin(
    x_setup_password: str = Header(..., alias="X-Setup-Password"),
) -> None:
    if x_setup_password != settings.SETUP_ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/cities", dependencies=[Depends(verify_setup_admin)])
async def list_cities(
    db: AsyncSession = Depends(get_async_session),
):
    stmt = select(City).order_by(City.name)
    result = await db.execute(stmt)
    return [{"id": str(c.id), "name": c.name, "region": c.region} for c in result.scalars().all()]


@router.post("/cities", dependencies=[Depends(verify_setup_admin)])
async def create_city(
    name: str,
    region: str | None = None,
    db: AsyncSession = Depends(get_async_session),
):
    existing_stmt = select(City).where(City.name == name)
    res = await db.execute(existing_stmt)
    existing = res.scalar_one_or_none()
    if existing:
        return {"id": str(existing.id), "name": existing.name, "region": existing.region}

    new_city = City(name=name, region=region)
    db.add(new_city)
    await db.commit()
    await db.refresh(new_city)
    return {"id": str(new_city.id), "name": new_city.name, "region": new_city.region}


@router.get("/organizations", dependencies=[Depends(verify_setup_admin)])
async def list_organizations(
    city_id: UUID | None = None,
    db: AsyncSession = Depends(get_async_session),
):
    stmt = select(Organization).order_by(Organization.name)
    if city_id:
        stmt = stmt.where(Organization.city_id == city_id)
    result = await db.execute(stmt)
    orgs = result.scalars().all()
    return [
        {
            "id": str(o.id),
            "name": o.name,
            "inn": o.inn,
            "city_id": str(o.city_id),
            "is_active": o.is_active,
        }
        for o in orgs
    ]


@router.post("/organizations", dependencies=[Depends(verify_setup_admin)])
async def create_organization(
    city_id: UUID,
    name: str,
    inn: str | None = None,
    db: AsyncSession = Depends(get_async_session),
):
    stmt = select(Organization).where(Organization.name == name, Organization.city_id == city_id)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()
    if existing:
        return {
            "id": str(existing.id),
            "name": existing.name,
            "inn": existing.inn,
            "city_id": str(existing.city_id),
            "is_active": existing.is_active,
        }

    org = Organization(city_id=city_id, name=name, inn=inn)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return {
        "id": str(org.id),
        "name": org.name,
        "inn": org.inn,
        "city_id": str(org.city_id),
        "is_active": org.is_active,
    }


@router.post("/users", dependencies=[Depends(verify_setup_admin)])
async def create_user(
    organization_id: UUID,
    username: str,
    password: str,
    role: OrgUserRole = OrgUserRole.OPERATOR,
    db: AsyncSession = Depends(get_async_session),
):
    existing_stmt = select(OrganizationUser).where(OrganizationUser.username == username)
    res = await db.execute(existing_stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")

    password_hash = pwd_context.hash(password)
    user = OrganizationUser(
        organization_id=organization_id,
        username=username,
        password_hash=password_hash,
        role=role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {
        "id": str(user.id),
        "organization_id": str(user.organization_id),
        "username": user.username,
        "role": user.role.value,
        "is_active": user.is_active,
    }