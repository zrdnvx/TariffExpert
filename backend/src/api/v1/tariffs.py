from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.v1.auth import get_current_user, CurrentUser
from src.db.database import get_async_session
from src.db.models.models import ReferenceTariff
from src.schemas.tariff import TariffResponse, TariffUpdate, TariffCreate


router = APIRouter(
    prefix="/tariffs",
    tags=["Tariffs"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=List[TariffResponse])
async def list_tariffs(
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
    city_id: Optional[UUID] = Query(
        None,
        description="Город, для которого нужно отдать тарифы. По умолчанию — основной город организации.",
    ),
):
    """
    Получить полный перечень тарифов из Приложения 1 для указанного города.
    Если city_id не указан, используется основной город организации из профиля пользователя.
    """
    target_city_id = city_id or user.city_id

    stmt = select(ReferenceTariff).where(
        ReferenceTariff.city_id == target_city_id
    ).order_by(ReferenceTariff.item_number)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=TariffResponse)
async def create_tariff(
    payload: TariffCreate,
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Добавить тариф для текущего города пользователя.
    """
    item_number = payload.item_number.strip()
    stmt = select(ReferenceTariff).where(
        ReferenceTariff.city_id == user.city_id,
        ReferenceTariff.item_number == item_number,
    )
    res = await db.execute(stmt)
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tariff with this item_number already exists")

    new_tariff = ReferenceTariff(
        city_id=user.city_id,
        item_number=item_number,
        name=payload.name,
        rate=payload.rate,
        category=payload.category,
        is_active=payload.is_active,
        min_area=payload.min_area,
        max_area=payload.max_area,
        is_elevator_required=payload.is_elevator_required,
        is_gas_required=payload.is_gas_required,
        min_floors=payload.min_floors,
    )
    db.add(new_tariff)
    await db.commit()
    await db.refresh(new_tariff)
    return new_tariff


@router.get("/{tariff_id}", response_model=TariffResponse)
async def get_tariff(
    tariff_id: int,
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    tariff = await db.get(ReferenceTariff, tariff_id)
    if not tariff:
        raise HTTPException(status_code=404, detail="Tariff not found")
    if tariff.city_id != user.city_id and user.role != "superadmin":
        raise HTTPException(status_code=404, detail="Tariff not found")
    return tariff


@router.patch("/{tariff_id}", response_model=TariffResponse)
async def update_tariff(
    tariff_id: int,
    payload: TariffUpdate,
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Точечное редактирование тарифа:
    - можно поменять ставку, название, признак активности.
    Числа в Постановлении обновляются через изменение записей в БД,
    а не через правку файлов.
    """
    tariff = await db.get(ReferenceTariff, tariff_id)
    if not tariff:
        raise HTTPException(status_code=404, detail="Tariff not found")
    if tariff.city_id != user.city_id and user.role != "superadmin":
        raise HTTPException(status_code=404, detail="Tariff not found")

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(tariff, field, value)

    await db.commit()
    await db.refresh(tariff)
    return tariff

