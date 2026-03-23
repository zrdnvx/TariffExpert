from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict

from src.db.models.models import TariffCategory


class TariffBase(BaseModel):
    item_number: str = Field(..., description="Номер пункта из Приложения 1 (например, '1.2.3.')")
    name: str = Field(..., description="Наименование вида работ")
    rate: Decimal = Field(..., gt=Decimal("0"), description="Ставка, руб./м²")
    category: TariffCategory
    is_active: bool = True

    # Поля для расширенной настройки/фильтрации (на будущее, но доступны уже сейчас)
    min_area: Optional[Decimal] = Field(None, gt=Decimal("0"))
    max_area: Optional[Decimal] = Field(None, gt=Decimal("0"))
    is_elevator_required: Optional[bool] = None
    is_gas_required: Optional[bool] = None
    min_floors: Optional[int] = Field(None, gt=0)


class TariffCreate(TariffBase):
    pass


class TariffUpdate(BaseModel):
    rate: Optional[Decimal] = Field(None, gt=Decimal("0"))
    name: Optional[str] = None
    is_active: Optional[bool] = None
    category: Optional[TariffCategory] = None
    min_area: Optional[Decimal] = Field(None, gt=Decimal("0"))
    max_area: Optional[Decimal] = Field(None, gt=Decimal("0"))
    is_elevator_required: Optional[bool] = None
    is_gas_required: Optional[bool] = None
    min_floors: Optional[int] = Field(None, gt=0)


class TariffResponse(TariffBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

