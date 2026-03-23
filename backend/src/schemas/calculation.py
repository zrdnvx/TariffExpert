from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict
from typing import List
from decimal import Decimal

from src.schemas.building import BuildingBase


class CalculationItemResponse(BaseModel):
    # Эти поля Pydantic возьмет из CalculationItem.tariff (благодаря property в модели)
    item_number: str
    name: str
    # А это поле возьмет напрямую из CalculationItem
    applied_rate: Decimal = Field(..., alias="applied_rate")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


class CalculationResponse(BaseModel):
    id: UUID
    building_id: UUID
    total_rate: Decimal
    # Список вложенных элементов
    items: List[CalculationItemResponse]

    model_config = ConfigDict(from_attributes=True)


class DetailCalculationRequest(BuildingBase):
    """
    Входные данные для режима «Детализация платы…» (ТЗ, п. 2.3).
    Используем те же поля здания, что и при расчете, плюс размер имеющейся платы.
    """

    existing_rate: Decimal = Field(..., gt=Decimal("0"))


class DetailComponentResponse(BaseModel):
    item_number: str
    name: str
    normative_rate: Decimal
    share: Decimal
    applied_rate: Decimal


class DetailCalculationResponse(BaseModel):
    address: str
    existing_rate: Decimal
    total_normative_rate: Decimal
    components: List[DetailComponentResponse]
