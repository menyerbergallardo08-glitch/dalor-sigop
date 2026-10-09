from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.models import AccountPayable
from app.services.company_profile_service import CompanyProfileService

router = APIRouter()

# ------------------------------------------------------------------------------
# 1. COMPROBANTE OFICIAL DE RETENCIÓN DE IVA (SENIAT SNAT/2015/0049)
# ------------------------------------------------------------------------------
@router.get("/cxp/{payable_id}/withholding-voucher")
def get_payable_withholding_voucher(payable_id: int, db: Session = Depends(get_db)):
    """
    Retorna el Comprobante Oficial de Retención de IVA
    conforme a la Providencia Administrativa SNAT/2015/0049 del SENIAT.
    """
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Factura o cuenta por pagar no encontrada.")

    # Datos oficiales del comprobante SENIAT
    v_date = p.withholding_voucher_date or p.issue_date or datetime.utcnow()
    period_fiscal = v_date.strftime("%Y-%m")
    v_num = p.withholding_voucher_number or f"{v_date.strftime('%Y%m')}00000001"

    rate_bcv = p.exchange_rate or 850.0
    base_bs = round(p.taxable_base_usd * rate_bcv, 2)
    tax_bs = round(p.tax_amount_usd * rate_bcv, 2)
    ret_bs = round(p.tax_withholding_usd * rate_bcv, 2)
    total_bs = round(p.amount_usd * rate_bcv, 2)
    net_bs = round(p.net_amount_usd * rate_bcv, 2)
    exempt_bs = round((p.withholding_exempt_usd or 0.0) * rate_bcv, 2)

    profile = CompanyProfileService.get_profile(db)

    return {
        "success": True,
        "voucher": {
            "voucher_number": v_num,
            "voucher_date": v_date.strftime("%d/%m/%Y"),
            "fiscal_period": period_fiscal,
            "agent": {
                "name": profile.get("legal_name"),
                "rif": profile.get("rif"),
                "address": profile.get("fiscal_address"),
                "email": profile.get("email"),
                "phone": profile.get("phone"),
                "legal_base": profile.get("legal_base_seniat") or "Providencia Administrativa SNAT/2015/0049 de fecha 17/07/2015, publicada en Gaceta Oficial N° 40.720 del 10/08/2015."
            },
            "supplier": {
                "name": p.supplier_name,
                "rif": p.supplier_rif or "J-00000000-0"
            },
            "invoice": {
                "invoice_date": p.issue_date.strftime("%d/%m/%Y") if p.issue_date else v_date.strftime("%d/%m/%Y"),
                "invoice_number": p.invoice_number,
                "control_number": p.control_number or p.invoice_number,
                "transaction_type": "01-Reg",
                "total_usd": p.amount_usd,
                "total_bs": total_bs,
                "exempt_usd": p.withholding_exempt_usd or 0.0,
                "exempt_bs": exempt_bs,
                "base_usd": p.taxable_base_usd,
                "base_bs": base_bs,
                "tax_rate_pct": 16.0,
                "tax_usd": p.tax_amount_usd,
                "tax_bs": tax_bs,
                "withholding_rate_pct": p.tax_withholding_rate or 75.0,
                "withholding_usd": p.tax_withholding_usd,
                "withholding_bs": ret_bs,
                "net_payable_usd": p.net_amount_usd,
                "net_payable_bs": net_bs,
                "exchange_rate": rate_bcv
            }
        }
    }

# ------------------------------------------------------------------------------
# 2. COMPROBANTE OFICIAL DE RETENCIÓN DE ISLR (DECRETO 1.808 SENIAT)
# ------------------------------------------------------------------------------
@router.get("/cxp/{payable_id}/islr-withholding-voucher")
def get_payable_islr_withholding_voucher(payable_id: int, db: Session = Depends(get_db)):
    """
    Retorna el Comprobante Oficial de Retención de ISLR
    conforme al Decreto N° 1.808 (Reglamento Parcial de Retenciones de ISLR).
    """
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Factura o cuenta por pagar no encontrada.")

    v_date = p.withholding_voucher_date or p.issue_date or datetime.utcnow()
    period_fiscal = v_date.strftime("%Y-%m")
    v_num = f"ISLR-{v_date.strftime('%Y%m')}{p.id:04d}"

    rate_bcv = p.exchange_rate or 850.0
    base_usd = p.taxable_base_usd if (p.taxable_base_usd and p.taxable_base_usd > 0) else round(p.amount_usd / 1.16, 2)
    base_bs = round(base_usd * rate_bcv, 2)
    
    islr_rate = p.islr_rate if p.islr_rate is not None else 2.0
    islr_usd = p.islr_withholding_usd if (p.islr_withholding_usd and p.islr_withholding_usd > 0) else round(base_usd * (islr_rate / 100.0), 2)
    islr_bs = round(islr_usd * rate_bcv, 2)
    
    total_bs = round(p.amount_usd * rate_bcv, 2)
    tax_bs = round((p.tax_amount_usd or (p.amount_usd - base_usd)) * rate_bcv, 2)
    net_bs = round(total_bs - islr_bs - round((p.tax_withholding_usd or 0.0) * rate_bcv, 2), 2)

    profile = CompanyProfileService.get_profile(db)

    return {
        "success": True,
        "voucher": {
            "voucher_number": v_num,
            "voucher_date": v_date.strftime("%d/%m/%Y"),
            "fiscal_period": period_fiscal,
            "legal_base": "Decreto N° 1.808 - Reglamento Parcial de la Ley de Impuesto Sobre la Renta en Materia de Retenciones (G.O. N° 36.203 del 12/05/1997).",
            "agent": {
                "name": profile.get("legal_name"),
                "rif": profile.get("rif"),
                "address": profile.get("fiscal_address"),
                "email": profile.get("email"),
                "phone": profile.get("phone")
            },
            "supplier": {
                "name": p.supplier_name,
                "rif": p.supplier_rif or "J-00000000-0"
            },
            "invoice": {
                "invoice_date": p.issue_date.strftime("%d/%m/%Y") if p.issue_date else v_date.strftime("%d/%m/%Y"),
                "invoice_number": p.invoice_number or f"FAC-{p.id}",
                "control_number": p.control_number or p.invoice_number or f"00-{p.id}",
                "concept": p.description or "Servicios / Suministros Comerciales e Industriales",
                "concept_code": "054" if islr_rate == 2.0 else "001",
                "total_usd": p.amount_usd,
                "total_bs": total_bs,
                "base_usd": base_usd,
                "base_bs": base_bs,
                "tax_bs": tax_bs,
                "islr_rate_pct": islr_rate,
                "islr_withholding_usd": islr_usd,
                "islr_withholding_bs": islr_bs,
                "net_payable_bs": net_bs,
                "exchange_rate": rate_bcv
            }
        }
    }

# ------------------------------------------------------------------------------
# 3. CONSTANCIA OFICIAL DE RETENCIÓN DE IMPUESTO MUNICIPAL (GUACARA)
# ------------------------------------------------------------------------------
@router.get("/cxp/{payable_id}/municipal-withholding-voucher")
def get_payable_municipal_withholding_voucher(payable_id: int, db: Session = Depends(get_db)):
    """
    Retorna la Constancia Oficial de Retención de Impuesto Municipal
    (Alcaldía del Municipio Guacara, Estado Carabobo) para imprimir o exportar a PDF.
    """
    p = db.query(AccountPayable).filter(AccountPayable.id == payable_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Factura o cuenta por pagar no encontrada.")

    v_date = p.municipal_voucher_date or p.withholding_voucher_date or p.issue_date or datetime.utcnow()
    v_num = p.municipal_voucher_number or f"{v_date.strftime('%Y%m')}{p.id:04d}"

    rate_bcv = p.exchange_rate or 859.06
    base_usd = p.taxable_base_usd if (p.taxable_base_usd and p.taxable_base_usd > 0) else round(p.amount_usd / 1.16, 2)
    base_bs = round(base_usd * rate_bcv, 2)
    
    mun_rate = p.municipal_rate if (p.municipal_rate is not None and p.municipal_rate > 0) else 3.0
    mun_usd = p.municipal_withholding_usd if (p.municipal_withholding_usd and p.municipal_withholding_usd > 0) else round(base_usd * (mun_rate / 100.0), 2)
    mun_bs = round(mun_usd * rate_bcv, 2)
    
    total_bs = round(p.amount_usd * rate_bcv, 2)
    tax_bs = round((p.tax_amount_usd or (p.amount_usd - base_usd)) * rate_bcv, 2)

    meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"]
    mes_nombre = meses[v_date.month - 1]

    # Domicilio o teléfono del proveedor
    prov_address = "CLLE 64. SECTOR TIERRA NEGRA. MARACAIBO, EDO. ZULIA." if "GANDALF" in p.supplier_name.upper() else "ZONA INDUSTRIAL EL TIGRE, GUACARA, EDO. CARABOBO"
    prov_phone = "0261-2009662" if "GANDALF" in p.supplier_name.upper() else "0245-5648911"

    profile = CompanyProfileService.get_profile(db)

    return {
        "success": True,
        "voucher": {
            "voucher_number": v_num,
            "period": {
                "year": v_date.year,
                "month": mes_nombre,
                "day": v_date.day
            },
            "legal_base": "Reglamento y Ordenanza sobre Actividades Económicas de Industria, Comercio, Servicios o de Índole Similar del Municipio Guacara, Estado Carabobo.",
            "legal_article": "Articulo 24: Los Agentes de retencion estan obligados a entregar a los contribuyentes, un comprobante por cada retencion de impuesto que les practiquen en el cual se indique, entre otra informacion, el monto de lo pagado o abonado en cuenta y la cantidad retenida (...)",
            "agent": {
                "name": profile.get("legal_name"),
                "rif": profile.get("rif"),
                "address": profile.get("fiscal_address"),
                "email": profile.get("email"),
                "phone": profile.get("phone")
            },
            "supplier": {
                "name": p.supplier_name,
                "rif": p.supplier_rif or "J-00000000-0",
                "address": prov_address,
                "phone": prov_phone
            },
            "invoice": {
                "invoice_date": p.issue_date.strftime("%d/%m/%Y") if p.issue_date else v_date.strftime("%d/%m/%Y"),
                "invoice_number": p.invoice_number or f"FAC-{p.id}",
                "control_number": p.control_number or p.invoice_number or f"00-{p.id}",
                "total_bs": total_bs,
                "total_usd": p.amount_usd,
                "base_bs": base_bs,
                "base_usd": base_usd,
                "tax_bs": tax_bs,
                "tax_usd": p.tax_amount_usd or round(p.amount_usd - base_usd, 2)
            },
            "withholding": {
                "base_bs": base_bs,
                "rate_pct": mun_rate,
                "amount_bs": mun_bs,
                "amount_usd": mun_usd,
                "exchange_rate": rate_bcv
            }
        }
    }
