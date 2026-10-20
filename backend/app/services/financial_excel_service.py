"""
Servicio especializado para generación, formato y procesamiento de Libros Contables (Ventas y Compras).
Maneja construcción de hojas de cálculo ejecutivas OpenPyXL, estilos corporativos e importación masiva.
"""
import io
import uuid
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from fastapi import HTTPException, Response
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

from app.models.models import (
    AccountReceivable,
    AccountPayable,
    Client,
    Project,
    Expense,
    ExpenseCategory,
    AuditLog
)

class FinancialExcelService:

    @staticmethod
    def get_libro_ventas_data(
        month: Optional[int] = None,
        year: Optional[int] = None,
        filter_type: Optional[str] = None,
        db: Session = None
    ):
        """
        Retorna los datos del Libro de Ventas en formato oficial SENIAT para renderizado y PDF.
        filter_type: 'all', 'fiscales', 'no_fiscales'
        """
        query = db.query(AccountReceivable).options(
            joinedload(AccountReceivable.client),
            joinedload(AccountReceivable.project)
        )
        if year:
            query = query.filter(func.extract('year', AccountReceivable.issue_date) == year)
        if month:
            query = query.filter(func.extract('month', AccountReceivable.issue_date) == month)
    
        if filter_type in ("fiscales", "con_iva"):
            query = query.filter(
                AccountReceivable.tax_amount_usd > 0.001,
                ~AccountReceivable.invoice_number.ilike("NE-%"),
                ~AccountReceivable.invoice_number.ilike("NDE-%"),
                ~AccountReceivable.invoice_number.ilike("REC-%"),
                ~AccountReceivable.invoice_number.ilike("VAL-%")
            )
        elif filter_type == "sin_iva":
            query = query.filter(
                (AccountReceivable.tax_amount_usd == 0) | (AccountReceivable.tax_amount_usd == None) | (AccountReceivable.tax_amount_usd <= 0.001),
                ~AccountReceivable.invoice_number.ilike("NE-%"),
                ~AccountReceivable.invoice_number.ilike("NDE-%"),
                ~AccountReceivable.invoice_number.ilike("REC-%"),
                ~AccountReceivable.invoice_number.ilike("VAL-%")
            )
        elif filter_type == "no_fiscales":
            query = query.filter(
                (AccountReceivable.invoice_number.ilike("NE-%")) |
                (AccountReceivable.invoice_number.ilike("NDE-%")) |
                (AccountReceivable.invoice_number.ilike("REC-%")) |
                (AccountReceivable.invoice_number.ilike("VAL-%"))
            )
    
        receivables = query.order_by(AccountReceivable.issue_date.asc(), AccountReceivable.id.asc()).all()
    
        items = []
        tot_ventas_bs = 0.0
        tot_base_bs = 0.0
        tot_iva_bs = 0.0
        tot_ret_iva_bs = 0.0
        tot_ret_islr_bs = 0.0
    
        for idx, r in enumerate(receivables, start=1):
            rate = r.exchange_rate or 859.06
            total_bs = round(r.amount_usd * rate, 2)
            tax_usd = r.tax_amount_usd or 0.0
            base_usd = r.taxable_base_usd or 0.0
    
            if tax_usd <= 0.001:
                iva_bs = 0.0
                base_bs = 0.0
            else:
                iva_bs = round(tax_usd * rate, 2)
                base_bs = round(base_usd * rate, 2) if base_usd > 0 else round(total_bs / 1.16, 2)
    
            ret_iva_bs = round((r.tax_withholding_usd or 0.0) * rate, 2)
            ret_islr_bs = round((r.islr_withholding_usd or 0.0) * rate, 2)
    
            tot_ventas_bs += total_bs
            tot_base_bs += base_bs
            tot_iva_bs += iva_bs
            tot_ret_iva_bs += ret_iva_bs
            tot_ret_islr_bs += ret_islr_bs
    
            items.append({
                "operacion": idx,
                "id": r.id,
                "fecha": r.issue_date.strftime("%d/%m/%Y") if r.issue_date else "-",
                "dia": r.issue_date.day if r.issue_date else 1,
                "factura": r.invoice_number,
                "control": r.invoice_number or f"00-{r.id:06d}",
                "tipo_transaccion": "01",
                "cliente": r.client.name if r.client else "Cliente General",
                "rif": r.client.rif if r.client else "J-00000000-0",
                "cbt_retencion": r.notes or "-",
                "ret_iva_bs": ret_iva_bs,
                "ret_islr_bs": ret_islr_bs,
                "total_ventas_bs": total_bs,
                "base_imponible_bs": base_bs,
                "alicuota_pct": 16.0 if tax_usd > 0.001 else 0.0,
                "iva_bs": iva_bs,
                "total_ventas_usd": r.amount_usd,
                "exchange_rate": rate
            })
    
        return {
            "success": True,
            "company": {
                "name": "METALMECANICA DALOR, C.A.",
                "rif": "J-31601195-0",
                "address": "AV. CAMARA DE LAS INDUSTRIAS ZONA INDUSTRIAL EL TIGRE GALPON N° 10 GUACARA EDO. CARABOBO",
                "period": f"{month or 'Todos'}/{year or '2026'}"
            },
            "totals": {
                "total_ventas_bs": round(tot_ventas_bs, 2),
                "base_imponible_bs": round(tot_base_bs, 2),
                "iva_bs": round(tot_iva_bs, 2),
                "ret_iva_bs": round(tot_ret_iva_bs, 2),
                "ret_islr_bs": round(tot_ret_islr_bs, 2)
            },
            "items": items
        }

    @staticmethod
    def export_libro_ventas_excel(
        month: Optional[int] = None,
        year: Optional[int] = None,
        filter_type: Optional[str] = None,
        db: Session = None
    ):
        """
        Exporta el Libro de Ventas en formato claro, armónico y profesional de Excel.
        """
        data = FinancialExcelService.get_libro_ventas_data(month=month, year=year, filter_type=filter_type, db=db)
        items = data["items"]
        totals = data["totals"]
    
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Libro de Ventas"
        ws.views.sheetView[0].showGridLines = True
    
        font_company = Font(name="Calibri", size=13, bold=True, color="002B49")
        font_sub = Font(name="Calibri", size=9, color="555555")
        font_bold = Font(name="Calibri", size=10, bold=True)
        font_regular = Font(name="Calibri", size=9)
        font_title = Font(name="Calibri", size=14, bold=True, color="002B49")
        font_header = Font(name="Calibri", size=9, bold=True, color="FFFFFF")
    
        fill_header = PatternFill(start_color="002B49", end_color="002B49", fill_type="solid")
        fill_even = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
        fill_odd = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        fill_totals = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    
        border_cell = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )
        border_totals = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='002B49'),
            bottom=Side(style='double', color='002B49')
        )
    
        # Encabezado corporativo
        ws['A1'] = "METALMECÁNICA DALOR, C.A."
        ws['A1'].font = font_company
        ws['A2'] = "AV. CÁMARA DE LAS INDUSTRIAS, ZONA INDUSTRIAL EL TIGRE, GUACARA, EDO. CARABOBO"
        ws['A2'].font = font_sub
        ws['A3'] = "RIF: J-31601195-0"
        ws['A3'].font = font_bold
        ws['E3'] = "LIBRO DE VENTAS"
        ws['E3'].font = font_title
        ws['L3'] = f"PERÍODO: {month or 'TODOS'}/{year or '2026'}"
        ws['L3'].font = font_bold
    
        ws.row_dimensions[1].height = 20
        ws.row_dimensions[2].height = 15
        ws.row_dimensions[3].height = 24
        ws.row_dimensions[4].height = 10
    
        headers = [
            "Fecha",
            "N° Factura",
            "N° Control",
            "Tipo",
            "Cliente / Razón Social",
            "RIF",
            "N° Cbt. Ret.",
            "Total Ventas (Bs.)",
            "Base Imponible (Bs.)",
            "% Alícuota",
            "IVA Débito (Bs.)",
            "Ret. IVA (Bs.)",
            "Ret. ISLR (Bs.)"
        ]
    
        ws.row_dimensions[5].height = 28
        for c_idx, h_text in enumerate(headers, 1):
            cell = ws.cell(row=5, column=c_idx, value=h_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = border_cell
    
        row_num = 6
        for idx, item in enumerate(items):
            alicuota_str = f"{int(item['alicuota_pct'])}%" if item.get('alicuota_pct') else ("16%" if item.get('iva_bs', 0) > 0 else "0%")
            cbt_ret = item.get("cbt_retencion")
            if cbt_ret == "-":
                cbt_ret = ""
            ws.append([
                item.get("fecha", "-"),
                item.get("factura", "-"),
                item.get("control", "-"),
                "01",
                item.get("cliente", "-"),
                item.get("rif", "-"),
                cbt_ret,
                item.get("total_ventas_bs", 0.0),
                item.get("base_imponible_bs", 0.0),
                alicuota_str,
                item.get("iva_bs", 0.0),
                item.get("ret_iva_bs", 0.0),
                item.get("ret_islr_bs", 0.0)
            ])
            ws.row_dimensions[row_num].height = 20
            fill_curr = fill_odd if idx % 2 == 1 else fill_even
    
            for c_idx in range(1, len(headers) + 1):
                c = ws.cell(row_num, c_idx)
                c.font = font_regular
                c.fill = fill_curr
                c.border = border_cell
                if c_idx in [8, 9, 11, 12, 13]:
                    c.number_format = '#,##0.00'
                    c.alignment = Alignment(horizontal="right", vertical="center")
                elif c_idx == 5:
                    c.alignment = Alignment(horizontal="left", vertical="center")
                else:
                    c.alignment = Alignment(horizontal="center", vertical="center")
            row_num += 1
    
        # Totales
        ws.append([
            "", "", "", "", "TOTALES GENERALES", "", "",
            totals.get("total_ventas_bs", 0.0),
            totals.get("base_imponible_bs", 0.0),
            "16%",
            totals.get("iva_bs", 0.0),
            totals.get("ret_iva_bs", 0.0),
            totals.get("ret_islr_bs", 0.0)
        ])
        ws.row_dimensions[row_num].height = 24
        for c_idx in range(1, len(headers) + 1):
            c = ws.cell(row_num, c_idx)
            c.font = Font(name="Calibri", size=9, bold=True, color="002B49")
            c.fill = fill_totals
            c.border = border_totals
            if c_idx in [8, 9, 11, 12, 13]:
                c.number_format = '#,##0.00'
                c.alignment = Alignment(horizontal="right", vertical="center")
            elif c_idx == 5:
                c.alignment = Alignment(horizontal="right", vertical="center")
            else:
                c.alignment = Alignment(horizontal="center", vertical="center")
    
        # Auto ajuste de anchos
        for c_idx in range(1, len(headers) + 1):
            col_letter = openpyxl.utils.get_column_letter(c_idx)
            max_len = len(str(headers[c_idx - 1]))
            for r_idx in range(5, row_num + 1):
                val = ws.cell(r_idx, c_idx).value
                if val is not None:
                    val_str = f"{val:,.2f}" if isinstance(val, (int, float)) else str(val)
                    if len(val_str) > max_len:
                        max_len = len(val_str)
            ws.column_dimensions[col_letter].width = min(max(max_len + 4, 10), 45)
    
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
    
        fname = f"Libro_de_Ventas_{year or 2026}_{month or 'Todos'}.xlsx"
        return Response(
            content=buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={fname}"}
        )
    

    @staticmethod
    def get_libro_compras_data(
        month: Optional[int] = None,
        year: Optional[int] = None,
        filter_type: Optional[str] = None,
        db: Session = None
    ):
        """
        Retorna los datos del Libro de Compras en formato oficial SENIAT (21 columnas) para renderizado y PDF.
        filter_type: 'all', 'fiscales', 'no_fiscales'
        """
        query = db.query(AccountPayable).options(
            joinedload(AccountPayable.project)
        )
        if year:
            query = query.filter(func.extract('year', AccountPayable.issue_date) == year)
        if month:
            query = query.filter(func.extract('month', AccountPayable.issue_date) == month)
    
        if filter_type in ("fiscales", "con_iva"):
            query = query.filter(
                AccountPayable.tax_amount_usd > 0.001,
                AccountPayable.doc_type != "nota_entrega",
                ~AccountPayable.invoice_number.ilike("NE-%"),
                ~AccountPayable.invoice_number.ilike("NDE-%"),
                ~AccountPayable.invoice_number.ilike("REC-%"),
                ~AccountPayable.invoice_number.ilike("VAL-%")
            )
        elif filter_type == "sin_iva":
            query = query.filter(
                (AccountPayable.tax_amount_usd == 0) | (AccountPayable.tax_amount_usd == None) | (AccountPayable.tax_amount_usd <= 0.001),
                AccountPayable.doc_type != "nota_entrega",
                ~AccountPayable.invoice_number.ilike("NE-%"),
                ~AccountPayable.invoice_number.ilike("NDE-%"),
                ~AccountPayable.invoice_number.ilike("REC-%"),
                ~AccountPayable.invoice_number.ilike("VAL-%")
            )
        elif filter_type == "no_fiscales":
            query = query.filter(
                (AccountPayable.doc_type == "nota_entrega") |
                (AccountPayable.invoice_number.ilike("NE-%")) |
                (AccountPayable.invoice_number.ilike("NDE-%")) |
                (AccountPayable.invoice_number.ilike("REC-%")) |
                (AccountPayable.invoice_number.ilike("VAL-%"))
            )
    
        payables = query.order_by(AccountPayable.issue_date.asc(), AccountPayable.id.asc()).all()
    
        items = []
        tot_compras_bs = 0.0
        tot_ret_iva_bs = 0.0
        tot_ret_islr_bs = 0.0
        tot_ret_mun_bs = 0.0
        tot_exento_bs = 0.0
        tot_base_16_bs = 0.0
        tot_iva_16_bs = 0.0
    
        for idx, p in enumerate(payables, start=1):
            rate = p.exchange_rate or 859.06
            total_bs = round(p.amount_usd * rate, 2)
            exento_usd = p.withholding_exempt_usd or 0.0
            tax_usd = p.tax_amount_usd or 0.0
            base_usd = p.taxable_base_usd or 0.0
    
            if tax_usd <= 0.001:
                iva_16_bs = 0.0
                base_16_bs = 0.0
                exento_bs = total_bs
            else:
                iva_16_bs = round(tax_usd * rate, 2)
                base_16_bs = round(base_usd * rate, 2) if base_usd > 0 else round((total_bs - round(exento_usd * rate, 2)) / 1.16, 2)
                exento_bs = round(exento_usd * rate, 2)
    
            ret_iva_bs = round((p.tax_withholding_usd or 0.0) * rate, 2)
            ret_islr_bs = round((p.islr_withholding_usd or 0.0) * rate, 2)
            ret_mun_bs = round((p.municipal_withholding_usd or 0.0) * rate, 2)
    
            tot_compras_bs += total_bs
            tot_ret_iva_bs += ret_iva_bs
            tot_ret_islr_bs += ret_islr_bs
            tot_ret_mun_bs += ret_mun_bs
            tot_exento_bs += exento_bs
            tot_base_16_bs += base_16_bs
            tot_iva_16_bs += iva_16_bs
    
            items.append({
                "operacion": idx,
                "id": p.id,
                "payable_id": p.id,
                "fecha": p.issue_date.strftime("%d/%m/%Y") if p.issue_date else "-",
                "dia": p.issue_date.day if p.issue_date else 1,
                "factura": p.invoice_number,
                "control": p.control_number or f"00-{p.id:06d}",
                "tipo_transaccion": "01",
                "proveedor": p.supplier_name,
                "rif": p.supplier_rif or "J-00000000-0",
                "cbt_retencion": p.withholding_voucher_number or "-",
                "total_compras_bs": total_bs,
                "ret_iva_bs": ret_iva_bs,
                "ret_islr_bs": ret_islr_bs,
                "ret_municipal_bs": ret_mun_bs,
                "exento_bs": exento_bs,
                "base_8_bs": 0.0,
                "alicuota_8_pct": 8.0,
                "iva_8_bs": 0.0,
                "base_12_bs": 0.0,
                "alicuota_12_pct": 12.0,
                "iva_12_bs": 0.0,
                "base_16_bs": base_16_bs,
                "alicuota_16_pct": 16.0 if tax_usd > 0.001 else 0.0,
                "iva_16_bs": iva_16_bs,
                "total_usd": p.amount_usd,
                "exchange_rate": rate,
                "municipal_rate": p.municipal_rate or 0.0,
                "municipal_voucher_number": p.municipal_voucher_number
            })
    
        return {
            "success": True,
            "company": {
                "name": "METALMECANICA DALOR, C.A.",
                "rif": "J-31601195-0",
                "address": "AV. CAMARA DE LAS INDUSTRIAS ZONA INDUSTRIAL EL TIGRE GUACARA CARABOBO",
                "period": f"{month or 'Todos'}/{year or '2026'}"
            },
            "totals": {
                "total_compras_bs": round(tot_compras_bs, 2),
                "ret_iva_bs": round(tot_ret_iva_bs, 2),
                "ret_islr_bs": round(tot_ret_islr_bs, 2),
                "ret_mun_bs": round(tot_ret_mun_bs, 2),
                "exento_bs": round(tot_exento_bs, 2),
                "base_16_bs": round(tot_base_16_bs, 2),
                "iva_16_bs": round(tot_iva_16_bs, 2)
            },
            "items": items
        }

    @staticmethod
    def export_libro_compras_excel(
        month: Optional[int] = None,
        year: Optional[int] = None,
        filter_type: Optional[str] = None,
        db: Session = None
    ):
        """
        Exporta el Libro de Compras en formato claro, armónico y profesional de Excel.
        """
        data = FinancialExcelService.get_libro_compras_data(month=month, year=year, filter_type=filter_type, db=db)
        items = data["items"]
        totals = data["totals"]
    
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Libro de Compras"
        ws.views.sheetView[0].showGridLines = True
    
        font_company = Font(name="Calibri", size=13, bold=True, color="002B49")
        font_sub = Font(name="Calibri", size=9, color="555555")
        font_bold = Font(name="Calibri", size=10, bold=True)
        font_regular = Font(name="Calibri", size=9)
        font_title = Font(name="Calibri", size=14, bold=True, color="002B49")
        font_header = Font(name="Calibri", size=9, bold=True, color="FFFFFF")
    
        fill_header = PatternFill(start_color="002B49", end_color="002B49", fill_type="solid")
        fill_even = PatternFill(start_color="FFFFFF", end_color="FFFFFF", fill_type="solid")
        fill_odd = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
        fill_totals = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
    
        border_cell = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )
        border_totals = Border(
            left=Side(style='thin', color='CBD5E1'),
            right=Side(style='thin', color='CBD5E1'),
            top=Side(style='thin', color='002B49'),
            bottom=Side(style='double', color='002B49')
        )
    
        # Encabezado corporativo
        ws['A1'] = "METALMECÁNICA DALOR, C.A."
        ws['A1'].font = font_company
        ws['A2'] = "AV. CÁMARA DE LAS INDUSTRIAS, ZONA INDUSTRIAL EL TIGRE, GUACARA, EDO. CARABOBO"
        ws['A2'].font = font_sub
        ws['A3'] = "RIF: J-31601195-0"
        ws['A3'].font = font_bold
        ws['E3'] = "LIBRO DE COMPRAS"
        ws['E3'].font = font_title
        ws['M3'] = f"PERÍODO: {month or 'TODOS'}/{year or '2026'}"
        ws['M3'].font = font_bold
    
        ws.row_dimensions[1].height = 20
        ws.row_dimensions[2].height = 15
        ws.row_dimensions[3].height = 24
        ws.row_dimensions[4].height = 10
    
        headers = [
            "Fecha",
            "N° Factura",
            "N° Control",
            "Tipo",
            "Proveedor / Razón Social",
            "RIF Proveedor",
            "N° Cbt. Ret.",
            "Total Compras (Bs.)",
            "Compras Exentas (Bs.)",
            "Base Imponible (Bs.)",
            "% Alícuota",
            "IVA Crédito (Bs.)",
            "Ret. IVA (Bs.)",
            "Ret. ISLR (Bs.)",
            "Ret. Municipal (Bs.)"
        ]
    
        ws.row_dimensions[5].height = 28
        for c_idx, h_text in enumerate(headers, 1):
            cell = ws.cell(row=5, column=c_idx, value=h_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = border_cell
    
        row_num = 6
        for idx, item in enumerate(items):
            alicuota_str = f"{int(item['alicuota_16_pct'])}%" if item.get('alicuota_16_pct') else ("16%" if item.get('iva_16_bs', 0) > 0 else "0%")
            cbt_ret = item.get("cbt_retencion")
            if cbt_ret == "-":
                cbt_ret = ""
            ws.append([
                item.get("fecha", "-"),
                item.get("factura", "-"),
                item.get("control", "-"),
                "01",
                item.get("proveedor", "-"),
                item.get("rif", "-"),
                cbt_ret,
                item.get("total_compras_bs", 0.0),
                item.get("exento_bs", 0.0),
                item.get("base_16_bs", 0.0),
                alicuota_str,
                item.get("iva_16_bs", 0.0),
                item.get("ret_iva_bs", 0.0),
                item.get("ret_islr_bs", 0.0),
                item.get("ret_municipal_bs", 0.0)
            ])
            ws.row_dimensions[row_num].height = 20
            fill_curr = fill_odd if idx % 2 == 1 else fill_even
    
            for c_idx in range(1, len(headers) + 1):
                c = ws.cell(row_num, c_idx)
                c.font = font_regular
                c.fill = fill_curr
                c.border = border_cell
                if c_idx in [8, 9, 10, 12, 13, 14, 15]:
                    c.number_format = '#,##0.00'
                    c.alignment = Alignment(horizontal="right", vertical="center")
                elif c_idx == 5:
                    c.alignment = Alignment(horizontal="left", vertical="center")
                else:
                    c.alignment = Alignment(horizontal="center", vertical="center")
            row_num += 1
    
        # Totales Compras
        ws.append([
            "", "", "", "", "TOTALES GENERALES", "", "",
            totals.get("total_compras_bs", 0.0),
            totals.get("exento_bs", 0.0),
            totals.get("base_16_bs", 0.0),
            "16%",
            totals.get("iva_16_bs", 0.0),
            totals.get("ret_iva_bs", 0.0),
            totals.get("ret_islr_bs", 0.0),
            totals.get("ret_mun_bs", 0.0)
        ])
        ws.row_dimensions[row_num].height = 24
        for c_idx in range(1, len(headers) + 1):
            c = ws.cell(row_num, c_idx)
            c.font = Font(name="Calibri", size=9, bold=True, color="002B49")
            c.fill = fill_totals
            c.border = border_totals
            if c_idx in [8, 9, 10, 12, 13, 14, 15]:
                c.number_format = '#,##0.00'
                c.alignment = Alignment(horizontal="right", vertical="center")
            elif c_idx == 5:
                c.alignment = Alignment(horizontal="right", vertical="center")
            else:
                c.alignment = Alignment(horizontal="center", vertical="center")
    
        # Auto ajuste de anchos
        for c_idx in range(1, len(headers) + 1):
            col_letter = openpyxl.utils.get_column_letter(c_idx)
            max_len = len(str(headers[c_idx - 1]))
            for r_idx in range(5, row_num + 1):
                val = ws.cell(r_idx, c_idx).value
                if val is not None:
                    val_str = f"{val:,.2f}" if isinstance(val, (int, float)) else str(val)
                    if len(val_str) > max_len:
                        max_len = len(val_str)
            ws.column_dimensions[col_letter].width = min(max(max_len + 4, 10), 45)
    
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
    
        fname = f"Libro_de_Compras_{year or 2026}_{month or 'Todos'}.xlsx"
        return Response(
            content=buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={fname}"}
        )
    
    async def import_libros_excel(
        file: Any = None,
        exchange_rate: float = None,
        db: Session = None
    ):
        """
        Importa masivamente facturas y retenciones desde un archivo Excel de Libros de Compras y Ventas.
        """
        contents = await file.read()
        try:
            wb = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"No se pudo leer el archivo Excel: {str(e)}")
    
        def safe_float(v):
            if v is None: return 0.0
            try:
                return float(str(v).replace(',', '.').strip())
            except:
                return 0.0
    
        imported_ventas = 0
        imported_compras = 0
        linked_municipal = 0
    
        rate = exchange_rate or 859.06
    
        # 1. Procesar Ventas
        if 'Ventas' in wb.sheetnames:
            ws_v = wb['Ventas']
            for r in range(6, ws_v.max_row + 1):
                factura = ws_v.cell(r, 2).value
                cliente_nombre = ws_v.cell(r, 5).value
                if factura and cliente_nombre and str(factura).strip() != 'FACTURA' and 'TOTAL' not in str(cliente_nombre):
                    fact_clean = str(factura).strip()
                    cli_clean = str(cliente_nombre).strip()
                    rif_clean = str(ws_v.cell(r, 9).value or '').strip()
                    control_clean = str(ws_v.cell(r, 3).value or fact_clean).strip()
    
                    # Buscar o crear Cliente
                    client = db.query(Client).filter(Client.name.ilike(cli_clean)).first()
                    if not client:
                        client = Client(name=cli_clean, rif=rif_clean or "J-00000000-0", contact_name="Contacto Comercial")
                        db.add(client)
                        db.flush()
    
                    # Buscar duplicado en AccountReceivable
                    existing_rec = db.query(AccountReceivable).filter(AccountReceivable.invoice_number == fact_clean).first()
                    if not existing_rec:
                        dia_val = ws_v.cell(r, 1).value
                        issue_dt = dia_val if isinstance(dia_val, datetime) else datetime(2026, 9, 9)
    
                        tot_bs = safe_float(ws_v.cell(r, 10).value)
                        base_bs = safe_float(ws_v.cell(r, 11).value)
                        ret_iva_bs = safe_float(ws_v.cell(r, 7).value)
                        ret_islr_bs = safe_float(ws_v.cell(r, 8).value)
    
                        tot_usd = round(tot_bs / rate, 2)
                        base_usd = round(base_bs / rate, 2)
                        tax_usd = round((tot_bs - base_bs) / rate, 2)
                        ret_iva_usd = round(ret_iva_bs / rate, 2)
                        ret_islr_usd = round(ret_islr_bs / rate, 2)
                        net_usd = round(tot_usd - ret_iva_usd - ret_islr_usd, 2)
    
                        new_rec = AccountReceivable(
                            invoice_number=fact_clean,
                            client_id=client.id,
                            description=f"Facturación según Libro de Ventas SENIAT #{fact_clean}",
                            issue_date=issue_dt,
                            due_date=issue_dt + timedelta(days=30),
                            amount_usd=tot_usd,
                            amount_bs=tot_bs,
                            exchange_rate=rate,
                            taxable_base_usd=base_usd,
                            tax_amount_usd=tax_usd,
                            tax_withholding_rate=75.0 if ret_iva_bs > 0 else 0.0,
                            tax_withholding_usd=ret_iva_usd,
                            islr_rate=2.0 if ret_islr_bs > 0 else 0.0,
                            islr_withholding_usd=ret_islr_usd,
                            net_amount_usd=net_usd,
                            paid_amount_usd=round(ret_iva_usd + ret_islr_usd, 2),
                            balance_usd=net_usd,
                            status="pendiente" if net_usd > 0.01 else "cobrado_total",
                            notes=f"Control fiscal: {control_clean}. RIF: {rif_clean}"
                        )
                        db.add(new_rec)
                        imported_ventas += 1
    
        # 2. Procesar Compras
        if 'Compras' in wb.sheetnames:
            ws_c = wb['Compras']
            for r in range(7, ws_c.max_row + 1):
                factura = ws_c.cell(r, 2).value
                prov_nombre = ws_c.cell(r, 5).value
                if factura and prov_nombre and str(factura).strip() != 'NUMERO' and 'TOTAL' not in str(prov_nombre):
                    fact_clean = str(factura).strip()
                    prov_clean = str(prov_nombre).strip()
                    rif_clean = str(ws_c.cell(r, 6).value or '').strip()
                    control_clean = str(ws_c.cell(r, 3).value or fact_clean).strip()
                    cbt_ret = str(ws_c.cell(r, 7).value or '').strip()
    
                    # Buscar duplicado en AccountPayable
                    existing_pay = db.query(AccountPayable).filter(
                        AccountPayable.invoice_number == fact_clean,
                        AccountPayable.supplier_name.ilike(prov_clean)
                    ).first()
                    if not existing_pay:
                        dia_val = ws_c.cell(r, 1).value
                        issue_dt = dia_val if isinstance(dia_val, datetime) else datetime(2026, 9, 1)
    
                        tot_bs = safe_float(ws_c.cell(r, 8).value)
                        ret_iva_bs = safe_float(ws_c.cell(r, 9).value)
                        exento_bs = safe_float(ws_c.cell(r, 10).value)
                        base_16_bs = safe_float(ws_c.cell(r, 17).value)
                        iva_16_bs = safe_float(ws_c.cell(r, 19).value)
    
                        tot_usd = round(tot_bs / rate, 2)
                        exento_usd = round(exento_bs / rate, 2)
                        base_usd = round(base_16_bs / rate, 2) if base_16_bs > 0 else round((tot_bs - exento_bs) / (1.16 * rate), 2)
                        tax_usd = round(iva_16_bs / rate, 2) if iva_16_bs > 0 else round((tot_bs - exento_bs - (base_usd * rate)) / rate, 2)
                        ret_iva_usd = round(ret_iva_bs / rate, 2)
                        net_usd = round(tot_usd - ret_iva_usd, 2)
    
                        new_pay = AccountPayable(
                            invoice_number=fact_clean,
                            control_number=control_clean,
                            supplier_name=prov_clean,
                            supplier_rif=rif_clean or None,
                            doc_type="factura",
                            description=f"Compra/Insumos según Libro de Compras SENIAT #{fact_clean}",
                            issue_date=issue_dt,
                            due_date=issue_dt + timedelta(days=15),
                            amount_usd=tot_usd,
                            amount_bs=tot_bs,
                            exchange_rate=rate,
                            taxable_base_usd=base_usd,
                            tax_amount_usd=tax_usd,
                            withholding_exempt_usd=exento_usd,
                            tax_withholding_rate=75.0 if ret_iva_bs > 0 else 0.0,
                            tax_withholding_usd=ret_iva_usd,
                            withholding_voucher_number=cbt_ret or None,
                            withholding_voucher_date=issue_dt if cbt_ret else None,
                            is_withholding_applied=bool(ret_iva_bs > 0),
                            net_amount_usd=net_usd,
                            paid_amount_usd=ret_iva_usd,
                            balance_usd=net_usd,
                            status="pagado_total" if net_usd <= 0.01 else "pendiente"
                        )
                        db.add(new_pay)
                        imported_compras += 1
    
        # 3. Procesar Retención Municipal si está presente
        if 'Municipal' in wb.sheetnames:
            ws_m = wb['Municipal']
            fact_mun = str(ws_m.cell(33, 4).value or '').strip()
            prov_mun = str(ws_m.cell(26, 5).value or '').strip()
            base_mun_bs = safe_float(ws_m.cell(38, 4).value)
            ret_mun_bs = safe_float(ws_m.cell(39, 8).value)
            tasa_mun_pct = safe_float(ws_m.cell(39, 4).value) * 100
            voucher_mun_raw = str(ws_m.cell(9, 9).value or '00000110').replace('Comprobante  N', '').replace('Comprobante', '').strip()
    
            if fact_mun or prov_mun:
                target_pay = db.query(AccountPayable).filter(
                    (AccountPayable.invoice_number == fact_mun) | (AccountPayable.supplier_name.ilike(f"%{prov_mun[:15]}%"))
                ).first()
                if target_pay:
                    target_pay.municipal_rate = tasa_mun_pct or 3.0
                    target_pay.municipal_withholding_usd = round(ret_mun_bs / rate, 2)
                    target_pay.municipal_voucher_number = voucher_mun_raw
                    target_pay.municipal_voucher_date = datetime(2026, 9, 10)
                    linked_municipal += 1
    
        db.commit()
    
        return {
            "success": True,
            "message": f"¡Importación completada! Se registraron {imported_ventas} ventas en CxC, {imported_compras} compras en CxP y se vincularon {linked_municipal} retenciones municipales.",
            "imported_ventas": imported_ventas,
            "imported_compras": imported_compras,
            "linked_municipal": linked_municipal
        }

    @staticmethod
    def export_cxc_excel(db: Session):
        """
        Exporta la cartera completa de Cuentas por Cobrar (CxC) en formato Excel ejecutivo OpenPyXL.
        """
        receivables = db.query(AccountReceivable).options(
            joinedload(AccountReceivable.client),
            joinedload(AccountReceivable.project)
        ).order_by(AccountReceivable.issue_date.desc()).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Cuentas por Cobrar"
        ws.views.sheetView[0].showGridLines = True

        font_company = Font(name="Calibri", size=13, bold=True, color="002B49")
        font_sub = Font(name="Calibri", size=9, color="555555")
        font_bold = Font(name="Calibri", size=10, bold=True)
        font_regular = Font(name="Calibri", size=9)
        font_header = Font(name="Calibri", size=9, bold=True, color="FFFFFF")
        fill_header = PatternFill(start_color="002B49", end_color="002B49", fill_type="solid")
        fill_totals = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

        border_cell = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )

        ws['A1'] = "METALMECÁNICA DALOR, C.A."
        ws['A1'].font = font_company
        ws['A2'] = "REPORTE CONSOLIDADO DE CUENTAS POR COBRAR (CxC CLIENTES)"
        ws['A2'].font = font_sub
        ws['A3'] = f"FECHA DE EMISIÓN: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws['A3'].font = font_bold

        headers = [
            "N° Factura", "Fecha Emisión", "Vencimiento", "Cliente / Razón Social",
            "RIF", "Proyecto / Obra", "Total Facturado (USD)", "Cobrado (USD)",
            "Saldo Pendiente (USD)", "Tasa BCV", "Saldo Pendiente (Bs.)", "Estado"
        ]

        ws.row_dimensions[5].height = 26
        for c_idx, h_text in enumerate(headers, 1):
            cell = ws.cell(row=5, column=c_idx, value=h_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        tot_billed = 0.0
        tot_paid = 0.0
        tot_pending = 0.0
        tot_pending_bs = 0.0

        row_num = 6
        for r in receivables:
            rate = float(r.exchange_rate or 859.06)
            billed = float(r.amount_usd or 0.0)
            paid = float(r.paid_amount_usd or 0.0)
            bal = float(r.balance_usd if r.balance_usd is not None else max(0.0, billed - paid))
            bal_bs = round(bal * rate, 2)

            tot_billed += billed
            tot_paid += paid
            tot_pending += bal
            tot_pending_bs += bal_bs

            cli_name = r.client.name if r.client else "Cliente General"
            cli_rif = r.client.rif if r.client else "J-00000000-0"
            proj_str = f"[{r.project.code}] {r.project.name}" if r.project else "General / Sede"

            ws.cell(row=row_num, column=1, value=r.invoice_number or f"CxC-{r.id:04d}").font = font_bold
            ws.cell(row=row_num, column=2, value=r.issue_date.strftime("%d/%m/%Y") if r.issue_date else "-").font = font_regular
            ws.cell(row=row_num, column=3, value=r.due_date.strftime("%d/%m/%Y") if r.due_date else "-").font = font_regular
            ws.cell(row=row_num, column=4, value=cli_name).font = font_regular
            ws.cell(row=row_num, column=5, value=cli_rif).font = font_regular
            ws.cell(row=row_num, column=6, value=proj_str).font = font_regular

            c7 = ws.cell(row=row_num, column=7, value=billed)
            c7.font = font_regular
            c7.number_format = "$#,##0.00"

            c8 = ws.cell(row=row_num, column=8, value=paid)
            c8.font = font_regular
            c8.number_format = "$#,##0.00"

            c9 = ws.cell(row=row_num, column=9, value=bal)
            c9.font = font_bold
            c9.number_format = "$#,##0.00"

            c10 = ws.cell(row=row_num, column=10, value=rate)
            c10.font = font_regular
            c10.number_format = "#,##0.00"

            c11 = ws.cell(row=row_num, column=11, value=bal_bs)
            c11.font = font_regular
            c11.number_format = "Bs. #,##0.00"

            ws.cell(row=row_num, column=12, value=(r.status or "pendiente").upper()).font = font_bold

            for col in range(1, 13):
                ws.cell(row=row_num, column=col).border = border_cell

            row_num += 1

        # Fila de Totales
        ws.row_dimensions[row_num].height = 22
        t_cell = ws.cell(row=row_num, column=1, value="TOTAL CONSOLIDADO")
        t_cell.font = font_bold
        ws.merge_cells(start_row=row_num, start_column=1, end_row=row_num, end_column=6)

        c7_t = ws.cell(row=row_num, column=7, value=tot_billed)
        c7_t.font = font_bold
        c7_t.number_format = "$#,##0.00"

        c8_t = ws.cell(row=row_num, column=8, value=tot_paid)
        c8_t.font = font_bold
        c8_t.number_format = "$#,##0.00"

        c9_t = ws.cell(row=row_num, column=9, value=tot_pending)
        c9_t.font = font_bold
        c9_t.number_format = "$#,##0.00"

        c11_t = ws.cell(row=row_num, column=11, value=tot_pending_bs)
        c11_t.font = font_bold
        c11_t.number_format = "Bs. #,##0.00"

        for col in range(1, 13):
            ws.cell(row=row_num, column=col).fill = fill_totals
            ws.cell(row=row_num, column=col).border = border_cell

        # Auto ajuste de anchos de columna
        for c_idx in range(1, len(headers) + 1):
            col_letter = openpyxl.utils.get_column_letter(c_idx)
            ws.column_dimensions[col_letter].width = 18

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        fname = f"DALOR_Cuentas_Por_Cobrar_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return Response(
            content=buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={fname}"}
        )

    @staticmethod
    def export_cxp_excel(db: Session):
        """
        Exporta la cartera completa de Cuentas por Pagar (CxP) en formato Excel ejecutivo OpenPyXL.
        """
        payables = db.query(AccountPayable).options(
            joinedload(AccountPayable.project)
        ).order_by(AccountPayable.issue_date.desc()).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Cuentas por Pagar"
        ws.views.sheetView[0].showGridLines = True

        font_company = Font(name="Calibri", size=13, bold=True, color="002B49")
        font_sub = Font(name="Calibri", size=9, color="555555")
        font_bold = Font(name="Calibri", size=10, bold=True)
        font_regular = Font(name="Calibri", size=9)
        font_header = Font(name="Calibri", size=9, bold=True, color="FFFFFF")
        fill_header = PatternFill(start_color="002B49", end_color="002B49", fill_type="solid")
        fill_totals = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

        border_cell = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )

        ws['A1'] = "METALMECÁNICA DALOR, C.A."
        ws['A1'].font = font_company
        ws['A2'] = "REPORTE CONSOLIDADO DE CUENTAS POR PAGAR (CxP PROVEEDORES)"
        ws['A2'].font = font_sub
        ws['A3'] = f"FECHA DE EMISIÓN: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws['A3'].font = font_bold

        headers = [
            "N° Factura", "N° Control", "Fecha Emisión", "Vencimiento", "Proveedor / Razón Social",
            "RIF", "Imputación / Obra", "Total Factura (USD)", "Pagado (USD)",
            "Saldo Deuda (USD)", "Tasa BCV", "Saldo Deuda (Bs.)", "Estado"
        ]

        ws.row_dimensions[5].height = 26
        for c_idx, h_text in enumerate(headers, 1):
            cell = ws.cell(row=5, column=c_idx, value=h_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        tot_amt = 0.0
        tot_paid = 0.0
        tot_bal = 0.0
        tot_bal_bs = 0.0

        row_num = 6
        for p in payables:
            rate = float(p.exchange_rate or 859.06)
            amt = float(p.amount_usd or 0.0)
            paid = float(p.paid_amount_usd or 0.0)
            bal = float(p.balance_usd if p.balance_usd is not None else max(0.0, amt - paid))
            bal_bs = round(bal * rate, 2)

            tot_amt += amt
            tot_paid += paid
            tot_bal += bal
            tot_bal_bs += bal_bs

            proj_str = f"[{p.project.code}] {p.project.name}" if p.project else "General / Sede"

            ws.cell(row=row_num, column=1, value=p.invoice_number or f"CxP-{p.id:04d}").font = font_bold
            ws.cell(row=row_num, column=2, value=p.control_number or "-").font = font_regular
            ws.cell(row=row_num, column=3, value=p.issue_date.strftime("%d/%m/%Y") if p.issue_date else "-").font = font_regular
            ws.cell(row=row_num, column=4, value=p.due_date.strftime("%d/%m/%Y") if p.due_date else "-").font = font_regular
            ws.cell(row=row_num, column=5, value=p.supplier_name or "Proveedor").font = font_regular
            ws.cell(row=row_num, column=6, value=p.supplier_rif or "J-00000000-0").font = font_regular
            ws.cell(row=row_num, column=7, value=proj_str).font = font_regular

            c8 = ws.cell(row=row_num, column=8, value=amt)
            c8.font = font_regular
            c8.number_format = "$#,##0.00"

            c9 = ws.cell(row=row_num, column=9, value=paid)
            c9.font = font_regular
            c9.number_format = "$#,##0.00"

            c10 = ws.cell(row=row_num, column=10, value=bal)
            c10.font = font_bold
            c10.number_format = "$#,##0.00"

            c11 = ws.cell(row=row_num, column=11, value=rate)
            c11.font = font_regular
            c11.number_format = "#,##0.00"

            c12 = ws.cell(row=row_num, column=12, value=bal_bs)
            c12.font = font_regular
            c12.number_format = "Bs. #,##0.00"

            ws.cell(row=row_num, column=13, value=(p.status or "pendiente").upper()).font = font_bold

            for col in range(1, 14):
                ws.cell(row=row_num, column=col).border = border_cell

            row_num += 1

        # Totales
        ws.row_dimensions[row_num].height = 22
        t_cell = ws.cell(row=row_num, column=1, value="TOTAL CONSOLIDADO")
        t_cell.font = font_bold
        ws.merge_cells(start_row=row_num, start_column=1, end_row=row_num, end_column=7)

        c8_t = ws.cell(row=row_num, column=8, value=tot_amt)
        c8_t.font = font_bold
        c8_t.number_format = "$#,##0.00"

        c9_t = ws.cell(row=row_num, column=9, value=tot_paid)
        c9_t.font = font_bold
        c9_t.number_format = "$#,##0.00"

        c10_t = ws.cell(row=row_num, column=10, value=tot_bal)
        c10_t.font = font_bold
        c10_t.number_format = "$#,##0.00"

        c12_t = ws.cell(row=row_num, column=12, value=tot_bal_bs)
        c12_t.font = font_bold
        c12_t.number_format = "Bs. #,##0.00"

        for col in range(1, 14):
            ws.cell(row=row_num, column=col).fill = fill_totals
            ws.cell(row=row_num, column=col).border = border_cell

        for c_idx in range(1, len(headers) + 1):
            col_letter = openpyxl.utils.get_column_letter(c_idx)
            ws.column_dimensions[col_letter].width = 18

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        fname = f"DALOR_Cuentas_Por_Pagar_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return Response(
            content=buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={fname}"}
        )

    @staticmethod
    def export_expenses_excel(db: Session):
        """
        Exporta el histórico general de auditoría de gastos en formato Excel ejecutivo OpenPyXL.
        """
        expenses = db.query(Expense).options(
            joinedload(Expense.project),
            joinedload(Expense.category)
        ).order_by(Expense.expense_date.desc()).all()

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Histórico de Gastos"
        ws.views.sheetView[0].showGridLines = True

        font_company = Font(name="Calibri", size=13, bold=True, color="002B49")
        font_sub = Font(name="Calibri", size=9, color="555555")
        font_bold = Font(name="Calibri", size=10, bold=True)
        font_regular = Font(name="Calibri", size=9)
        font_header = Font(name="Calibri", size=9, bold=True, color="FFFFFF")
        fill_header = PatternFill(start_color="002B49", end_color="002B49", fill_type="solid")
        fill_totals = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

        border_cell = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )

        ws['A1'] = "METALMECÁNICA DALOR, C.A."
        ws['A1'].font = font_company
        ws['A2'] = "HISTÓRICO Y AUDITORÍA GENERAL DE GASTOS"
        ws['A2'].font = font_sub
        ws['A3'] = f"FECHA DE EMISIÓN: {datetime.now().strftime('%d/%m/%Y %H:%M')}"
        ws['A3'].font = font_bold

        headers = [
            "Fecha", "Proyecto / Imputación", "Partida / Categoría", "Proveedor / Beneficiario",
            "N° Factura / Control", "Descripción", "Monto (USD)", "Tasa BCV", "Monto (Bs.)",
            "Reportado Por", "Estado"
        ]

        ws.row_dimensions[5].height = 26
        for c_idx, h_text in enumerate(headers, 1):
            cell = ws.cell(row=5, column=c_idx, value=h_text)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        tot_usd = 0.0
        tot_bs = 0.0

        row_num = 6
        for e in expenses:
            usd = float(e.amount_usd or 0.0)
            bs = float(e.amount_bs or 0.0)
            rate = float(e.exchange_rate or (bs / usd if usd > 0 else 859.06))
            tot_usd += usd
            tot_bs += bs

            proj_str = f"[{e.project.code}] {e.project.name}" if e.project else "Sede Central / General"
            cat_str = f"[{e.category.code}] {e.category.name}" if e.category else (e.category_code or "General")

            rep_name = "Admin"
            if getattr(e, 'reported_by', None):
                rep_name = getattr(e.reported_by, 'full_name', None) or getattr(e.reported_by, 'username', 'Admin')

            ws.cell(row=row_num, column=1, value=e.expense_date.strftime("%d/%m/%Y") if e.expense_date else "-").font = font_regular
            ws.cell(row=row_num, column=2, value=proj_str).font = font_regular
            ws.cell(row=row_num, column=3, value=cat_str).font = font_regular
            ws.cell(row=row_num, column=4, value=e.supplier_vendor or "-").font = font_regular
            ws.cell(row=row_num, column=5, value=getattr(e, 'expense_type', '-') or "-").font = font_bold
            ws.cell(row=row_num, column=6, value=e.description or "-").font = font_regular

            c7 = ws.cell(row=row_num, column=7, value=usd)
            c7.font = font_bold
            c7.number_format = "$#,##0.00"

            c8 = ws.cell(row=row_num, column=8, value=rate)
            c8.font = font_regular
            c8.number_format = "#,##0.00"

            c9 = ws.cell(row=row_num, column=9, value=bs)
            c9.font = font_regular
            c9.number_format = "Bs. #,##0.00"

            ws.cell(row=row_num, column=10, value=rep_name).font = font_regular
            ws.cell(row=row_num, column=11, value=(e.status or "pendiente").upper()).font = font_bold

            for col in range(1, 12):
                ws.cell(row=row_num, column=col).border = border_cell

            row_num += 1

        # Totales
        ws.row_dimensions[row_num].height = 22
        t_cell = ws.cell(row=row_num, column=1, value="TOTAL GASTOS AUDITADOS")
        t_cell.font = font_bold
        ws.merge_cells(start_row=row_num, start_column=1, end_row=row_num, end_column=6)

        c7_t = ws.cell(row=row_num, column=7, value=tot_usd)
        c7_t.font = font_bold
        c7_t.number_format = "$#,##0.00"

        c9_t = ws.cell(row=row_num, column=9, value=tot_bs)
        c9_t.font = font_bold
        c9_t.number_format = "Bs. #,##0.00"

        for col in range(1, 12):
            ws.cell(row=row_num, column=col).fill = fill_totals
            ws.cell(row=row_num, column=col).border = border_cell

        for c_idx in range(1, len(headers) + 1):
            col_letter = openpyxl.utils.get_column_letter(c_idx)
            ws.column_dimensions[col_letter].width = 18

        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        fname = f"DALOR_Auditoria_Gastos_{datetime.now().strftime('%Y%m%d')}.xlsx"
        return Response(
            content=buf.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={fname}"}
        )

    @staticmethod
    def get_client_statement_data(client_id: int, db: Session):
        """
        Retorna la estructura financiera completa para el Estado de Cuenta oficial del Cliente:
        - Metadatos corporativos y del cliente
        - Facturas / Valuaciones con antigüedad (aging)
        - Pagos / Abonos aplicados
        - Totales en USD y Bs. al cambio oficial BCV
        """
        client = db.query(Client).filter(Client.id == client_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Cliente no encontrado.")

        receivables = db.query(AccountReceivable).options(
            joinedload(AccountReceivable.project),
            joinedload(AccountReceivable.payments)
        ).filter(AccountReceivable.client_id == client_id).order_by(AccountReceivable.issue_date.asc()).all()

        today = datetime.now().date()
        invoices = []
        payments = []

        total_billed = 0.0
        total_paid = 0.0
        total_pending = 0.0

        aging_current = 0.0      # No vencido o 0 días
        aging_1_30 = 0.0         # 1 a 30 días de mora
        aging_31_60 = 0.0        # 31 a 60 días
        aging_61_plus = 0.0      # Más de 60 días

        latest_rate = 859.06

        for r in receivables:
            if r.exchange_rate and r.exchange_rate > 0:
                latest_rate = float(r.exchange_rate)

            amt = float(r.amount_usd or 0.0)
            paid = float(r.paid_amount_usd or 0.0)
            bal = float(r.balance_usd if r.balance_usd is not None else max(0.0, amt - paid))

            total_billed += amt
            total_paid += paid
            total_pending += bal

            issue_d = r.issue_date.date() if isinstance(r.issue_date, datetime) else r.issue_date
            due_d = r.due_date.date() if isinstance(r.due_date, datetime) else (r.due_date or issue_d)

            days_overdue = 0
            if bal > 0.01 and due_d:
                delta = (today - due_d).days
                if delta > 0:
                    days_overdue = delta

            if bal > 0.01:
                if days_overdue == 0:
                    aging_current += bal
                elif days_overdue <= 30:
                    aging_1_30 += bal
                elif days_overdue <= 60:
                    aging_31_60 += bal
                else:
                    aging_61_plus += bal

            invoices.append({
                "id": r.id,
                "invoice_number": r.invoice_number or f"CxC-{r.id:04d}",
                "issue_date": str(issue_d) if issue_d else "-",
                "due_date": str(due_d) if due_d else "-",
                "project_code": r.project.code if r.project else "General",
                "project_name": r.project.name if r.project else "Servicio General",
                "concept": r.notes or f"Facturación de servicios u obra {r.project.code if r.project else ''}",
                "amount_usd": amt,
                "paid_amount_usd": paid,
                "balance_usd": bal,
                "days_overdue": days_overdue,
                "status": "vencida" if days_overdue > 0 and bal > 0.01 else ("solvente" if bal <= 0.01 else "corriente")
            })

            # Recolectar pagos asociados
            if r.payments:
                for p in r.payments:
                    p_date = p.payment_date.strftime("%d/%m/%Y") if p.payment_date else "-"
                    payments.append({
                        "id": p.id,
                        "payment_number": getattr(p, "voucher_number", None) or getattr(p, "reference_number", None) or f"REC-{p.id:04d}",
                        "date": p_date,
                        "invoice_number": r.invoice_number,
                        "method": (p.payment_method or "transferencia").upper(),
                        "reference": p.reference_number or "-",
                        "amount_usd": float(p.amount_usd or 0.0),
                        "amount_bs": float(p.amount_bs or 0.0)
                    })

        total_pending_bs = round(total_pending * latest_rate, 2)

        return {
            "success": True,
            "company": {
                "name": "METALMECÁNICA DALOR, C.A.",
                "rif": "J-31601195-0",
                "address": "Av. Cámara de las Industrias, Zona Industrial El Tigre, Galpón N° 10, Guacara, Edo. Carabobo",
                "email": "administracion@metaldalor.com",
                "phone": "+58 (245) 564-8890"
            },
            "client": {
                "id": client.id,
                "name": client.name,
                "rif": client.rif or "J-00000000-0",
                "contact_person": getattr(client, 'contact_name', None) or getattr(client, 'contact_person', '-') or "-",
                "phone": client.contact_phone or "-",
                "email": client.contact_email or "-",
                "address": client.address or "Venezuela"
            },
            "statement_date": datetime.now().strftime("%d/%m/%Y"),
            "exchange_rate": latest_rate,
            "totals": {
                "total_billed_usd": round(total_billed, 2),
                "total_paid_usd": round(total_paid, 2),
                "total_pending_usd": round(total_pending, 2),
                "total_pending_bs": total_pending_bs,
                "aging": {
                    "current_usd": round(aging_current, 2),
                    "days_1_30_usd": round(aging_1_30, 2),
                    "days_31_60_usd": round(aging_31_60, 2),
                    "days_61_plus_usd": round(aging_61_plus, 2)
                }
            },
            "invoices": invoices,
            "payments": payments
        }

    
    
