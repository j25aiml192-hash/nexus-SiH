import os
import sys
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Add backend directory to sys.path for db imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from db.supabase_client import supabase
except Exception as e:
    supabase = None
    print(f"Supabase client import notice: {e}")

FEATURES = [
    "fraud_type_risk",
    "log_amount",
    "hour",
    "day_of_week",
    "phone_prefix_risk",
    "bank_risk",
    "mule_chain_depth",
    "transaction_velocity",
]


def load_data_from_supabase():
    """
    Fetches real training data from Supabase DB by joining complaints
    and mule_chain_nodes tables on complaint_id.
    """
    if not supabase:
        print("Supabase client not initialized. Falling back to synthetic generator.")
        return None

    try:
        print("Fetching complaints and mule chain relationships from Supabase...")
        complaints_res = supabase.table("complaints").select("*").execute()
        mules_res = supabase.table("mule_chain_nodes").select("*").execute()

        if not complaints_res.data:
            print("No complaints found in Supabase DB.")
            return None

        df_complaints = pd.DataFrame(complaints_res.data)
        
        # Calculate mule chain depth and max transaction velocity per complaint
        if mules_res.data:
            df_mules = pd.DataFrame(mules_res.data)
            mule_stats = (
                df_mules.groupby("complaint_id")
                .agg(
                    mule_chain_depth=("id", "count"),
                    transaction_velocity=("transaction_velocity", "max")
                )
                .reset_index()
            )
            df = pd.merge(df_complaints, mule_stats, on="complaint_id", how="left")
        else:
            df = df_complaints
            df["mule_chain_depth"] = 0
            df["transaction_velocity"] = 0

        df["mule_chain_depth"] = df["mule_chain_depth"].fillna(0).astype(int)
        df["transaction_velocity"] = df["transaction_velocity"].fillna(0).astype(int)

        # Feature Mapping
        fraud_risk_map = {
            "digital_arrest": 0.90,
            "investment": 0.75,
            "upi": 0.65,
            "loan": 0.55,
            "phishing": 0.45,
        }
        df["fraud_type_risk"] = df["fraud_type"].map(fraud_risk_map).fillna(0.50)
        df["log_amount"] = np.log1p(df["amount"].astype(float))

        if "filed_at" in df.columns:
            filed_dt = pd.to_datetime(df["filed_at"], errors="coerce")
            df["hour"] = filed_dt.dt.hour.fillna(12).astype(int)
            df["day_of_week"] = filed_dt.dt.dayofweek.fillna(0).astype(int)
        else:
            df["hour"] = 12
            df["day_of_week"] = 0

        df["phone_prefix_risk"] = 0.50
        df["bank_risk"] = 0.50

        # Target label based on status or risk threshold
        if "status" in df.columns:
            df["target"] = df["status"].isin(["flagged", "alerted", "intercepted"]).astype(int)
        else:
            df["target"] = 0

        print(f"Successfully constructed feature matrix from {len(df)} database records.")
        return df[FEATURES + ["target"]]

    except Exception as err:
        print(f"Error fetching from Supabase DB: {err}. Falling back to synthetic generator.")
        return None


def genData(n=5000):
    rng = np.random.default_rng(42)

    fraud_types = rng.choice(
        [
            "upi",
            "digital_arrest",
            "investment",
            "loan",
            "phishing",
        ],
        size=n,
        p=[
            0.35,
            0.15,
            0.20,
            0.15,
            0.15,
        ],
    )

    fraud_type_risk = np.select(
        [
            fraud_types == "digital_arrest",
            fraud_types == "investment",
            fraud_types == "upi",
            fraud_types == "loan",
            fraud_types == "phishing",
        ],
        [
            0.90,
            0.75,
            0.65,
            0.55,
            0.45,
        ],
    )

    amounts = np.zeros(n)

    masks = {
        "upi": fraud_types == "upi",
        "digital_arrest": fraud_types == "digital_arrest",
        "investment": fraud_types == "investment",
        "loan": fraud_types == "loan",
        "phishing": fraud_types == "phishing",
    }

    amounts[masks["upi"]] = rng.lognormal(
        mean=np.log(15_000),
        sigma=0.8,
        size=masks["upi"].sum(),
    )

    amounts[masks["digital_arrest"]] = rng.lognormal(
        mean=np.log(150_000),
        sigma=0.9,
        size=masks["digital_arrest"].sum(),
    )

    amounts[masks["investment"]] = rng.lognormal(
        mean=np.log(100_000),
        sigma=1.0,
        size=masks["investment"].sum(),
    )

    amounts[masks["loan"]] = rng.lognormal(
        mean=np.log(30_000),
        sigma=0.8,
        size=masks["loan"].sum(),
    )

    amounts[masks["phishing"]] = rng.lognormal(
        mean=np.log(20_000),
        sigma=0.9,
        size=masks["phishing"].sum(),
    )
    amounts = np.clip(amounts, 1_000, 2_000_000)

    log_amount = np.log1p(amounts)
    time_hours = np.zeros(n, dtype=int)
    upi_idx = np.where(masks["upi"])[0]
    time_hours[upi_idx] = rng.choice(
        np.arange(24),
        size=len(upi_idx),
        p=np.array([
            0.015, 0.012, 0.010, 0.010, 0.012, 0.015,
            0.025, 0.035, 0.045, 0.045, 0.040, 0.040,
            0.040, 0.040, 0.040, 0.045, 0.050, 0.060,
            0.075, 0.085, 0.095, 0.095, 0.085, 0.071
        ])
        / np.sum([
            0.015, 0.012, 0.010, 0.010, 0.012, 0.015,
            0.025, 0.035, 0.045, 0.045, 0.040, 0.040,
            0.040, 0.040, 0.040, 0.045, 0.050, 0.060,
            0.075, 0.085, 0.095, 0.095, 0.085, 0.071
        ])
    )

    digital_idx = np.where(masks["digital_arrest"])[0]
    time_hours[digital_idx] = rng.choice(
        np.arange(24),
        size=len(digital_idx),
        p=np.array([
            0.025, 0.025, 0.025, 0.025, 0.025, 0.025,
            0.025, 0.025, 0.035, 0.040, 0.045, 0.045,
            0.045, 0.045, 0.045, 0.045, 0.050, 0.055,
            0.065, 0.075, 0.085, 0.085, 0.075, 0.065
        ])
        / np.sum([
            0.025, 0.025, 0.025, 0.025, 0.025, 0.025,
            0.025, 0.025, 0.035, 0.040, 0.045, 0.045,
            0.045, 0.045, 0.045, 0.045, 0.050, 0.055,
            0.065, 0.075, 0.085, 0.085, 0.075, 0.065
        ])
    )

    other_idx = np.where(
        ~(masks["upi"] | masks["digital_arrest"])
    )[0]

    time_hours[other_idx] = rng.choice(
        np.arange(24),
        size=len(other_idx),
        p=np.array([
            0.02, 0.015, 0.01, 0.01, 0.01, 0.015,
            0.025, 0.04, 0.06, 0.065, 0.065, 0.06,
            0.06, 0.06, 0.06, 0.06, 0.065, 0.07,
            0.07, 0.065, 0.055, 0.045, 0.035, 0.025
        ])
        / np.sum([
            0.02, 0.015, 0.01, 0.01, 0.01, 0.015,
            0.025, 0.04, 0.06, 0.065, 0.065, 0.06,
            0.06, 0.06, 0.06, 0.06, 0.065, 0.07,
            0.07, 0.065, 0.055, 0.045, 0.035, 0.025
        ])
    )

    day_of_week = rng.integers(0, 7, size=n)

    phone_prefix_risk = np.zeros(n)

    for fraud_type, mask in masks.items():
        if fraud_type == "digital_arrest":
            choices = [0.2, 0.4, 0.6, 0.85]
            probs = [0.10, 0.20, 0.30, 0.40]
        elif fraud_type == "investment":
            choices = [0.2, 0.4, 0.6, 0.85]
            probs = [0.15, 0.20, 0.30, 0.35]
        elif fraud_type == "upi":
            choices = [0.2, 0.4, 0.6, 0.85]
            probs = [0.25, 0.30, 0.25, 0.20]
        else:
            choices = [0.2, 0.4, 0.6, 0.85]
            probs = [0.35, 0.30, 0.20, 0.15]

        phone_prefix_risk[mask] = rng.choice(
            choices,
            size=mask.sum(),
            p=probs,
        )

    bank_risk = (
        0.35
        + 0.25 * phone_prefix_risk
        + 0.15 * (fraud_type_risk)
        + rng.normal(0, 0.12, n)
    )
    bank_risk = np.clip(bank_risk, 0.05, 0.95)

    mule_lambda = np.select(
        [
            masks["digital_arrest"],
            masks["investment"],
            masks["upi"],
            masks["loan"],
            masks["phishing"],
        ],
        [
            3.5,
            3.0,
            2.0,
            1.5,
            1.5,
        ],
    )

    mule_chain_depth = rng.poisson(mule_lambda)
    mule_chain_depth = np.clip(mule_chain_depth, 0, 6)

    velocity_lambda = (
        2
        + 5 * fraud_type_risk
        + 2 * mule_chain_depth
        + 3 * phone_prefix_risk
    )

    transaction_velocity = rng.poisson(velocity_lambda)
    transaction_velocity = np.clip(transaction_velocity, 0, 60)

    night_risk = np.where(
        (time_hours >= 22) | (time_hours <= 5),
        0.85,
        0.20,
    )

    amount_risk = np.clip(
        log_amount / np.log1p(500_000),
        0,
        1,
    )

    risk_score = (
        0.20 * fraud_type_risk
        + 0.12 * night_risk
        + 0.15 * phone_prefix_risk
        + 0.12 * bank_risk
        + 0.16 * amount_risk
        + 0.12 * np.clip(mule_chain_depth / 6, 0, 1)
        + 0.13 * np.clip(transaction_velocity / 60, 0, 1)
    )

    risk_score += rng.normal(0, 0.025, n)
    risk_score = np.clip(risk_score, 0, 1)

    target = (risk_score >= 0.55).astype(int)

    return pd.DataFrame({
        "fraud_type_risk": fraud_type_risk,
        "log_amount": log_amount,
        "hour": time_hours,
        "day_of_week": day_of_week,
        "phone_prefix_risk": phone_prefix_risk,
        "bank_risk": bank_risk,
        "mule_chain_depth": mule_chain_depth,
        "transaction_velocity": transaction_velocity,
        "target": target,
    })


def train():
    print("Loading data for model training...")

    # Attempt to load relational data from Supabase
    df = load_data_from_supabase()

    if df is None or len(df) < 10:
        print("Using synthetic dataset for training baseline model...")
        df = genData(5000)

    print(df.head(5))

    X = df[FEATURES]
    y = df["target"]

    print(f"\nTotal Dataset Size: {len(df)} samples")
    print(f"High-Risk Target (1): {y.sum()}")
    print(f"Low-Risk Target (0): {(y == 0).sum()}")

    stratify_col = y if len(np.unique(y)) > 1 else None

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=stratify_col,
    )

    print("\nTraining XGBoost model...")
    model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    print("\nClassification Report:")
    print(classification_report(y_test, predictions))

    model_path = os.path.join(
        os.path.dirname(__file__),
        "model.pkl",
    )

    joblib.dump(model, model_path)
    print(f"\nModel saved successfully to:\n{model_path}")


if __name__ == "__main__":
    train()

