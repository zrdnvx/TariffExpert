from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from src.db.database import get_async_session
from src.schemas.building import BuildingCreate, BuildingResponse, BuildingUpdate
from src.db.models.models import Building, Organization, City, Calculation, CalculationItem
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


@router.get("/{building_id}", response_model=BuildingResponse)
async def get_building(
    building_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    building = await db.get(Building, building_id)
    if not building or building.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Building not found")
    return building


@router.patch("/{building_id}", response_model=BuildingResponse)
async def update_building(
    building_id: UUID,
    payload: BuildingUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    building = await db.get(Building, building_id)
    if not building or building.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Building not found")

    data = payload.model_dump(exclude_unset=True)

    # Разрешаем обновлять только поля здания, без смены organization_id/city_id
    model_columns = set(Building.__table__.columns.keys())
    forbidden = {"id", "organization_id", "city_id", "created_at"}
    for key, value in data.items():
        if key in forbidden:
            continue
        if key in model_columns:
            setattr(building, key, value)

    await db.commit()
    await db.refresh(building)
    return building


@router.delete("/{building_id}")
async def delete_building(
    building_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    building = await db.get(Building, building_id)
    if not building or building.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Building not found")

    calc_ids_stmt = select(Calculation.id).where(Calculation.building_id == building_id)
    calc_ids_result = await db.execute(calc_ids_stmt)
    calc_ids = list(calc_ids_result.scalars().all())

    if calc_ids:
        await db.execute(
            delete(CalculationItem).where(CalculationItem.calculation_id.in_(calc_ids))
        )
        await db.execute(delete(Calculation).where(Calculation.id.in_(calc_ids)))

    await db.execute(delete(Building).where(Building.id == building_id))
    await db.commit()
    return {"status": "ok"}


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