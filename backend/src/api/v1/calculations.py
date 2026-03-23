from uuid import UUID
from io import BytesIO
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

from src.api.services.calculator import TariffCalculatorService
from src.db.models.models import Building, Calculation, CalculationItem
from src.schemas.calculation import (
    CalculationResponse,
    DetailCalculationRequest,
    DetailCalculationResponse,
    DetailComponentResponse,
)
from src.db.database import get_async_session
from src.api.v1.auth import get_current_user, CurrentUser

router = APIRouter(
    prefix="/calculations",
    tags=["Calculations"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/{building_id}/run", response_model=CalculationResponse)
async def run_calculation(
    building_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    # 1. Находим здание
    building = await db.get(Building, building_id)
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    if building.organization_id != user.organization_id:
        raise HTTPException(status_code=404, detail="Building not found")

    # 2. Считаем (режим «Расчет размера платы…»)
    service = TariffCalculatorService(db)
    result = await service.calculate(building)

    # 3. Подгружаем связи для корректного ответа (детализация строк)
    stmt = (
        select(Calculation)
        .options(selectinload(Calculation.items).joinedload(CalculationItem.tariff))
        .where(Calculation.id == result.id)
    )
    result_with_items = await db.execute(stmt)
    return result_with_items.scalar_one()


@router.post("/detail", response_model=DetailCalculationResponse)
async def detail_calculation(
    payload: DetailCalculationRequest,
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Режим «Детализация платы…» (ТЗ, п. 2.3).
    На вход: адрес, существующая плата, площадь, этажность, год ввода и чекбоксы систем.
    На выход: разложение заданной платы по видам работ приложения 1.
    """
    service = TariffCalculatorService(db)
    # для подбора тарифов нужен city_id; берём из токена
    building_like = payload.model_copy(update={"city_id": user.city_id})
    breakdown = await service.build_detail_breakdown(
        building_like=building_like,
        existing_rate=payload.existing_rate,
    )

    components = [
        DetailComponentResponse(**c) for c in breakdown["components"]
    ]

    return DetailCalculationResponse(
        address=payload.address,
        existing_rate=payload.existing_rate,
        total_normative_rate=breakdown["total_normative_rate"],
        components=components,
    )


@router.get("/{calculation_id}/export")
async def export_calculation_to_excel(
    calculation_id: UUID,
    db: AsyncSession = Depends(get_async_session),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Выгрузка результатов расчета (режим «Расчет размера платы…») в формате Excel.
    """
    stmt = (
        select(Calculation)
        .options(
            selectinload(Calculation.items).joinedload(CalculationItem.tariff),
            selectinload(Calculation.building),
        )
        .where(Calculation.id == calculation_id)
    )
    result = await db.execute(stmt)
    calc = result.scalar_one_or_none()

    if not calc:
        raise HTTPException(status_code=404, detail="Calculation not found")
    if calc.organization_id != user.organization_id and user.role != "superadmin":
        raise HTTPException(status_code=404, detail="Calculation not found")

    wb = Workbook()
    ws = wb.active
    ws.title = "Перечень работ"

    # Монохромный стиль под официальный бланк
    thin_border = Border(
        left=Side(style="thin", color="000000"),
        right=Side(style="thin", color="000000"),
        top=Side(style="thin", color="000000"),
        bottom=Side(style="thin", color="000000"),
    )
    header_fill = PatternFill(fill_type="solid", start_color="F2F2F2", end_color="F2F2F2")
    title_font = Font(color="000000", bold=True, size=12)
    header_font = Font(color="000000", bold=True, size=10)
    normal_font = Font(color="000000", size=10)
    total_font = Font(color="000000", bold=True, size=11)

    ws.column_dimensions["A"].width = 14
    ws.column_dimensions["B"].width = 92
    ws.column_dimensions["C"].width = 26
    ws.column_dimensions["D"].width = 28

    building = calc.building
    total_area = float(building.total_area) if building else 0.0
    created_at = calc.created_at.astimezone(timezone.utc).strftime("%d.%m.%Y %H:%M UTC")
    total_amount = float(calc.total_rate) * total_area

    # Заголовок как в образце
    ws.merge_cells("A1:D1")
    ws["A1"] = "П Е Р Е Ч Е Н Ь"
    ws["A1"].font = title_font
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.merge_cells("A2:D2")
    ws["A2"] = "работ и услуг по содержанию и ремонту общего имущества"
    ws["A2"].font = Font(bold=True, size=10)
    ws["A2"].alignment = Alignment(horizontal="center")
    ws.merge_cells("A3:D3")
    ws["A3"] = (
        f"в многоквартирном доме по адресу: {building.address if building else '—'}"
    )
    ws["A3"].alignment = Alignment(horizontal="center")
    ws["A3"].font = Font(size=10)

    # Блок справочной информации
    ws.merge_cells("A5:D5")
    ws["A5"] = "Справочная информация"
    ws["A5"].font = header_font
    ws["A5"].alignment = Alignment(horizontal="center")

    info_rows = [
        ("ID расчета", str(calc.id)),
        ("Дата расчета", created_at),
        ("ID дома", str(calc.building_id)),
        ("Общая площадь дома, кв.м", total_area),
        ("Этажность дома", building.floors_count if building else "—"),
        ("Год ввода в эксплуатацию", building.year_built if building else "—"),
        ("Размер обязательного платежа, руб", total_amount),
        ("Размер обязательного платежа, руб/м²", float(calc.total_rate)),
    ]

    row = 6
    for label, value in info_rows:
        ws[f"A{row}"] = label
        ws[f"A{row}"].font = header_font
        ws[f"A{row}"].alignment = Alignment(vertical="center")
        ws[f"A{row}"].border = thin_border
        ws.merge_cells(f"B{row}:D{row}")
        ws[f"B{row}"] = value
        ws[f"B{row}"].font = normal_font
        ws[f"B{row}"].alignment = Alignment(horizontal="right", vertical="center")
        ws[f"B{row}"].border = thin_border
        ws[f"C{row}"].border = thin_border
        ws[f"D{row}"].border = thin_border
        if isinstance(value, float):
            ws[f"B{row}"].number_format = "#,##0.00"
        row += 1

    row += 1
    start_table_row = row
    ws[f"A{row}"] = "Наименование работ"
    ws.merge_cells(f"A{row}:B{row}")
    ws[f"C{row}"] = "Плановая стоимость работ в год, руб"
    ws[f"D{row}"] = "Стоимость на 1 кв.м в месяц, руб"
    for col in ("A", "B", "C", "D"):
        ws[f"{col}{row}"].font = header_font
        ws[f"{col}{row}"].fill = header_fill
        ws[f"{col}{row}"].alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        ws[f"{col}{row}"].border = thin_border
    ws.row_dimensions[row].height = 34

    row += 1
    sorted_items = sorted(calc.items, key=lambda i: i.item_number)
    for item in sorted_items:
        annual_amount = float(item.applied_rate) * total_area * 12.0
        ws[f"A{row}"] = item.item_number
        ws[f"B{row}"] = item.name
        ws[f"C{row}"] = annual_amount
        ws[f"D{row}"] = float(item.applied_rate)

        ws[f"A{row}"].alignment = Alignment(horizontal="center", vertical="top")
        ws[f"B{row}"].alignment = Alignment(wrap_text=True, vertical="top")
        ws[f"C{row}"].alignment = Alignment(horizontal="right", vertical="top")
        ws[f"D{row}"].alignment = Alignment(horizontal="right", vertical="top")

        ws[f"A{row}"].font = normal_font
        ws[f"B{row}"].font = normal_font
        ws[f"C{row}"].font = normal_font
        ws[f"D{row}"].font = normal_font
        ws[f"C{row}"].number_format = "#,##0.00"
        ws[f"D{row}"].number_format = "#,##0.0000"

        ws[f"A{row}"].border = thin_border
        ws[f"B{row}"].border = thin_border
        ws[f"C{row}"].border = thin_border
        ws[f"D{row}"].border = thin_border
        row += 1

    ws.merge_cells(f"A{row}:B{row}")
    ws[f"A{row}"] = "Всего работ и услуг"
    ws[f"C{row}"] = total_amount
    ws[f"D{row}"] = float(calc.total_rate)
    ws[f"C{row}"].number_format = "#,##0.00"
    ws[f"D{row}"].number_format = "#,##0.0000"
    ws[f"A{row}"].font = total_font
    ws[f"C{row}"].font = total_font
    ws[f"D{row}"].font = total_font
    ws[f"A{row}"].alignment = Alignment(horizontal="left", vertical="center")
    ws[f"C{row}"].alignment = Alignment(horizontal="right", vertical="center")
    ws[f"D{row}"].alignment = Alignment(horizontal="right", vertical="center")
    ws[f"A{row}"].border = thin_border
    ws[f"B{row}"].border = thin_border
    ws[f"C{row}"].border = thin_border
    ws[f"D{row}"].border = thin_border

    # Высота строк
    for current_row in range(start_table_row + 1, row):
        cell_val = ws[f"B{current_row}"].value or ""
        lines = max(1, len(str(cell_val)) // 58 + 1)
        ws.row_dimensions[current_row].height = 16 * lines

    # Лист "Периодичность" в стиле образца
    ws_period = wb.create_sheet("Периодичность")
    ws_period.column_dimensions["A"].width = 98
    ws_period.column_dimensions["B"].width = 28

    ws_period.merge_cells("A1:B1")
    ws_period["A1"] = "Периодичность выполнения отдельных видов работ"
    ws_period["A1"].font = header_font
    ws_period["A1"].alignment = Alignment(horizontal="left", vertical="center")

    ws_period["A3"] = "Наименование работ"
    ws_period["B3"] = "Периодичность, раз в год"
    for col in ("A", "B"):
        ws_period[f"{col}3"].font = header_font
        ws_period[f"{col}3"].fill = header_fill
        ws_period[f"{col}3"].alignment = Alignment(horizontal="center", vertical="center")
        ws_period[f"{col}3"].border = thin_border
    ws_period.row_dimensions[3].height = 28

    # Базовые ориентировочные значения (можно уточнять регламентом УК)
    periodicity_defaults = {
        "2.4.1.": 52,
        "2.4.2.": 12,
        "2.4.3.": 180,
        "2.4.4.": 180,
        "2.4.5.": 2,
        "2.4.6.": 2,
        "2.4.7.": 26,
        "2.4.8.": 2,
        "2.4.9.": 26,
        "2.7.4": 1,
    }
    row_p = 4
    for item in sorted_items:
        ws_period[f"A{row_p}"] = f"{item.item_number} {item.name}"
        ws_period[f"B{row_p}"] = periodicity_defaults.get(item.item_number, "по регламенту")
        ws_period[f"A{row_p}"].font = normal_font
        ws_period[f"B{row_p}"].font = normal_font
        ws_period[f"A{row_p}"].alignment = Alignment(wrap_text=True, vertical="top")
        ws_period[f"B{row_p}"].alignment = Alignment(horizontal="center", vertical="top")
        ws_period[f"A{row_p}"].border = thin_border
        ws_period[f"B{row_p}"].border = thin_border
        text = ws_period[f"A{row_p}"].value or ""
        ws_period.row_dimensions[row_p].height = max(18, 16 * (len(str(text)) // 78 + 1))
        row_p += 1

    ws_period[f"A{row_p+1}"] = "Должность ____________________"
    ws_period[f"B{row_p+1}"] = "ФИО ____________________"
    ws_period[f"A{row_p+1}"].font = normal_font
    ws_period[f"B{row_p+1}"].font = normal_font

    stream = BytesIO()
    wb.save(stream)
    stream.seek(0)

    filename = f"calculation_{calculation_id}.xlsx"
    return StreamingResponse(
        stream,
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
