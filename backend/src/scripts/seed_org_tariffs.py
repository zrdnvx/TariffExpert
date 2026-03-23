import asyncio
import uuid
from typing import Optional

from sqlalchemy import select

from src.db.database import async_session_maker
from src.db.models.models import ReferenceTariff
from src.scripts.seed_tariffs import TARIFFS


# Пример: город Орел и организация «Буткемп хантерс»
CITY_ID = uuid.UUID("0513351d-aebb-4e91-8fdb-ce6d88573b0c")
ORGANIZATION_ID = uuid.UUID("7073ff6e-ac9d-4463-b8be-278b79656a84")


async def seed_org_tariffs(
    city_id: uuid.UUID,
    organization_id: Optional[uuid.UUID],
) -> None:
    """
    Заполняет/обновляет тарифы из TARIFFS для заданного города и (опционально) организации.

    - Если organization_id is None → создаём/обновляем базовые городские тарифы.
    - Если organization_id задан → создаём/обновляем тарифы конкретной организации
      в этом городе (оверрайды поверх базовых).
    """
    async with async_session_maker() as db:
        for t in TARIFFS:
            stmt = select(ReferenceTariff).where(
                ReferenceTariff.city_id == city_id,
                ReferenceTariff.organization_id.is_(organization_id)
                if organization_id is None
                else ReferenceTariff.organization_id == organization_id,
                ReferenceTariff.item_number == t["item_number"],
            )
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                existing.name = t["name"]
                existing.rate = t["rate"]
                existing.category = t["category"]
                existing.is_active = True
            else:
                db.add(
                    ReferenceTariff(
                        city_id=city_id,
                        organization_id=organization_id,
                        item_number=t["item_number"],
                        name=t["name"],
                        rate=t["rate"],
                        category=t["category"],
                    )
                )

        await db.commit()
        print(
            f"Тарифы обновлены для города {city_id} и "
            f"organization_id={organization_id!s}. Всего позиций: {len(TARIFFS)}"
        )


if __name__ == "__main__":
    # По умолчанию заполняем тарифы для организации «Буткемп хантерс» в Орле
    asyncio.run(seed_org_tariffs(CITY_ID, ORGANIZATION_ID))

