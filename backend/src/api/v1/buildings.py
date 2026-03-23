from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.db.database import get_async_session
from src.schemas.building import BuildingCreate, BuildingResponse
from src.db.models.models import Building, Organization, City
from src.api.v1.auth import get_current_user, CurrentUser

router = APIRouter(
    prefix="/buildings",
    tags=["Buildings"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/", response_model=BuildingResponse)
async def create_building(
    data: BuildingCreate,
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    # Способ 1: Явное преобразование через пересечение ключей (самый безопасный)
    data_dict = data.model_dump()

    # Получаем список всех имен колонок модели Building
    model_columns = Building.__table__.columns.keys()

    # Фильтруем словарь, оставляя только то, что есть в БД
    filtered_data = {k: v for k, v in data_dict.items() if k in model_columns}

    org = await db.get(Organization, user.organization_id)
    if not org:
        raise HTTPException(status_code=401, detail="Organization not found")

    new_building = Building(
        **filtered_data,
        organization_id=user.organization_id,
        city_id=org.city_id,
    )

    db.add(new_building)
    await db.commit()
    await db.refresh(new_building)
    return new_building


@router.get("/", response_model=list[BuildingResponse])
async def list_buildings(
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    stmt = (
        select(Building)
        .where(Building.organization_id == user.organization_id)
        .order_by(Building.address)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/cities")
async def list_organization_cities(
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Список городов, в которых у организации есть объекты (МКД).
    Используется на фронтенде для выбора города при работе со справочником тарифов.
    """
    stmt = (
        select(City)
        .join(Building, Building.city_id == City.id)
        .where(Building.organization_id == user.organization_id)
        .order_by(City.name)
        .distinct()
    )
    result = await db.execute(stmt)
    cities = result.scalars().all()
    return [
        {"id": str(c.id), "name": c.name, "region": c.region}
        for c in cities
    ]