import io
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from sqlalchemy.orm import Session
from app.models.models import Project, Client, Asset, Personnel, ResourceAssignmentHistory

class ExcelProjectService:
    """
    Servicio para generar y procesar plantillas Excel amigables para proyectos DALOR SIGO-P
    """

    @staticmethod
    def generate_project_template() -> io.BytesIO:
        wb = Workbook()
        ws = wb.active
        ws.title = "Planificacion_Proyecto"
        ws.views.sheetView[0].showGridLines = True

        # Paleta de Colores Dalor
        navy_fill = PatternFill(start_color="002B49", end_color="002B49", fill_type="solid")
        blue_fill = PatternFill(start_color="0072B8", end_color="0072B8", fill_type="solid")
        gold_fill = PatternFill(start_color="F5B800", end_color="F5B800", fill_type="solid")
        light_fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

        white_font_bold = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        navy_font_bold = Font(name="Calibri", size=11, bold=True, color="002B49")
        title_font = Font(name="Calibri", size=14, bold=True, color="FFFFFF")
        regular_font = Font(name="Calibri", size=11)
        italic_font = Font(name="Calibri", size=10, italic=True, color="64748B")

        thin_border = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='CBD5E1'),
            bottom=Side(style='thin', color='CBD5E1')
        )

        # Encabezado Principal
        ws.merge_cells("A1:D1")
        ws["A1"] = "DALOR SIGO-P | PLANTILLA OFICIAL DE ARMADO Y ESTIMACIÓN DE PROYECTO"
        ws["A1"].font = title_font
        ws["A1"].fill = navy_fill
        ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[1].height = 32

        # Subtítulo de Instrucciones
        ws.merge_cells("A2:D2")
        ws["A2"] = "Diligencie los campos en blanco a continuación y cargue este archivo al sistema para registrar la obra."
        ws["A2"].font = italic_font
        ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
        ws.row_dimensions[2].height = 20

        # SECCIÓN 1: DATOS GENERALES
        ws.merge_cells("A4:D4")
        ws["A4"] = "1. DATOS GENERALES DEL PROYECTO / OBRA"
        ws["A4"].font = white_font_bold
        ws["A4"].fill = blue_fill
        ws["A4"].alignment = Alignment(horizontal="left", vertical="center", indent=1)

        fields_general = [
            ("Código del Proyecto (Ej: DAL-2026-05)", "DAL-2026-05"),
            ("Nombre de la Obra / Proyecto", "Mantenimiento Integral de Subestación Eléctrica"),
            ("Cliente / Empresa Contratante", "Corporación Industrial Central"),
            ("Ubicación Física / Ciudad", "Planta Guacara, Edo. Carabobo"),
            ("Duración Proyectada (Días)", 30),
            ("Monto Total del Contrato / Venta ($ USD)", 12500.00)
        ]

        row = 5
        for label, default_val in fields_general:
            ws.cell(row=row, column=1, value=label).font = navy_font_bold
            ws.cell(row=row, column=1).fill = light_fill
            ws.cell(row=row, column=1).border = thin_border
            ws.cell(row=row, column=1).alignment = Alignment(vertical="center")

            val_cell = ws.cell(row=row, column=2, value=default_val)
            val_cell.font = regular_font
            val_cell.border = thin_border
            val_cell.alignment = Alignment(vertical="center")
            if isinstance(default_val, float):
                val_cell.number_format = '"$"#,##0.00'
            row += 1

        # SECCIÓN 2: ESTIMACIÓN DE COSTOS POR BOLSAS
        row += 1
        ws.merge_cells(f"A{row}:D{row}")
        ws[f"A{row}"] = "2. PRESUPUESTO ESTIMADO DE COSTOS POR RUBRO (BOLSAS)"
        ws[f"A{row}"].font = white_font_bold
        ws[f"A{row}"].fill = blue_fill
        ws[f"A{row}"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
        row += 1

        fields_costs = [
            ("Mano de Obra & Viáticos del Personal ($)", 3500.00),
            ("Combustible & Traslados ($)", 850.00),
            ("Materiales & Insumos Directos ($)", 2400.00),
            ("Equipos & Herramientas Especiales ($)", 600.00),
            ("Servicios Técnicos & Subcontratos ($)", 400.00)
        ]

        for label, default_val in fields_costs:
            ws.cell(row=row, column=1, value=label).font = navy_font_bold
            ws.cell(row=row, column=1).fill = light_fill
            ws.cell(row=row, column=1).border = thin_border

            val_cell = ws.cell(row=row, column=2, value=default_val)
            val_cell.font = regular_font
            val_cell.border = thin_border
            val_cell.number_format = '"$"#,##0.00'
            row += 1

        # Total Costo Estimado y Margen Proyectado
        ws.cell(row=row, column=1, value="TOTAL COSTO ESTIMADO ($)").font = white_font_bold
        ws.cell(row=row, column=1).fill = navy_fill
        ws.cell(row=row, column=1).border = thin_border
        
        sum_formula_cell = ws.cell(row=row, column=2, value="=SUM(B12:B16)")
        sum_formula_cell.font = white_font_bold
        sum_formula_cell.fill = navy_fill
        sum_formula_cell.number_format = '"$"#,##0.00'
        sum_formula_cell.border = thin_border
        row += 1

        ws.cell(row=row, column=1, value="MARGEN BRUTO ESTIMADO (%)").font = navy_font_bold
        ws.cell(row=row, column=1).fill = gold_fill
        ws.cell(row=row, column=1).border = thin_border

        margin_formula_cell = ws.cell(row=row, column=2, value="=(B10-B17)/B10")
        margin_formula_cell.font = navy_font_bold
        margin_formula_cell.fill = gold_fill
        margin_formula_cell.number_format = '0.0%'
        margin_formula_cell.border = thin_border

        # Ajuste de Anchos de Columna
        ws.column_dimensions['A'].width = 46
        ws.column_dimensions['B'].width = 40
        ws.column_dimensions['C'].width = 15
        ws.column_dimensions['D'].width = 15

        out = io.BytesIO()
        wb.save(out)
        out.seek(0)
        return out

    @staticmethod
    def import_project_from_excel(file_contents: bytes, db: Session) -> Project:
        from openpyxl import load_workbook
        in_stream = io.BytesIO(file_contents)
        wb = load_workbook(in_stream, data_only=True)
        ws = wb.active

        # Lectura de Celdas
        code = str(ws["B5"].value or "PROJ-" + str(int(db.query(Project).count() + 1))).strip()
        name = str(ws["B6"].value or "Proyecto Importado desde Excel").strip()
        client_name = str(ws["B7"].value or "Cliente General").strip()
        location = str(ws["B8"].value or "Sede Central").strip()
        
        try:
            duration_days = int(float(ws["B9"].value or 30))
        except (ValueError, TypeError):
            duration_days = 30

        try:
            contract_amount = float(ws["B10"].value or 0.0)
        except (ValueError, TypeError):
            contract_amount = 0.0

        try:
            est_labor = float(ws["B12"].value or 0.0)
            est_fuel = float(ws["B13"].value or 0.0)
            est_materials = float(ws["B14"].value or 0.0)
            est_tools = float(ws["B15"].value or 0.0)
            est_services = float(ws["B16"].value or 0.0)
        except (ValueError, TypeError):
            est_labor = est_fuel = est_materials = est_tools = est_services = 0.0

        total_budget = est_labor + est_fuel + est_materials + est_tools + est_services

        # Buscar o crear Cliente si no existe
        client_obj = db.query(Client).filter(Client.name.ilike(f"%{client_name}%")).first()
        if not client_obj:
            client_code = f"CLI-{db.query(Client).count() + 1:03d}"
            client_obj = Client(
                code=client_code,
                name=client_name,
                address=location,
                is_active=True
            )
            db.add(client_obj)
            db.flush()

        # Verificar si el proyecto ya existe con ese código
        existing_proj = db.query(Project).filter(Project.code == code).first()
        if existing_proj:
            existing_proj.name = name
            existing_proj.client_id = client_obj.id
            existing_proj.client_name = client_obj.name
            existing_proj.location = location
            existing_proj.duration_days = duration_days
            existing_proj.contract_amount_usd = contract_amount
            existing_proj.estimated_labor_usd = est_labor
            existing_proj.estimated_fuel_usd = est_fuel
            existing_proj.estimated_materials_usd = est_materials
            existing_proj.estimated_tools_usd = est_tools
            existing_proj.estimated_services_usd = est_services
            existing_proj.budget_limit_usd = total_budget
            db.commit()
            db.refresh(existing_proj)
            return existing_proj

        new_proj = Project(
            code=code,
            name=name,
            client_id=client_obj.id,
            client_name=client_obj.name,
            location=location,
            status="activo",
            duration_days=duration_days,
            contract_amount_usd=contract_amount,
            estimated_labor_usd=est_labor,
            estimated_fuel_usd=est_fuel,
            estimated_materials_usd=est_materials,
            estimated_tools_usd=est_tools,
            estimated_services_usd=est_services,
            budget_limit_usd=total_budget,
            is_active=True
        )
        db.add(new_proj)
        db.commit()
        db.refresh(new_proj)
        return new_proj
