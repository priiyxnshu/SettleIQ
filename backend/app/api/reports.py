from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.report import ReconciliationReportData
from app.services.report_service import ReportService
from app.reports.pdf_generator import PDFReportGenerator

router = APIRouter()


@router.post(
    "/reports/generate",
    response_model=ReconciliationReportData,
    summary="Generate AI-Assisted Reconciliation Report for active run"
)
def generate_reconciliation_report(
    run_id: Optional[str] = Query(None, description="Reconciliation Run ID (defaults to latest active run)"),
    generated_by: Optional[str] = Query("Yash Jain (Checker)", description="User generating report"),
    db: Session = Depends(get_db)
):
    try:
        return ReportService.get_run_report_data(
            db=db,
            run_id=run_id,
            generated_by=generated_by
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {str(e)}"
        )


@router.get(
    "/reports/{run_id}",
    response_model=ReconciliationReportData,
    summary="Retrieve report data for a specific reconciliation run"
)
def get_report_data(
    run_id: str,
    db: Session = Depends(get_db)
):
    try:
        return ReportService.get_run_report_data(db=db, run_id=run_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get(
    "/reports/{run_id}/pdf",
    summary="Download PDF version of reconciliation report"
)
def download_report_pdf(
    run_id: str,
    db: Session = Depends(get_db)
):
    try:
        report = ReportService.get_run_report_data(db=db, run_id=run_id)
        pdf_bytes = PDFReportGenerator.generate(report)
        filename = f"SettleIQ_Reconciliation_Report_{run_id[:8].upper()}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_bytes))
            }
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF generation failed: {str(e)}"
        )
