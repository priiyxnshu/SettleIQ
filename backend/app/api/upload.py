from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.ingestion import UploadResponse
from app.services.ingestion_service import IngestionService

router = APIRouter()

@router.post(
    "/upload",
    response_model=UploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and validate financial datasets (payments, settlements, fees)"
)
async def upload_financial_data(
    payments_file: UploadFile = File(..., description="Payments CSV file"),
    settlements_file: UploadFile = File(..., description="Settlements CSV file"),
    fees_file: UploadFile = File(..., description="Fees CSV file"),
    db: Session = Depends(get_db)
):
    # Read files into memory
    try:
        pay_bytes = await payments_file.read()
        set_bytes = await settlements_file.read()
        fee_bytes = await fees_file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading uploaded files: {str(e)}"
        )

    return IngestionService.process_uploads(
        db=db,
        payments_bytes=pay_bytes,
        payments_filename=payments_file.filename or "payments.csv",
        settlements_bytes=set_bytes,
        settlements_filename=settlements_file.filename or "settlements.csv",
        fees_bytes=fee_bytes,
        fees_filename=fees_file.filename or "fees.csv"
    )
