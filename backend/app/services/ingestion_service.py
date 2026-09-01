import io
import csv
import json
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models import (
    ReconciliationRun,
    Upload,
    PaymentRecord,
    SettlementRecord,
    FeeRecord,
    AuditLog,
    UploadFileType,
    UploadStatus,
    RunStatus,
    AuditAction,
)
from app.schemas.ingestion import UploadResponse, FileSummary, ValidationErrorDetail

PAYMENTS_REQUIRED_HEADERS = {"payment_id", "order_id", "payment_amount", "payment_date", "payment_status", "customer_reference"}
SETTLEMENTS_REQUIRED_HEADERS = {"settlement_id", "payment_id", "settlement_amount", "settlement_date", "settlement_status", "settlement_reference", "settlement_batch_id"}
FEES_REQUIRED_HEADERS = {"fee_id", "payment_id", "fee_amount", "fee_type", "fee_date"}

def parse_date(date_str: str) -> Optional[datetime]:
    if not date_str or not date_str.strip():
        return None
    cleaned = date_str.strip()
    formats = [
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d",
        "%Y/%m/%d %H:%M:%S",
        "%d-%m-%Y %H:%M:%S",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(cleaned)
    except Exception:
        return None

def parse_decimal(val_str: str) -> Optional[Decimal]:
    if not val_str or not val_str.strip():
        return None
    cleaned = val_str.strip().replace("$", "").replace("₹", "").replace(",", "")
    try:
        return Decimal(cleaned)
    except InvalidOperation:
        return None

def decode_csv_bytes(file_bytes: bytes, filename: str) -> Tuple[List[str], List[Dict[str, str]]]:
    try:
        # Handle UTF-8 and UTF-8 with BOM
        text = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = file_bytes.decode("latin-1")
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Could not decode file '{filename}': {str(e)}"
            )
    
    stream = io.StringIO(text.strip())
    reader = csv.DictReader(stream)
    if not reader.fieldnames:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File '{filename}' appears to be empty or missing header row."
        )
    fieldnames = [f.strip() for f in reader.fieldnames if f]
    rows = list(reader)
    return fieldnames, rows

class IngestionService:
    @staticmethod
    def process_uploads(
        db: Session,
        payments_bytes: bytes,
        payments_filename: str,
        settlements_bytes: bytes,
        settlements_filename: str,
        fees_bytes: bytes,
        fees_filename: str,
        user_id: Optional[str] = None
    ) -> UploadResponse:
        errors: List[ValidationErrorDetail] = []
        
        # 1. Parse and validate headers
        pay_headers, pay_rows = decode_csv_bytes(payments_bytes, payments_filename)
        set_headers, set_rows = decode_csv_bytes(settlements_bytes, settlements_filename)
        fee_headers, fee_rows = decode_csv_bytes(fees_bytes, fees_filename)

        # Check required headers
        missing_pay_headers = PAYMENTS_REQUIRED_HEADERS - set(pay_headers)
        if missing_pay_headers:
            errors.append(ValidationErrorDetail(
                file_name=payments_filename,
                message=f"Missing required columns in payments CSV: {', '.join(sorted(missing_pay_headers))}"
            ))

        missing_set_headers = SETTLEMENTS_REQUIRED_HEADERS - set(set_headers)
        if missing_set_headers:
            errors.append(ValidationErrorDetail(
                file_name=settlements_filename,
                message=f"Missing required columns in settlements CSV: {', '.join(sorted(missing_set_headers))}"
            ))

        missing_fee_headers = FEES_REQUIRED_HEADERS - set(fee_headers)
        if missing_fee_headers:
            errors.append(ValidationErrorDetail(
                file_name=fees_filename,
                message=f"Missing required columns in fees CSV: {', '.join(sorted(missing_fee_headers))}"
            ))

        if errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "CSV header validation failed",
                    "errors": [e.model_dump() for e in errors]
                }
            )

        # 2. Initialize Reconciliation Run
        run = ReconciliationRun(
            created_by=user_id,
            status=RunStatus.CREATED,
            started_at=datetime.now(timezone.utc)
        )
        db.add(run)
        db.flush()

        # 3. Process Payments
        payment_records: List[PaymentRecord] = []
        for idx, row in enumerate(pay_rows, start=2):
            pay_id = (row.get("payment_id") or "").strip()
            if not pay_id:
                errors.append(ValidationErrorDetail(
                    file_name=payments_filename,
                    row_number=idx,
                    field="payment_id",
                    message="Missing required payment_id"
                ))
                continue

            amount = parse_decimal(row.get("payment_amount", ""))
            if amount is None:
                errors.append(ValidationErrorDetail(
                    file_name=payments_filename,
                    row_number=idx,
                    field="payment_amount",
                    message=f"Invalid payment amount '{row.get('payment_amount')}'"
                ))
                continue

            pay_date = parse_date(row.get("payment_date", ""))
            
            payment_records.append(PaymentRecord(
                reconciliation_run_id=run.id,
                payment_id=pay_id,
                order_id=(row.get("order_id") or "").strip() or None,
                payment_amount=amount,
                payment_date=pay_date,
                payment_status=(row.get("payment_status") or "SUCCESS").strip(),
                customer_reference=(row.get("customer_reference") or "").strip() or None,
                currency="INR",
                raw_data=json.dumps(row)
            ))

        # 4. Process Settlements (Preserving all records including potential duplicates)
        settlement_records: List[SettlementRecord] = []
        for idx, row in enumerate(set_rows, start=2):
            set_id = (row.get("settlement_id") or "").strip()
            if not set_id:
                errors.append(ValidationErrorDetail(
                    file_name=settlements_filename,
                    row_number=idx,
                    field="settlement_id",
                    message="Missing required settlement_id"
                ))
                continue

            amount = parse_decimal(row.get("settlement_amount", ""))
            if amount is None:
                errors.append(ValidationErrorDetail(
                    file_name=settlements_filename,
                    row_number=idx,
                    field="settlement_amount",
                    message=f"Invalid settlement amount '{row.get('settlement_amount')}'"
                ))
                continue

            set_date = parse_date(row.get("settlement_date", ""))
            
            settlement_records.append(SettlementRecord(
                reconciliation_run_id=run.id,
                settlement_id=set_id,
                payment_id=(row.get("payment_id") or "").strip() or None,
                settlement_amount=amount,
                settlement_date=set_date,
                settlement_status=(row.get("settlement_status") or "SETTLED").strip(),
                settlement_reference=(row.get("settlement_reference") or "").strip() or None,
                settlement_batch_id=(row.get("settlement_batch_id") or "").strip() or None,
                currency="INR",
                raw_data=json.dumps(row)
            ))

        # 5. Process Fees
        fee_records: List[FeeRecord] = []
        for idx, row in enumerate(fee_rows, start=2):
            fee_id = (row.get("fee_id") or "").strip()
            if not fee_id:
                errors.append(ValidationErrorDetail(
                    file_name=fees_filename,
                    row_number=idx,
                    field="fee_id",
                    message="Missing required fee_id"
                ))
                continue

            amount = parse_decimal(row.get("fee_amount", ""))
            if amount is None:
                errors.append(ValidationErrorDetail(
                    file_name=fees_filename,
                    row_number=idx,
                    field="fee_amount",
                    message=f"Invalid fee amount '{row.get('fee_amount')}'"
                ))
                continue

            fee_date = parse_date(row.get("fee_date", ""))
            
            fee_records.append(FeeRecord(
                reconciliation_run_id=run.id,
                fee_id=fee_id,
                payment_id=(row.get("payment_id") or "").strip() or None,
                fee_amount=amount,
                fee_type=(row.get("fee_type") or "PROCESSING_FEE").strip(),
                fee_date=fee_date,
                raw_data=json.dumps(row)
            ))

        if errors:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={
                    "message": "Data row validation failed",
                    "errors": [e.model_dump() for e in errors]
                }
            )

        # Batch insert all records into SQLite
        db.add_all(payment_records)
        db.add_all(settlement_records)
        db.add_all(fee_records)

        # Record Upload metadata
        uploads = [
            Upload(
                user_id=user_id,
                file_name=payments_filename,
                file_type=UploadFileType.PAYMENTS,
                status=UploadStatus.VALIDATED
            ),
            Upload(
                user_id=user_id,
                file_name=settlements_filename,
                file_type=UploadFileType.SETTLEMENTS,
                status=UploadStatus.VALIDATED
            ),
            Upload(
                user_id=user_id,
                file_name=fees_filename,
                file_type=UploadFileType.FEES,
                status=UploadStatus.VALIDATED
            )
        ]
        db.add_all(uploads)

        # Create Audit Log
        audit = AuditLog(
            user_id=user_id,
            action_type=AuditAction.FILE_UPLOADED,
            entity_type="RECONCILIATION_RUN",
            entity_id=run.id,
            details=json.dumps({
                "payments_count": len(payment_records),
                "settlements_count": len(settlement_records),
                "fees_count": len(fee_records),
                "files": [payments_filename, settlements_filename, fees_filename]
            })
        )
        db.add(audit)
        db.commit()

        return UploadResponse(
            success=True,
            reconciliation_run_id=run.id,
            message="Files successfully uploaded and validated.",
            summary={
                "payments_count": len(payment_records),
                "settlements_count": len(settlement_records),
                "fees_count": len(fee_records)
            },
            files=[
                FileSummary(file_name=payments_filename, record_count=len(payment_records), status="VALIDATED"),
                FileSummary(file_name=settlements_filename, record_count=len(settlement_records), status="VALIDATED"),
                FileSummary(file_name=fees_filename, record_count=len(fee_records), status="VALIDATED"),
            ],
            validation_errors=[]
        )
