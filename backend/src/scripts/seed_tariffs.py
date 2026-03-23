import asyncio
from decimal import Decimal

from sqlalchemy import select

from src.db.database import async_session_maker
from src.db.models.models import ReferenceTariff, TariffCategory


TARIFFS = [
    # 1. Текущий ремонт общего имущества
    {
        "item_number": "1.1.",
        "name": "Отчисления на текущий ремонт конструктивных элементов зданий - базовая ставка",
        "rate": Decimal("1.267"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    {
        "item_number": "1.2.1",
        "name": "Отчисления на текущий ремонт общедомовых инженерных сетей в домах без канализации, без ХВС и без ГВС",
        "rate": Decimal("1.060"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    {
        "item_number": "1.2.2",
        "name": "Отчисления на текущий ремонт общедомовых инженерных сетей в домах без канализации, без ГВС, с ХВС",
        "rate": Decimal("1.267"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    {
        "item_number": "1.2.3",
        "name": "Отчисления на текущий ремонт общедомовых инженерных сетей в домах с канализацией, с ХВС, без ГВС",
        "rate": Decimal("1.647"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    {
        "item_number": "1.2.4",
        "name": "Отчисления на текущий ремонт общедомовых инженерных сетей в домах с канализацией, с ХВС и ГВС",
        "rate": Decimal("1.867"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    {
        "item_number": "1.2.5",
        "name": "Отчисления на текущий ремонт внутридомовых рециркуляционных насосов ГВС",
        "rate": Decimal("0.158"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    {
        "item_number": "1.2.6",
        "name": "Отчисления на текущий ремонт внутридомовых пожарных и пожарно-охранных сигнализаций в домах свыше 10 этажей",
        "rate": Decimal("0.396"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    {
        "item_number": "1.2.7",
        "name": "Отчисления на текущий ремонт внутридомовых автоматизированных систем коммерческого учета ресурсов",
        "rate": Decimal("0.032"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    {
        "item_number": "1.2.8",
        "name": "Отчисления на текущий ремонт узлов учета и/или систем автоматического регулирования в домах площадью до 5000 кв. м",
        "rate": Decimal("0.681"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    {
        "item_number": "1.2.9",
        "name": "Отчисления на текущий ремонт узлов учета и/или систем автоматического регулирования в домах площадью свыше 5000 кв. м",
        "rate": Decimal("0.253"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    {
        "item_number": "1.2.10",
        "name": "Отчисления на текущий ремонт узлов учета и/или систем автоматического регулирования в домах площадью свыше 8000 кв. м",
        "rate": Decimal("0.602"),
        "category": TariffCategory.CURRENT_REPAIR,
    },
    # 2. Содержание общего имущества
    # 2.1. Техническое обслуживание
    {
        "item_number": "2.1.1",
        "name": "Техническое обслуживание общедомовых инженерных сетей в домах без канализации, без ХВС и без ГВС",
        "rate": Decimal("0.491"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.2",
        "name": "Техническое обслуживание общедомовых инженерных сетей в домах без канализации, без ГВС, с ХВС",
        "rate": Decimal("0.744"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.3",
        "name": "Техническое обслуживание общедомовых инженерных сетей в домах с канализацией, с ХВС, без ГВС",
        "rate": Decimal("1.012"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.4",
        "name": "Техническое обслуживание общедомовых инженерных сетей в домах с канализацией, с ХВС и ГВС",
        "rate": Decimal("1.283"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.5.",
        "name": "Техническое обслуживание кровли, чердаков, подвалов",
        "rate": Decimal("0.158"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.6",
        "name": "Техническое обслуживание внутридомового газового оборудования",
        "rate": Decimal("0.055"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.7.",
        "name": "Техническое обслуживание внутридомовых мусоропроводов",
        "rate": Decimal("0.428"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.8.",
        "name": "Техническое обслуживание внутридомовых бойлеров",
        "rate": Decimal("1.267"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.9.",
        "name": "Техническое обслуживание внутридомовых рециркуляционных насосов ГВС",
        "rate": Decimal("0.428"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.10.",
        "name": "Техническое обслуживание внутридомовых пожарных и пожарно-охранных сигнализаций в домах свыше 10 этажей",
        "rate": Decimal("1.283"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.11.",
        "name": "Техническое обслуживание внутридомовых автоматизированных систем коммерческого учета ресурсов",
        "rate": Decimal("0.253"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.12.",
        "name": "Техническое обслуживание узлов учета и/или систем автоматического регулирования в домах площадью до 5000 кв. м",
        "rate": Decimal("0.871"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.13.",
        "name": "Техническое обслуживание узлов учета и/или систем автоматического регулирования в домах площадью свыше 5000 кв. м",
        "rate": Decimal("0.349"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.14.",
        "name": "Техническое обслуживание узлов учета и/или систем автоматического регулирования в домах площадью свыше 8000 кв. м",
        "rate": Decimal("0.316"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.1.15",
        "name": "Техническое диагностирование внутридомового газового оборудования (ВДГО), отработавшего нормативные сроки эксплуатации",
        "rate": Decimal("0.206"),
        "category": TariffCategory.MAINTENANCE,
    },
    # 2.2. Технический осмотр
    {
        "item_number": "2.2.1",
        "name": "Технический осмотр общедомовых инженерных сетей в домах без канализации, без ХВС и без ГВС",
        "rate": Decimal("0.176"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.2.2",
        "name": "Технический осмотр общедомовых инженерных сетей в домах без канализации, без ГВС, с ХВС",
        "rate": Decimal("0.269"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.2.3",
        "name": "Технический осмотр общедомовых инженерных сетей в домах с канализацией, с ХВС, без ГВС",
        "rate": Decimal("0.364"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.2.4",
        "name": "Технический осмотр общедомовых инженерных сетей в домах с канализацией, с ХВС и ГВС",
        "rate": Decimal("0.458"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.2.5.",
        "name": "Технический осмотр кровли, чердаков, подвалов",
        "rate": Decimal("0.063"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.2.6",
        "name": "Технический осмотр внутридомового газового оборудования",
        "rate": Decimal("0.041"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.2.7.",
        "name": "Технический осмотр внутридомовых рециркуляционных насосов ГВС",
        "rate": Decimal("0.080"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.2.8.",
        "name": "Технический осмотр внутридомовых автоматизированных систем коммерческого учета ресурсов",
        "rate": Decimal("0.158"),
        "category": TariffCategory.MAINTENANCE,
    },
    # 2.3. Аварийное обслуживание
    {
        "item_number": "2.3.1",
        "name": "Аварийное обслуживание общедомовых инженерных сетей в домах без канализации, без ХВС и без ГВС",
        "rate": Decimal("0.349"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.3.2",
        "name": "Аварийное обслуживание общедомовых инженерных сетей в домах без канализации, без ГВС, с ХВС",
        "rate": Decimal("0.524"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.3.3",
        "name": "Аварийное обслуживание общедомовых инженерных сетей в домах с канализацией, с ХВС, без ГВС",
        "rate": Decimal("0.714"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.3.4",
        "name": "Аварийное обслуживание общедомовых инженерных сетей в домах с канализацией, с ХВС и ГВС",
        "rate": Decimal("0.903"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.3.5.",
        "name": "Аварийное обслуживание кровли, чердаков, подвалов",
        "rate": Decimal("0.111"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.3.6",
        "name": "Аварийное обслуживание внутридомового газового оборудования",
        "rate": Decimal("0.127"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.3.7.",
        "name": "Аварийное обслуживание внутридомовых рециркуляционных насосов ГВС",
        "rate": Decimal("0.158"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.3.8.",
        "name": "Аварийное обслуживание внутридомовых пожарных и пожарно-охранных сигнализаций в домах свыше 10 этажей",
        "rate": Decimal("0.380"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.3.9.",
        "name": "Аварийное обслуживание внутридомовых автоматизированных систем коммерческого учета ресурсов",
        "rate": Decimal("0.063"),
        "category": TariffCategory.MAINTENANCE,
    },
    # 2.4. Санитарное содержание и благоустройство
    {
        "item_number": "2.4.1.",
        "name": "Уборка придомовой территории",
        "rate": Decimal("2.942"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.4.2.",
        "name": "Уборка дворовых санитарных установок",
        "rate": Decimal("0.823"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.4.3.",
        "name": "Уборка лестничных клеток",
        "rate": Decimal("1.883"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.4.4.",
        "name": "Уборка лифтов",
        "rate": Decimal("0.080"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.4.5.",
        "name": "Дератизация и дезинсекция",
        "rate": Decimal("0.206"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.4.6.",
        "name": "Благоустройство придомовой территории, включая снос аварийных деревьев",
        "rate": Decimal("0.158"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.4.7.",
        "name": "Содержание детских и спортивных площадок",
        "rate": Decimal("0.032"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.4.8.",
        "name": "Замена песка в песочницах",
        "rate": Decimal("0.016"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.4.9.",
        "name": "Удаление наледей и сосулек с крыш",
        "rate": Decimal("0.096"),
        "category": TariffCategory.MAINTENANCE,
    },
    # 2.5. Сбор и вывоз бытовых отходов
    {
        "item_number": "2.5.1.",
        "name": "Организация и содержание мест (площадок) накопления ТКО",
        "rate": Decimal("0.316"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.5.4.",
        "name": "Вывоз жидких бытовых отходов",
        "rate": Decimal("2.338"),
        "category": TariffCategory.MAINTENANCE,
    },
    # 2.6. Содержание локальных котельных
    {
        "item_number": "2.6.1.",
        "name": "Техническое обслуживание локальных котельных",
        "rate": Decimal("5.081"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.6.2.",
        "name": "Текущий ремонт локальных котельных",
        "rate": Decimal("3.451"),
        "category": TariffCategory.MAINTENANCE,
    },
    # 2.7. Содержание лифтового хозяйства
    {
        "item_number": "2.7.1",
        "name": "Техническое обслуживание и ремонт лифтов",
        "rate": Decimal("2.422"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.7.2",
        "name": "Техническое обслуживание и ремонт средств диспетчеризации",
        "rate": Decimal("1.582"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.7.3",
        "name": "Техническое обслуживание и ремонт пожарной и/или охранной сигнализации лифтов",
        "rate": Decimal("0.080"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.7.4",
        "name": "Периодическое техническое освидетельствование лифтов с проведением электроизмерений",
        "rate": Decimal("0.158"),
        "category": TariffCategory.MAINTENANCE,
    },
    {
        "item_number": "2.7.5",
        "name": "Экспертное обследование (освидетельствование) лифтов, отработавших нормативный срок службы",
        "rate": Decimal("0.919"),
        "category": TariffCategory.MAINTENANCE,
    },
    # 3. Плата за управление многоквартирным домом
    {
        "item_number": "3.1.",
        "name": "Плата за управление: дома без централизованного водоотведения",
        "rate": Decimal("1.030"),
        "category": TariffCategory.MANAGEMENT,
    },
    {
        "item_number": "3.2.",
        "name": "Плата за управление: дома с централизованным водоотведением, без централизованного ГВС",
        "rate": Decimal("1.187"),
        "category": TariffCategory.MANAGEMENT,
    },
    {
        "item_number": "3.3.",
        "name": "Плата за управление: дома с централизованным водоотведением и ГВС",
        "rate": Decimal("1.346"),
        "category": TariffCategory.MANAGEMENT,
    },
    {
        "item_number": "3.4.",
        "name": "Плата за управление: дома без лифтов, оборудованные мусоропроводами",
        "rate": Decimal("1.425"),
        "category": TariffCategory.MANAGEMENT,
    },
    {
        "item_number": "3.5.",
        "name": "Плата за управление: дома без лифтов, оборудованные локальными котельными",
        "rate": Decimal("1.503"),
        "category": TariffCategory.MANAGEMENT,
    },
    {
        "item_number": "3.6.",
        "name": "Плата за управление: дома без мусоропроводов, оборудованные лифтами",
        "rate": Decimal("1.503"),
        "category": TariffCategory.MANAGEMENT,
    },
    {
        "item_number": "3.7.",
        "name": "Плата за управление: дома, оборудованные мусоропроводами и лифтами",
        "rate": Decimal("1.582"),
        "category": TariffCategory.MANAGEMENT,
    },
    {
        "item_number": "3.8.",
        "name": "Плата за управление: дома, оборудованные мусоропроводами, лифтами и локальными котельными",
        "rate": Decimal("1.741"),
        "category": TariffCategory.MANAGEMENT,
    },
]


async def seed_tariffs() -> None:
    """
    Заполняет/обновляет справочник тарифов в БД по Постановлению №75.
    Повторный запуск обновит ставки и названия по item_number.
    """
    async with async_session_maker() as db:
        for t in TARIFFS:
            stmt = select(ReferenceTariff).where(
                ReferenceTariff.item_number == t["item_number"]
            )
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                existing.name = t["name"]
                existing.rate = t["rate"]
                existing.category = t["category"]
                existing.is_active = True
            else:
                db.add(ReferenceTariff(**t))

        await db.commit()
        print(f"Справочник тарифов обновлён, всего записей: {len(TARIFFS)}")


if __name__ == "__main__":
    asyncio.run(seed_tariffs())