from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from decimal import Decimal
from uuid import UUID


class BuildingBase(BaseModel):
    address: str
    fias_id: Optional[str] = None
    total_area: Decimal = Field(..., gt=0)
    floors_count: int = Field(..., gt=0)
    year_built: Optional[int] = None

    # Флаги инженерных систем из ТЗ
    has_cws: bool = True
    has_hws: bool = False
    has_sewerage: bool = True
    has_gas: bool = False
    has_elevator: bool = False
    has_trash_chute: bool = False
    has_fire_alarm: bool = False
    has_central_heating: bool = True
    has_local_boiler: bool = False
    has_recirculation_pumps: bool = False
    has_askue: bool = False  # АСКУЭ / Узлы учета

    # Доп. работы
    has_cleaning_stairs: bool = True  # Уборка лестничных клеток
    has_trees_maintenance: bool = False
    has_sandbox_service: bool = False
    has_icicle_removal: bool = False


class BuildingCreate(BuildingBase):
    pass


class BuildingUpdate(BaseModel):
    address: Optional[str] = None
    fias_id: Optional[str] = None
    total_area: Optional[Decimal] = Field(None, gt=0)
    floors_count: Optional[int] = Field(None, gt=0)
    year_built: Optional[int] = None

    has_cws: Optional[bool] = None
    has_hws: Optional[bool] = None
    has_sewerage: Optional[bool] = None
    has_gas: Optional[bool] = None
    has_elevator: Optional[bool] = None
    has_trash_chute: Optional[bool] = None
    has_fire_alarm: Optional[bool] = None
    has_central_heating: Optional[bool] = None
    has_local_boiler: Optional[bool] = None
    has_recirculation_pumps: Optional[bool] = None
    has_askue: Optional[bool] = None

    has_cleaning_stairs: Optional[bool] = None
    has_trees_maintenance: Optional[bool] = None
    has_sandbox_service: Optional[bool] = None
    has_icicle_removal: Optional[bool] = None


class BuildingResponse(BuildingBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID