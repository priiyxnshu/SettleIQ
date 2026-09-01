import csv
from pathlib import Path
import pytest

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

@pytest.mark.parametrize("dataset_name,expected_payment_count", [
    ("development", 50),
    ("evaluation", 200),
    ("demo", 100)
])
def test_dataset_generation_files_and_counts(dataset_name, expected_payment_count):
    dataset_path = DATA_DIR / dataset_name
    assert dataset_path.exists(), f"Dataset directory {dataset_name} does not exist"

    # Check payments.csv
    pay_file = dataset_path / "payments.csv"
    assert pay_file.exists()
    with open(pay_file, mode="r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
        assert len(reader) == expected_payment_count
        assert set(reader[0].keys()) == {
            "payment_id", "order_id", "payment_amount", "payment_date", "payment_status", "customer_reference"
        }

    # Check settlements.csv
    set_file = dataset_path / "settlements.csv"
    assert set_file.exists()
    with open(set_file, mode="r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
        assert len(reader) > 0
        assert set(reader[0].keys()) == {
            "settlement_id", "payment_id", "settlement_amount", "settlement_date", "settlement_status", "settlement_reference", "settlement_batch_id"
        }

    # Check fees.csv
    fee_file = dataset_path / "fees.csv"
    assert fee_file.exists()
    with open(fee_file, mode="r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
        assert len(reader) == expected_payment_count
        assert set(reader[0].keys()) == {
            "fee_id", "payment_id", "fee_amount", "fee_type", "fee_date"
        }

    # Check ground_truth.csv
    gt_file = dataset_path / "ground_truth.csv"
    assert gt_file.exists()
    with open(gt_file, mode="r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
        assert len(reader) == expected_payment_count
        assert set(reader[0].keys()) == {
            "payment_id", "order_id", "expected_status", "expected_exception_type", "expected_action", "expected_root_cause", "notes"
        }


def test_evaluation_canonical_exception_types():
    gt_file = DATA_DIR / "evaluation" / "ground_truth.csv"
    with open(gt_file, mode="r", encoding="utf-8") as f:
        reader = list(csv.DictReader(f))
    
    exception_types = {row["expected_exception_type"] for row in reader}
    canonical_types = {
        "None",
        "AMOUNT_MISMATCH",
        "MISSING_SETTLEMENT",
        "DUPLICATE",
        "REFERENCE_MISMATCH",
        "UNKNOWN"
    }
    assert exception_types == canonical_types, f"Exception types in ground truth {exception_types} != {canonical_types}"
    
    # Check evaluation distribution counts
    status_counts = {}
    type_counts = {}
    for row in reader:
        status_counts[row["expected_status"]] = status_counts.get(row["expected_status"], 0) + 1
        type_counts[row["expected_exception_type"]] = type_counts.get(row["expected_exception_type"], 0) + 1

    assert status_counts["MATCHED"] == 130
    assert status_counts["EXCEPTION"] == 70
    assert type_counts["AMOUNT_MISMATCH"] == 20
    assert type_counts["MISSING_SETTLEMENT"] == 15
    assert type_counts["DUPLICATE"] == 10
    assert type_counts["REFERENCE_MISMATCH"] == 10
    assert type_counts["UNKNOWN"] == 15
