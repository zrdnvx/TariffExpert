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


class BuildingResponse(BuildingBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID