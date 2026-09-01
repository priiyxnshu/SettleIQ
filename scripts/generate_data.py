import os
import csv
import random
import argparse
from datetime import datetime, timedelta
from pathlib import Path

def generate_dataset(target_dir: str, num_records: int, distribution: dict, seed: int = 42):
    random.seed(seed)
    
    out_path = Path(target_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    
    payments = []
    settlements = []
    fees = []
    ground_truth = []
    
    start_date = datetime(2026, 8, 1, 9, 0, 0)
    
    pay_id_counter = 10001
    ord_id_counter = 50001
    set_id_counter = 70001
    fee_id_counter = 90001
    cust_id_counter = 8001
    batch_id_counter = 101

    categories = []
    for cat, count in distribution.items():
        categories.extend([cat] * count)
    
    # Pad or trim if distribution sum doesn't match num_records
    if len(categories) < num_records:
        categories.extend(["NORMAL"] * (num_records - len(categories)))
    elif len(categories) > num_records:
        categories = categories[:num_records]
        
    random.shuffle(categories)

    for i, category in enumerate(categories):
        pay_id = f"PAY_{pay_id_counter}"
        ord_id = f"ORD_{ord_id_counter}"
        cust_id = f"CUST_{cust_id_counter}"
        batch_id = f"BATCH_{batch_id_counter + (i % 10)}"
        
        # Incremental timestamps
        pay_time = start_date + timedelta(hours=i * 2, minutes=random.randint(5, 45))
        fee_time = pay_time + timedelta(seconds=random.randint(1, 60))
        set_time = pay_time + timedelta(days=random.randint(1, 3), hours=random.randint(1, 6))
        
        pay_id_counter += 1
        ord_id_counter += 1
        cust_id_counter += 1
        
        # Base realistic payment amount
        base_amount = random.choice([
            500.0, 1000.0, 1500.0, 2000.0, 2500.0, 3000.0, 4500.0, 5000.0,
            6800.0, 7500.0, 8500.0, 10000.0, 12500.0, 15000.0, 20000.0, 25000.0, 50000.0
        ])
        
        fee_rate = 0.02  # 2% standard processing fee
        fee_amt = round(base_amount * fee_rate, 2)
        expected_settlement = round(base_amount - fee_amt, 2)
        
        if category == "NORMAL":
            payments.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "payment_amount": f"{base_amount:.2f}",
                "payment_date": pay_time.strftime("%Y-%m-%d %H:%M:%S"),
                "payment_status": "SUCCESS",
                "customer_reference": cust_id
            })
            settlements.append({
                "settlement_id": f"SET_{set_id_counter}",
                "payment_id": pay_id,
                "settlement_amount": f"{expected_settlement:.2f}",
                "settlement_date": set_time.strftime("%Y-%m-%d %H:%M:%S"),
                "settlement_status": "SETTLED",
                "settlement_reference": f"SR_{random.randint(10000, 99999)}",
                "settlement_batch_id": batch_id
            })
            set_id_counter += 1
            fees.append({
                "fee_id": f"FEE_{fee_id_counter}",
                "payment_id": pay_id,
                "fee_amount": f"{fee_amt:.2f}",
                "fee_type": "PROCESSING_FEE",
                "fee_date": fee_time.strftime("%Y-%m-%d %H:%M:%S")
            })
            fee_id_counter += 1
            ground_truth.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "expected_status": "MATCHED",
                "expected_exception_type": "None",
                "expected_action": "AUTO_RESOLVE",
                "expected_root_cause": "STANDARD_SETTLEMENT",
                "notes": "Standard match: payment equals settlement plus processing fee"
            })

        elif category == "AMOUNT_MISMATCH":
            discrepancy = random.choice([50.0, 100.0, 150.0, 250.0, 300.0])
            actual_settlement = round(expected_settlement - discrepancy, 2)
            
            payments.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "payment_amount": f"{base_amount:.2f}",
                "payment_date": pay_time.strftime("%Y-%m-%d %H:%M:%S"),
                "payment_status": "SUCCESS",
                "customer_reference": cust_id
            })
            settlements.append({
                "settlement_id": f"SET_{set_id_counter}",
                "payment_id": pay_id,
                "settlement_amount": f"{actual_settlement:.2f}",
                "settlement_date": set_time.strftime("%Y-%m-%d %H:%M:%S"),
                "settlement_status": "SETTLED",
                "settlement_reference": f"SR_{random.randint(10000, 99999)}",
                "settlement_batch_id": batch_id
            })
            set_id_counter += 1
            fees.append({
                "fee_id": f"FEE_{fee_id_counter}",
                "payment_id": pay_id,
                "fee_amount": f"{fee_amt:.2f}",
                "fee_type": "PROCESSING_FEE",
                "fee_date": fee_time.strftime("%Y-%m-%d %H:%M:%S")
            })
            fee_id_counter += 1
            ground_truth.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "expected_status": "EXCEPTION",
                "expected_exception_type": "AMOUNT_MISMATCH",
                "expected_action": "HUMAN_REVIEW",
                "expected_root_cause": "UNEXPLAINED_AMOUNT_DIFFERENCE",
                "notes": f"Settlement amount is {discrepancy:.2f} lower than expected after fees"
            })

        elif category == "MISSING_SETTLEMENT":
            payments.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "payment_amount": f"{base_amount:.2f}",
                "payment_date": pay_time.strftime("%Y-%m-%d %H:%M:%S"),
                "payment_status": "SUCCESS",
                "customer_reference": cust_id
            })
            # No settlement generated
            fees.append({
                "fee_id": f"FEE_{fee_id_counter}",
                "payment_id": pay_id,
                "fee_amount": f"{fee_amt:.2f}",
                "fee_type": "PROCESSING_FEE",
                "fee_date": fee_time.strftime("%Y-%m-%d %H:%M:%S")
            })
            fee_id_counter += 1
            ground_truth.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "expected_status": "EXCEPTION",
                "expected_exception_type": "MISSING_SETTLEMENT",
                "expected_action": "HUMAN_REVIEW",
                "expected_root_cause": "UNSETTLED_TRANSACTION",
                "notes": "Payment exists in payments.csv but has no settlement record in settlements.csv"
            })

        elif category == "DUPLICATE":
            payments.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "payment_amount": f"{base_amount:.2f}",
                "payment_date": pay_time.strftime("%Y-%m-%d %H:%M:%S"),
                "payment_status": "SUCCESS",
                "customer_reference": cust_id
            })
            # Primary settlement
            settlements.append({
                "settlement_id": f"SET_{set_id_counter}",
                "payment_id": pay_id,
                "settlement_amount": f"{expected_settlement:.2f}",
                "settlement_date": set_time.strftime("%Y-%m-%d %H:%M:%S"),
                "settlement_status": "SETTLED",
                "settlement_reference": f"SR_{random.randint(10000, 99999)}",
                "settlement_batch_id": batch_id
            })
            set_id_counter += 1
            # Duplicate settlement
            settlements.append({
                "settlement_id": f"SET_{set_id_counter}",
                "payment_id": pay_id,
                "settlement_amount": f"{expected_settlement:.2f}",
                "settlement_date": (set_time + timedelta(hours=1)).strftime("%Y-%m-%d %H:%M:%S"),
                "settlement_status": "SETTLED",
                "settlement_reference": f"SR_{random.randint(10000, 99999)}",
                "settlement_batch_id": batch_id
            })
            set_id_counter += 1
            fees.append({
                "fee_id": f"FEE_{fee_id_counter}",
                "payment_id": pay_id,
                "fee_amount": f"{fee_amt:.2f}",
                "fee_type": "PROCESSING_FEE",
                "fee_date": fee_time.strftime("%Y-%m-%d %H:%M:%S")
            })
            fee_id_counter += 1
            ground_truth.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "expected_status": "EXCEPTION",
                "expected_exception_type": "DUPLICATE",
                "expected_action": "HUMAN_REVIEW",
                "expected_root_cause": "DUPLICATE_SETTLEMENT_RECORD",
                "notes": "Multiple settlement records exist for single payment ID"
            })

        elif category == "REFERENCE_MISMATCH":
            mismatched_pay_ref = f"PAY_REF_{pay_id[4:]}_ALT"
            payments.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "payment_amount": f"{base_amount:.2f}",
                "payment_date": pay_time.strftime("%Y-%m-%d %H:%M:%S"),
                "payment_status": "SUCCESS",
                "customer_reference": cust_id
            })
            settlements.append({
                "settlement_id": f"SET_{set_id_counter}",
                "payment_id": mismatched_pay_ref,
                "settlement_amount": f"{expected_settlement:.2f}",
                "settlement_date": set_time.strftime("%Y-%m-%d %H:%M:%S"),
                "settlement_status": "SETTLED",
                "settlement_reference": f"SR_{ord_id}",
                "settlement_batch_id": batch_id
            })
            set_id_counter += 1
            fees.append({
                "fee_id": f"FEE_{fee_id_counter}",
                "payment_id": pay_id,
                "fee_amount": f"{fee_amt:.2f}",
                "fee_type": "PROCESSING_FEE",
                "fee_date": fee_time.strftime("%Y-%m-%d %H:%M:%S")
            })
            fee_id_counter += 1
            ground_truth.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "expected_status": "EXCEPTION",
                "expected_exception_type": "REFERENCE_MISMATCH",
                "expected_action": "HUMAN_REVIEW",
                "expected_root_cause": "REFERENCE_MISMATCH_DETECTED",
                "notes": "Payment ID altered in settlement record, but order reference and amount correspond"
            })

        elif category == "UNKNOWN":
            payments.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "payment_amount": f"{base_amount:.2f}",
                "payment_date": pay_time.strftime("%Y-%m-%d %H:%M:%S"),
                "payment_status": "SUCCESS",
                "customer_reference": cust_id
            })
            # Ambiguous condition: unexpected status or anomalous settlement amount exceeding payment
            settlements.append({
                "settlement_id": f"SET_{set_id_counter}",
                "payment_id": pay_id,
                "settlement_amount": f"{(base_amount * 1.5):.2f}",
                "settlement_date": set_time.strftime("%Y-%m-%d %H:%M:%S"),
                "settlement_status": "PENDING",
                "settlement_reference": f"SR_CORRUPT_{random.randint(10000, 99999)}",
                "settlement_batch_id": batch_id
            })
            set_id_counter += 1
            fees.append({
                "fee_id": f"FEE_{fee_id_counter}",
                "payment_id": pay_id,
                "fee_amount": f"-{fee_amt:.2f}",  # Negative fee anomaly
                "fee_type": "PROCESSING_FEE",
                "fee_date": fee_time.strftime("%Y-%m-%d %H:%M:%S")
            })
            fee_id_counter += 1
            ground_truth.append({
                "payment_id": pay_id,
                "order_id": ord_id,
                "expected_status": "EXCEPTION",
                "expected_exception_type": "UNKNOWN",
                "expected_action": "HUMAN_REVIEW",
                "expected_root_cause": "AMBIGUOUS_ANOMALY",
                "notes": "Ambiguous financial state: negative fee and settlement amount exceeds payment"
            })

    # Write CSVs
    def write_csv(filepath, fieldnames, data):
        with open(filepath, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)

    write_csv(
        out_path / "payments.csv",
        ["payment_id", "order_id", "payment_amount", "payment_date", "payment_status", "customer_reference"],
        payments
    )
    write_csv(
        out_path / "settlements.csv",
        ["settlement_id", "payment_id", "settlement_amount", "settlement_date", "settlement_status", "settlement_reference", "settlement_batch_id"],
        settlements
    )
    write_csv(
        out_path / "fees.csv",
        ["fee_id", "payment_id", "fee_amount", "fee_type", "fee_date"],
        fees
    )
    write_csv(
        out_path / "ground_truth.csv",
        ["payment_id", "order_id", "expected_status", "expected_exception_type", "expected_action", "expected_root_cause", "notes"],
        ground_truth
    )

    print(f"Generated {len(payments)} payments in {target_dir}")
    print(f"  - Settlements: {len(settlements)}")
    print(f"  - Fees: {len(fees)}")
    print(f"  - Ground Truth rows: {len(ground_truth)}")


def main():
    parser = argparse.ArgumentParser(description="Deterministic Synthetic Data Generator for SettleIQ")
    parser.add_argument("--target", choices=["development", "evaluation", "demo", "all"], default="all")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    project_root = Path(__file__).resolve().parent.parent

    # Configurations matching 03_DATA_SPEC.md
    configs = {
        "development": {
            "dir": project_root / "data" / "development",
            "count": 50,
            "distribution": {
                "NORMAL": 30,
                "AMOUNT_MISMATCH": 5,
                "MISSING_SETTLEMENT": 5,
                "DUPLICATE": 3,
                "REFERENCE_MISMATCH": 3,
                "UNKNOWN": 4
            }
        },
        "evaluation": {
            "dir": project_root / "data" / "evaluation",
            "count": 200,
            "distribution": {
                "NORMAL": 130,
                "AMOUNT_MISMATCH": 20,
                "MISSING_SETTLEMENT": 15,
                "DUPLICATE": 10,
                "REFERENCE_MISMATCH": 10,
                "UNKNOWN": 15
            }
        },
        "demo": {
            "dir": project_root / "data" / "demo",
            "count": 100,
            "distribution": {
                "NORMAL": 65,
                "AMOUNT_MISMATCH": 10,
                "MISSING_SETTLEMENT": 8,
                "DUPLICATE": 5,
                "REFERENCE_MISMATCH": 5,
                "UNKNOWN": 7
            }
        }
    }

    targets = ["development", "evaluation", "demo"] if args.target == "all" else [args.target]

    for target in targets:
        cfg = configs[target]
        print(f"\n--- Generating {target.upper()} dataset ---")
        generate_dataset(
            target_dir=str(cfg["dir"]),
            num_records=cfg["count"],
            distribution=cfg["distribution"],
            seed=args.seed
        )

if __name__ == "__main__":
    main()
