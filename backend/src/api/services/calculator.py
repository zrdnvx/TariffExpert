from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Sequence, Any, Dict
from sqlalchemy import select, cast, Integer
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.models import Building, ReferenceTariff, Calculation, CalculationItem, Organization


class TariffCalculatorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _select_tariffs_for_city(
        self, city_id, organization_id
    ) -> List[ReferenceTariff]:
        """
        Возвращает полный набор тарифов для пары (город, организация).
        Сначала берутся тарифы организации, затем к ним добавляются
        отсутствующие позиции из базового городского справочника.
        """
        # Тарифы организации
        org_stmt = (
            select(ReferenceTariff)
            .where(ReferenceTariff.city_id == city_id)
            .where(ReferenceTariff.organization_id == organization_id)
            .where(ReferenceTariff.is_active.is_(True))
        )
        org_res = await self.db.execute(org_stmt)
        org_tariffs = {t.item_number: t for t in org_res.scalars().all()}

        # Базовые городские тарифы
        base_stmt = (
            select(ReferenceTariff)
            .where(ReferenceTariff.city_id == city_id)
            .where(ReferenceTariff.organization_id.is_(None))
            .where(ReferenceTariff.is_active.is_(True))
        )
        base_res = await self.db.execute(base_stmt)
        for t in base_res.scalars().all():
            org_tariffs.setdefault(t.item_number, t)

        # Вернуть в порядке item_number
        return [org_tariffs[k] for k in sorted(org_tariffs.keys(), key=str)]

    async def _select_tariffs_for_building(self, building: Any) -> List[ReferenceTariff]:
        """
        Подбор перечня тарифов согласно Постановлению №75
        на основе признаков здания (режим «Расчет размера платы…» в ТЗ).
        Принимает любой объект с нужными атрибутами (модель БД или Pydantic-схему).
        """
        selected_tariffs: List[ReferenceTariff] = []
        city_id = getattr(building, "city_id", None)
        org_id = getattr(building, "organization_id", None)

        # 1. Текущий ремонт общего имущества (раздел 1 приложения 1)
        # п. 1.1. всегда
        base_rate = await self._get_tariff_by_number("1.1.", city_id, org_id)
        if base_rate:
            selected_tariffs.append(base_rate)

        # п. 1.2. Отчисления на текущий ремонт сетей (зависит от наличия канализации/воды)
        suffix = self._get_networks_suffix(building)
        net_maintenance = await self._get_tariff_by_number(f"1.2.{suffix}", city_id, org_id)
        if net_maintenance:
            selected_tariffs.append(net_maintenance)

        # 1.2.5–1.2.10 зависят от наличия конкретных систем/условий
        if getattr(building, "has_recirculation_pumps", False):
            t = await self._get_tariff_by_number("1.2.5", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # пожарные/пожарно-охранные сигнализации в домах свыше 10 этажей
        if getattr(building, "floors_count", 0) > 10:
            t = await self._get_tariff_by_number("1.2.6", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # АСКУЭ / коммерческий учет ресурсов
        if getattr(building, "has_askue", False):
            t = await self._get_tariff_by_number("1.2.7", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # Узлы учета/системы автоматического регулирования (порог по площади)
        total_area = getattr(building, "total_area", None)
        if total_area is not None:
            if total_area <= Decimal("5000"):
                t = await self._get_tariff_by_number("1.2.8", city_id, org_id)
                if t:
                    selected_tariffs.append(t)
            elif total_area <= Decimal("8000"):
                t = await self._get_tariff_by_number("1.2.9", city_id, org_id)
                if t:
                    selected_tariffs.append(t)
            else:
                t = await self._get_tariff_by_number("1.2.10", city_id, org_id)
                if t:
                    selected_tariffs.append(t)

        # 2. Содержание общего имущества и текущий ремонт (раздел 2 приложения 1)
        # Техническое обслуживание / осмотр / аварийное обслуживание (2.1–2.3)
        for prefix in ["2.1.", "2.2.", "2.3."]:
            t = await self._get_tariff_by_number(f"{prefix}{suffix}", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # Кровли/чердаки/подвалы (2.1.5, 2.2.5, 2.3.5) — базовый набор для всех домов
        for item in ["2.1.5", "2.2.5", "2.3.5"]:
            t = await self._get_tariff_by_number(item, city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # Газовое оборудование (2.1.6, 2.2.6, 2.3.6 и 2.1.15)
        if getattr(building, "has_gas", False):
            for gas_item in ["2.1.6", "2.2.6", "2.3.6", "2.1.15"]:
                t = await self._get_tariff_by_number(gas_item, city_id, org_id)
                if t:
                    selected_tariffs.append(t)

        # Мусоропроводы (2.1.7)
        if getattr(building, "has_trash_chute", False):
            t = await self._get_tariff_by_number("2.1.7", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # Бойлеры (2.1.8) — оставляем как опциональный, отдельного флага нет
        # Рециркуляционные насосы ГВС (2.1.9, 2.2.7, 2.3.7)
        if getattr(building, "has_recirculation_pumps", False):
            for item in ["2.1.9", "2.2.7", "2.3.7"]:
                t = await self._get_tariff_by_number(item, city_id, org_id)
                if t:
                    selected_tariffs.append(t)

        # Пожарные/пожарно-охранные сигнализации (2.1.10, 2.3.8) — в домах свыше 10 этажей
        if getattr(building, "floors_count", 0) > 10:
            for item in ["2.1.10", "2.3.8"]:
                t = await self._get_tariff_by_number(item, city_id, org_id)
                if t:
                    selected_tariffs.append(t)

        # АСКУЭ / коммерческий учет ресурсов (2.1.11, 2.2.8, 2.3.9)
        if getattr(building, "has_askue", False):
            for item in ["2.1.11", "2.2.8", "2.3.9"]:
                t = await self._get_tariff_by_number(item, city_id, org_id)
                if t:
                    selected_tariffs.append(t)

        # Узлы учета/регулирования (2.1.12–2.1.14) по площади
        if total_area is not None:
            if total_area <= Decimal("5000"):
                t = await self._get_tariff_by_number("2.1.12", city_id, org_id)
                if t:
                    selected_tariffs.append(t)
            elif total_area <= Decimal("8000"):
                t = await self._get_tariff_by_number("2.1.13", city_id, org_id)
                if t:
                    selected_tariffs.append(t)
            else:
                t = await self._get_tariff_by_number("2.1.14", city_id, org_id)
                if t:
                    selected_tariffs.append(t)

        # Лифты и связанные системы (раздел 2.7)
        if getattr(building, "has_elevator", False):
            elevators = await self._get_tariffs_by_prefix("2.7.", city_id, org_id)
            selected_tariffs.extend(elevators)

        # 2.4. Санитарное содержание и благоустройство:
        # Базовые пункты санитарного содержания (почти всегда применимы)
        for item in ["2.4.1", "2.4.2", "2.4.5"]:
            t = await self._get_tariff_by_number(item, city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # Уборка лестничных клеток
        if getattr(building, "has_cleaning_stairs", True):
            t = await self._get_tariff_by_number("2.4.3", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # Уборка лифтов
        if getattr(building, "has_elevator", False):
            t = await self._get_tariff_by_number("2.4.4", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # 2.4.7 — содержание площадок (оставляем опциональным, отдельного флага нет)

        # Дополнительные работы по благоустройству (2.4.6, 2.4.8, 2.4.9)
        if getattr(building, "has_trees_maintenance", False):
            t = await self._get_tariff_by_number("2.4.6.", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        if getattr(building, "has_sandbox_service", False):
            t = await self._get_tariff_by_number("2.4.8.", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        if getattr(building, "has_icicle_removal", False):
            t = await self._get_tariff_by_number("2.4.9.", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # 2.5. Сбор и вывоз бытовых отходов:
        # 2.5.1 — места накопления ТКО (включая мусоропроводы/контейнерные площадки) — базовая строка
        t = await self._get_tariff_by_number("2.5.1", city_id, org_id)
        if t:
            selected_tariffs.append(t)

        # 2.5.4 — вывоз жидких бытовых отходов (в домах без централизованного водоотведения)
        if not getattr(building, "has_sewerage", True):
            t = await self._get_tariff_by_number("2.5.4", city_id, org_id)
            if t:
                selected_tariffs.append(t)

        # 2.6. Локальные котельные
        if getattr(building, "has_local_boiler", False):
            for item in ["2.6.1", "2.6.2"]:
                t = await self._get_tariff_by_number(item, city_id, org_id)
                if t:
                    selected_tariffs.append(t)

        # 3. Плата за управление (раздел 3)
        mgmt_tariff = await self._resolve_management_tariff(building, city_id, org_id)
        if mgmt_tariff:
            selected_tariffs.append(mgmt_tariff)

        return selected_tariffs

    async def calculate(self, building: Building) -> Calculation:
        """
        Основной метод расчета согласно Постановлению №75
        (режим «Расчет размера платы…» в ТЗ).
        """
        selected_tariffs = await self._select_tariffs_for_building(building)

        # Итоговый расчет (ставка на 1 м² общей площади)
        total_sum = sum((t.rate for t in selected_tariffs), Decimal("0.0000"))

        # Создаем запись расчета
        new_calc = Calculation(
            building_id=building.id,
            organization_id=getattr(building, "organization_id"),
            total_rate=total_sum
        )
        self.db.add(new_calc)

        # flush, чтобы получить id для CalculationItem
        await self.db.flush()

        # Сохраняем детализацию
        for t in selected_tariffs:
            item = CalculationItem(
                calculation_id=new_calc.id,
                tariff_id=t.id,  # SQLAlchemy 2.0 обработает Mapped[int] здесь нормально
                applied_rate=t.rate
            )
            self.db.add(item)

        await self.db.commit()
        return new_calc

    async def build_detail_breakdown(
        self,
        building_like: Any,
        existing_rate: Decimal,
    ) -> Dict[str, Any]:
        """
        Режим «Детализация платы…» из ТЗ.

        На основе признаков дома подбираем тот же набор тарифов, что и
        в нормативном расчете, считаем суммарную нормативную ставку и
        раскладываем заданную оператором плату по этим видам работ
        пропорционально их нормативным ставкам.
        """
        tariffs = await self._select_tariffs_for_building(building_like)

        normative_total = sum((t.rate for t in tariffs), Decimal("0.0000"))

        components: List[Dict[str, Any]] = []
        if normative_total > Decimal("0"):
            for t in tariffs:
                share = (t.rate / normative_total).quantize(Decimal("0.0001"))
                applied = (existing_rate * share).quantize(
                    Decimal("0.0001"), rounding=ROUND_HALF_UP
                )
                components.append(
                    {
                        "item_number": t.item_number,
                        "name": t.name,
                        "normative_rate": t.rate,
                        "share": share,
                        "applied_rate": applied,
                    }
                )

        return {
            "total_normative_rate": normative_total,
            "components": components,
        }

    def _get_networks_suffix(self, b: Any) -> str:
        """
        Логика выбора подпункта (1-4) для инженерных систем.
        Согласно таблице 1.2:
        1 - без водоотведения, без воды
        2 - без водоотведения, с водой
        3 - с водоотведением, с ХВС, без ГВС
        4 - с водоотведением, с ХВС и ГВС
        """
        if not b.has_sewerage:
            return "1" if not b.has_cws else "2"
        return "4" if b.has_hws else "3"

    async def _resolve_management_tariff(
        self, b: Any, city_id, organization_id
    ) -> Optional[ReferenceTariff]:
        """
        Подбор ставки управления согласно разделу 3 Постановления №75.
        """
        target_item = "3.3."

        if not b.has_sewerage:
            target_item = "3.1."
        elif not b.has_hws:
            target_item = "3.2."

        # Исправлено: b.has_boiler -> b.has_local_boiler
        if b.has_elevator and b.has_trash_chute and b.has_local_boiler:
            target_item = "3.8."
        elif b.has_elevator and b.has_trash_chute:
            target_item = "3.7."
        elif b.has_elevator:
            target_item = "3.6."
        elif b.has_local_boiler:
            target_item = "3.5."
        elif b.has_trash_chute:
            target_item = "3.4."

        return await self._get_tariff_by_number(target_item, city_id, organization_id)

    async def _get_tariff_by_number(
        self, num: str, city_id, organization_id
    ) -> Optional[ReferenceTariff]:
        """
        Хелпер для получения конкретной строки справочника.
        """
        candidates = self._candidate_item_numbers(num)

        # Сначала ищем тариф организации
        stmt = select(ReferenceTariff).where(ReferenceTariff.item_number.in_(candidates))
        if city_id:
            stmt = stmt.where(ReferenceTariff.city_id == city_id)
        if organization_id:
            org_stmt = stmt.where(ReferenceTariff.organization_id == organization_id)
            res = await self.db.execute(org_stmt)
            t = res.scalar_one_or_none()
            if t:
                return t
        base_stmt = stmt.where(ReferenceTariff.organization_id.is_(None))
        res = await self.db.execute(base_stmt)
        return res.scalar_one_or_none()

    @staticmethod
    def _candidate_item_numbers(num: str) -> list[str]:
        """
        В справочнике встречаются варианты item_number с точкой на конце и без.
        Чтобы расчёт не 'терял' строки, пробуем оба представления.
        """
        normalized = (num or "").strip()
        if not normalized:
            return []
        if normalized.endswith("."):
            no_dot = normalized[:-1]
            return [normalized, no_dot]
        return [normalized, f"{normalized}."]

    async def _get_tariffs_by_prefix(
        self, prefix: str, city_id, organization_id
    ) -> Sequence[ReferenceTariff]:
        """
        Хелпер для получения группы тарифов (например, всех по лифтам 2.7.x).
        """
        base_stmt = select(ReferenceTariff).where(
            ReferenceTariff.item_number.like(f"{prefix}%")
        )
        if city_id:
            base_stmt = base_stmt.where(ReferenceTariff.city_id == city_id)

        # Сначала тарифы организации
        org_tariffs: dict[str, ReferenceTariff] = {}
        if organization_id:
            org_stmt = base_stmt.where(ReferenceTariff.organization_id == organization_id)
            res = await self.db.execute(org_stmt)
            for t in res.scalars().all():
                org_tariffs[t.item_number] = t

        # Затем базовые тарифы города
        base_stmt = base_stmt.where(ReferenceTariff.organization_id.is_(None))
        res = await self.db.execute(base_stmt)
        for t in res.scalars().all():
            org_tariffs.setdefault(t.item_number, t)

        return list(org_tariffs.values())