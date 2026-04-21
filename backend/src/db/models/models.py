import uuid
import enum
from datetime import datetime, timedelta
from typing import Optional, List
from decimal import Decimal

from sqlalchemy import (
    String,
    Boolean,
    ForeignKey,
    DateTime,
    Enum,
    Integer,
    Numeric,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from src.db.database import Base


class TariffCategory(str, enum.Enum):
    MAINTENANCE = "maintenance"  # 1. Содержание общего имущества
    CURRENT_REPAIR = "repair"  # 2. Текущий ремонт
    MANAGEMENT = "management"  # 3. Плата за управление


class HouseType(str, enum.Enum):
    MONOLITH_BRICK = "monolith_brick"
    REINFORCED_CONCRETE = "reinforced_concrete"
    OTHER_LOW_CAPITAL = "other_low_capital"


class CoefficientKind(str, enum.Enum):
    K1 = "k1"
    K2 = "k2"


class ReferenceTariff(Base):
    """
    Справочник тарифов из Постановления №75.
    """
    __tablename__ = "reference_tariffs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    city_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cities.id"), index=True)
    # NULL -> базовый городской тариф, NOT NULL -> тариф конкретной организации
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("organizations.id"), index=True, nullable=True
    )
    item_number: Mapped[str] = mapped_column(String(20), index=True)  # п.п. 1.1.1
    name: Mapped[str] = mapped_column(Text)
    rate: Mapped[Decimal] = mapped_column(Numeric(10, 4))
    category: Mapped[TariffCategory] = mapped_column(Enum(TariffCategory))

    # Поля для фильтрации (логика подбора)
    min_area: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    max_area: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    is_elevator_required: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    is_gas_required: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    min_floors: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    city: Mapped["City"] = relationship()


class ReferenceCoefficient(Base):
    """
    Справочник коэффициентов (К1/К2).
    NULL organization_id -> базовый городской, NOT NULL -> коэффициент организации.
    """
    __tablename__ = "reference_coefficients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    city_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cities.id"), index=True)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("organizations.id"), index=True, nullable=True
    )
    kind: Mapped[CoefficientKind] = mapped_column(Enum(CoefficientKind))
    code: Mapped[str] = mapped_column(String(50), index=True)
    name: Mapped[str] = mapped_column(Text)
    value: Mapped[Decimal] = mapped_column(Numeric(8, 4))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    city: Mapped["City"] = relationship()
    organization: Mapped[Optional["Organization"]] = relationship()


class City(Base):
    __tablename__ = "cities"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    region: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    organizations: Mapped[List["Organization"]] = relationship(back_populates="city")


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    city_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cities.id"), index=True)
    name: Mapped[str] = mapped_column(String(300), index=True)
    inn: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    city: Mapped["City"] = relationship(back_populates="organizations")
    users: Mapped[List["OrganizationUser"]] = relationship(back_populates="organization")
    buildings: Mapped[List["Building"]] = relationship(back_populates="organization")


class OrgUserRole(str, enum.Enum):
    SUPERADMIN = "superadmin"
    ORG_ADMIN = "org_admin"
    OPERATOR = "operator"


class OrganizationUser(Base):
    __tablename__ = "organization_users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), index=True
    )
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(200))
    role: Mapped[OrgUserRole] = mapped_column(Enum(OrgUserRole), default=OrgUserRole.OPERATOR)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    organization: Mapped["Organization"] = relationship(back_populates="users")


class Building(Base):
    __tablename__ = "buildings"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), index=True
    )
    city_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cities.id"), index=True)
    address: Mapped[str] = mapped_column(String(500), index=True)
    fias_id: Mapped[Optional[str]] = mapped_column(String(100), index=True)

    total_area: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    floors_count: Mapped[int] = mapped_column(Integer)
    year_built: Mapped[Optional[int]] = mapped_column(Integer)
    is_apartment_building: Mapped[bool] = mapped_column(Boolean, default=True)
    house_type: Mapped[Optional[HouseType]] = mapped_column(
        Enum(HouseType), nullable=True
    )

    # Инженерные системы (Обновлено под схему)
    has_cws: Mapped[bool] = mapped_column(Boolean, default=True)
    has_hws: Mapped[bool] = mapped_column(Boolean, default=False)
    has_sewerage: Mapped[bool] = mapped_column(Boolean, default=True)
    has_gas: Mapped[bool] = mapped_column(Boolean, default=False)
    has_elevator: Mapped[bool] = mapped_column(Boolean, default=False)
    has_trash_chute: Mapped[bool] = mapped_column(Boolean, default=False)
    has_fire_alarm: Mapped[bool] = mapped_column(Boolean, default=False)

    # Новые поля из ТЗ/Схемы
    has_central_heating: Mapped[bool] = mapped_column(Boolean, default=True)
    has_local_boiler: Mapped[bool] = mapped_column(Boolean, default=False)
    has_recirculation_pumps: Mapped[bool] = mapped_column(Boolean, default=False)
    has_askue: Mapped[bool] = mapped_column(Boolean, default=False)
    has_cleaning_stairs: Mapped[bool] = mapped_column(Boolean, default=True)

    # Доп. пункты (2.4.6, 2.4.8, 2.4.9)
    has_trees_maintenance: Mapped[bool] = mapped_column(Boolean, default=False)
    has_sandbox_service: Mapped[bool] = mapped_column(Boolean, default=False)
    has_icicle_removal: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    calculations: Mapped[List["Calculation"]] = relationship(back_populates="building")
    organization: Mapped["Organization"] = relationship(back_populates="buildings")
    city: Mapped["City"] = relationship()


class Calculation(Base):
    """Результат расчета"""
    __tablename__ = "calculations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    building_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("buildings.id"))
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id"), index=True
    )

    total_rate: Mapped[Decimal] = mapped_column(Numeric(10, 4))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    building: Mapped["Building"] = relationship(back_populates="calculations")
    items: Mapped[List["CalculationItem"]] = relationship(back_populates="calculation")
    organization: Mapped["Organization"] = relationship()


class CalculationItem(Base):
    """Строки детализации расчета"""
    __tablename__ = "calculation_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    calculation_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("calculations.id"))
    tariff_id: Mapped[int] = mapped_column(ForeignKey("reference_tariffs.id"))
    applied_rate: Mapped[Decimal] = mapped_column(Numeric(10, 4))

    calculation: Mapped["Calculation"] = relationship(back_populates="items")
    tariff: Mapped["ReferenceTariff"] = relationship()

    @property
    def item_number(self) -> str:
        return self.tariff.item_number

    @property
    def name(self) -> str:
        return self.tariff.name


class OperatorSession(Base):
    """
    Сессия оператора для refresh-токенов.
    Один пароль (из ТЗ), но несколько одновременных сессий (браузеры).
    """

    __tablename__ = "operator_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("organization_users.id"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[Optional["OrganizationUser"]] = relationship()

