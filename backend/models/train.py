import os
import numpy as np
import pandas as pd
import joblib
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

FEATURES = [
    "fraud_type_risk",
    "log_amount",
    "hour",
    "day_of_week",
    "phone_prefix_risk",
    "bank_risk",
    "mule_chain_depth",
    "transaction_velocity",
    "prior_flags",
    "victim_accused_distance",
]

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
    amounts = rng.lognormal(
        mean=np.log(25000),
        sigma=1.2,
        size=n,
    )
    log_amount = np.log1p(amounts)
    time_hours = rng.integers(0, 24, size=n)
    day_of_week = rng.integers(0, 7, size=n)
    phone_prefix_risk = rng.choice(
        [0.2, 0.4, 0.6, 0.85],
        size=n,
        p=[0.35, 0.25, 0.20, 0.20],
    )
    bank_risk = rng.uniform(
        0.1,
        0.9,
        size=n,
    )
    
    mule_chain_depth = rng.integers(
        0,
        6,
        size=n,
    )

    transaction_velocity = rng.poisson(
        lam=4,
        size=n,
    )

    prior_flags = rng.poisson(
        lam=1.5,
        size=n,
    )
    
    victim_accused_distance = rng.uniform(
        1,
        1500,
        size=n,
    )

    night_risk = np.where(
        (time_hours >= 22) | (time_hours <= 5),
        0.8,
        0.2,
    )

    risk_score = (
        0.20 * fraud_type_risk
        + 0.15 * night_risk
        + 0.12 * phone_prefix_risk
        + 0.10 * bank_risk
        + 0.10 * np.clip(log_amount / 12, 0, 1)
        + 0.10 * np.clip(mule_chain_depth / 5, 0, 1)
        + 0.10 * np.clip(transaction_velocity / 15, 0, 1)
        + 0.08 * np.clip(prior_flags / 5, 0, 1)
        + 0.05 * np.clip(
            victim_accused_distance / 1500,
            0,
            1,
        )
    )
    target = (risk_score >= 0.65).astype(int)

    return pd.DataFrame({
        "fraud_type_risk": fraud_type_risk,
        "log_amount": log_amount,
        "hour": time_hours,
        "day_of_week": day_of_week,
        "phone_prefix_risk": phone_prefix_risk,
        "bank_risk": bank_risk,
        "mule_chain_depth": mule_chain_depth,
        "transaction_velocity": transaction_velocity,
        "prior_flags": prior_flags,
        "victim_accused_distance": victim_accused_distance,
        "target": target,
    })


def train():
    print("Generating synthetic data...")

    df = genData(5000)

    print(df.head(5))

    X = df[FEATURES]
    y = df["target"]

    print(f"Generated {len(df)} complaints")
    print(f"High-risk complaints: {y.sum()}")
    print(f"Low-risk complaints: {(y == 0).sum()}")

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )

    print("\nTraining XGBoost...")

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

    print("\nModel results:")
    print(classification_report(y_test, predictions))
    print(os.path.join(
        os.path.dirname(__file__),
        "model.pkl",
    ))
    # Save model next to train.py
    model_path = os.path.join(
        os.path.dirname(__file__),
        "model.pkl",
    )

    joblib.dump(model, model_path)

    print(f"\nModel saved to:")
    print(model_path)


if __name__ == "__main__":
    train()
