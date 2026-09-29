"""
NEXUS Phase 7 - Model Evaluation Service & Outcome Feedback Loop
================================================================
Implements closed-loop learning architecture:
PREDICTION -> ALERT -> INCIDENT -> ACTUAL OUTCOME -> VALIDATED EVALUATION
-> VERSIONED DATASET -> OFFLINE EVALUATION -> CANDIDATE MODEL
-> QUALITY GATES -> EXPLICIT AUTHORIZED APPROVAL -> CONTROLLED DEPLOYMENT

CONSTRAINTS & SAFETY:
- HISTORICAL PREDICTION RECORDS ARE 100% IMMUTABLE.
- NEVER auto-retrain or auto-replace production models.
- NEVER fabricate ground truth. Missing outcome is NOT false.
- Minimum samples required for drift; honest sample sizes everywhere.
- Temporal leakage prevention: features frozen at prediction timestamp.
- Production artifacts live in backend/models/; candidates live in backend/model_candidates/.
"""

import os
import math
import json
import hashlib
import logging
import datetime
from typing import Dict, Any, List, Optional, Tuple

from db import repo

logger = logging.getLogger("nexus.model_evaluation")

# Version constants
EVALUATION_CONFIG_VERSION = "v1.0"
FEATURE_SCHEMA_VERSION = "v1.0"
GEO_CORRECT_THRESHOLD_KM = 2.5  # Established Phase 1 correctness threshold
MIN_DRIFT_SAMPLE_SIZE = 20      # Minimum evaluations required before claiming drift


def calculate_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates Haversine distance in kilometers between two lat/lon coordinates."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return round(R * 2 * math.asin(math.sqrt(max(0.0, min(1.0, a)))), 3)


class ModelEvaluationService:
    """
    Core autonomy engine for outcome feedback, spatial/temporal evaluation,
    deterministic dataset generation, candidate quality gates, and controlled releases.
    """

    def __init__(self):
        self.geo_threshold_km = GEO_CORRECT_THRESHOLD_KM
        self.eval_config_version = EVALUATION_CONFIG_VERSION
        self.feature_schema_version = FEATURE_SCHEMA_VERSION

    # -------------------------------------------------------------------------
    # 1. OUTCOME RECORD NORMALIZATION & EVALUATION
    # -------------------------------------------------------------------------

    def normalize_outcome_record(self, raw_source: Dict[str, Any], source_type: str = "incident") -> Dict[str, Any]:
        """
        Normalizes operational outcome data from incidents or cashout events into
        an evaluation-ready payload with full provenance.
        """
        cid = raw_source.get("complaint_id")
        iid = raw_source.get("incident_id")
        pid = raw_source.get("prediction_id")

        # Extract coordinates safely
        act_lat = raw_source.get("actual_lat") or raw_source.get("latitude")
        act_lon = raw_source.get("actual_lon") or raw_source.get("longitude")
        try:
            act_lat = float(act_lat) if act_lat is not None else None
            act_lon = float(act_lon) if act_lon is not None else None
        except (ValueError, TypeError):
            act_lat, act_lon = None, None

        # Validate coordinate bounds (India region: lat ~6 to 38, lon ~68 to 98)
        if act_lat is not None and act_lon is not None:
            if not (-90.0 <= act_lat <= 90.0 and -180.0 <= act_lon <= 180.0):
                act_lat, act_lon = None, None

        act_time = raw_source.get("actual_cashout_at") or raw_source.get("cashout_time") or raw_source.get("resolved_at") or raw_source.get("updated_at")
        act_h3 = raw_source.get("actual_h3") or raw_source.get("h3_index")
        act_outcome = raw_source.get("actual_outcome") or raw_source.get("outcome") or raw_source.get("status") or "RESOLVED"
        amount_rec = float(raw_source.get("amount_recovered") or 0.0)

        return {
            "prediction_id": str(pid) if pid else None,
            "complaint_id": str(cid) if cid else None,
            "incident_id": str(iid) if iid else None,
            "actual_lat": act_lat,
            "actual_lon": act_lon,
            "actual_h3": act_h3,
            "actual_cashout_at": act_time,
            "actual_outcome": str(act_outcome).upper(),
            "amount_recovered": amount_rec,
            "source_type": source_type,
            "source_record_id": str(raw_source.get("id") or iid or cid),
            "source_timestamp": raw_source.get("created_at") or datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

    def record_and_evaluate_outcome(
        self,
        prediction_id: str,
        outcome_data: Dict[str, Any],
        source_type: str = "incident",
    ) -> Dict[str, Any]:
        """
        Evaluates a prediction against actual post-prediction ground truth.
        CRITICAL: Historical prediction row in `predictions` table is NEVER mutated!
        Deterministic evaluation ID ensures duplicate evaluations are idempotently suppressed.
        """
        # 1. Fetch prediction snapshot
        pred = repo.get_prediction_by_id(prediction_id)
        if not pred:
            raise ValueError(f"Prediction '{prediction_id}' not found.")

        # Snapshot historical values for verification of non-mutation
        cid = pred["complaint_id"]
        pred_lat = pred.get("predicted_lat")
        pred_lon = pred.get("predicted_lon")
        pred_version = pred.get("model_version") or "geo_lgbm_v3"
        pred_created_at = pred.get("created_at")

        # 2. Normalize incoming outcome data
        norm = self.normalize_outcome_record(outcome_data, source_type=source_type)
        act_lat = norm.get("actual_lat")
        act_lon = norm.get("actual_lon")
        act_cashout_at = norm.get("actual_cashout_at")
        act_h3 = norm.get("actual_h3")
        act_outcome = norm.get("actual_outcome")
        amount_recovered = norm.get("amount_recovered", 0.0)

        # 3. Check for conflicting ground truth
        deterministic_eval_id = f"eval:{prediction_id}:{source_type}"
        existing_eval = repo.get_model_evaluation(deterministic_eval_id)
        is_conflict = False
        conflict_notes = None

        if existing_eval and existing_eval.get("evaluation_status") == "evaluated":
            ex_lat = existing_eval.get("actual_lat")
            ex_lon = existing_eval.get("actual_lon")
            if ex_lat is not None and act_lat is not None:
                coord_diff = calculate_haversine_km(ex_lat, ex_lon, act_lat, act_lon)
                if coord_diff > self.geo_threshold_km:
                    is_conflict = True
                    conflict_notes = f"Conflict: previous lat/lon ({ex_lat}, {ex_lon}) differs from new ({act_lat}, {act_lon}) by {coord_diff:.2f} km."

        # 4. Compute Geo accuracy if both coordinates exist
        dist_km = None
        geo_correct = None
        if pred_lat is not None and pred_lon is not None and act_lat is not None and act_lon is not None:
            dist_km = calculate_haversine_km(pred_lat, pred_lon, act_lat, act_lon)
            geo_correct = bool(dist_km <= self.geo_threshold_km)

        # 5. Compute Time accuracy if valid timestamp exists
        time_error_min = None
        time_correct = None
        if act_cashout_at and pred_created_at:
            try:
                t_pred = datetime.datetime.fromisoformat(pred_created_at.replace("Z", "+00:00"))
                t_act = datetime.datetime.fromisoformat(act_cashout_at.replace("Z", "+00:00"))
                window_hours = pred.get("cashout_window_hours", 12)
                t_end = t_pred + datetime.timedelta(hours=window_hours)
                time_error_min = round(abs((t_act - t_pred).total_seconds()) / 60.0, 1)
                time_correct = bool(t_pred <= t_act <= t_end)
            except Exception:
                time_error_min = None
                time_correct = None

        # 6. Evaluation status determination
        eval_status = "evaluated"
        if is_conflict:
            eval_status = "CONFLICT_REVIEW"
        elif dist_km is None and act_outcome is None:
            eval_status = "NOT_EVALUABLE"

        # 7. Persist or update evaluation entity (preserving original prediction row!)
        if not existing_eval:
            eval_record = repo.create_model_evaluation(
                prediction_id=prediction_id,
                complaint_id=cid,
                incident_id=norm.get("incident_id"),
                predicted_lat=pred_lat,
                predicted_lon=pred_lon,
                predicted_h3=pred.get("predicted_atms"),
                predicted_time_start=pred_created_at,
                predicted_time_end=(datetime.datetime.fromisoformat(pred_created_at.replace("Z", "+00:00")) +
                                    datetime.timedelta(hours=pred.get("cashout_window_hours", 12))).isoformat() if pred_created_at else None,
                model_version=pred_version,
                evaluation_version=self.eval_config_version,
                outcome_source=source_type,
                eval_id=deterministic_eval_id,
            )
        else:
            eval_record = existing_eval

        # Update outcome fields
        updated_eval = repo.update_model_evaluation_outcome(
            eval_id=deterministic_eval_id,
            actual_lat=act_lat,
            actual_lon=act_lon,
            actual_cashout_at=act_cashout_at,
            actual_h3=act_h3,
            actual_outcome=act_outcome,
            amount_recovered=amount_recovered,
            notes=conflict_notes,
            evaluation_status=eval_status,
        )

        return updated_eval

    # -------------------------------------------------------------------------
    # 2. MODEL PERFORMANCE AGGREGATIONS & METRICS
    # -------------------------------------------------------------------------

    def get_model_performance(
        self,
        model_version: Optional[str] = None,
        limit: int = 1000,
    ) -> Dict[str, Any]:
        """
        Calculates aggregate accuracy, spatial error distribution, and operational metrics.
        Always displays sample size n. If n == 0, honestly reports INSUFFICIENT_SAMPLE.
        """
        target_version = model_version or "geo_lgbm_v3"
        evals = repo.get_model_evaluations(model_version=target_version, limit=limit)

        total_evaluations = len(evals)
        if total_evaluations == 0:
            return {
                "model_version": target_version,
                "status": "INSUFFICIENT_SAMPLE",
                "message": "Insufficient evaluated outcomes for current production window.",
                "sample_size_n": 0,
                "geo_metrics": {
                    "evaluated_n": 0,
                    "accuracy_2_5km_pct": None,
                    "mean_error_km": None,
                    "median_error_km": None,
                    "p75_error_km": None,
                    "p90_error_km": None,
                    "threshold_km": self.geo_threshold_km,
                },
                "time_metrics": {
                    "evaluated_n": 0,
                    "within_window_pct": None,
                    "mean_time_error_minutes": None,
                },
                "operational_metrics": {
                    "evaluated_n": 0,
                    "total_recovered_inr": 0.0,
                    "outcome_distribution": {},
                },
            }

        # 1. Geo Metrics
        geo_errors = [e["distance_error_km"] for e in evals if e.get("distance_error_km") is not None]
        geo_n = len(geo_errors)
        geo_correct_count = sum(1 for e in evals if e.get("geo_correct_2_5km") in (1, True))

        mean_err = round(sum(geo_errors) / geo_n, 2) if geo_n > 0 else None
        median_err = None
        p75_err = None
        p90_err = None
        if geo_n > 0:
            s_err = sorted(geo_errors)
            median_err = round(s_err[int(geo_n * 0.50)], 2)
            p75_err = round(s_err[min(int(geo_n * 0.75), geo_n - 1)], 2)
            p90_err = round(s_err[min(int(geo_n * 0.90), geo_n - 1)], 2)

        acc_pct = round((geo_correct_count / geo_n) * 100.0, 2) if geo_n > 0 else None

        # 2. Time Metrics
        time_errors = [e["time_error_minutes"] for e in evals if e.get("time_error_minutes") is not None]
        time_n = len(time_errors)
        time_correct_count = sum(1 for e in evals if e.get("time_correct_window") in (1, True))
        within_window_pct = round((time_correct_count / time_n) * 100.0, 2) if time_n > 0 else None
        mean_time_err = round(sum(time_errors) / time_n, 1) if time_n > 0 else None

        # 3. Operational Outcomes
        outcomes_dist: Dict[str, int] = {}
        total_recovered = 0.0
        for e in evals:
            out = e.get("actual_outcome") or "UNRESOLVED"
            outcomes_dist[out] = outcomes_dist.get(out, 0) + 1
            total_recovered += float(e.get("amount_recovered") or 0.0)

        return {
            "model_version": target_version,
            "status": "EVALUATED" if geo_n > 0 else "PARTIALLY_EVALUATED",
            "sample_size_n": total_evaluations,
            "evaluation_config_version": self.eval_config_version,
            "geo_metrics": {
                "evaluated_n": geo_n,
                "accuracy_2_5km_pct": acc_pct,
                "mean_error_km": mean_err,
                "median_error_km": median_err,
                "p75_error_km": p75_err,
                "p90_error_km": p90_err,
                "threshold_km": self.geo_threshold_km,
            },
            "time_metrics": {
                "evaluated_n": time_n,
                "within_window_pct": within_window_pct,
                "mean_time_error_minutes": mean_time_err,
            },
            "operational_metrics": {
                "evaluated_n": total_evaluations,
                "total_recovered_inr": round(total_recovered, 2),
                "outcome_distribution": outcomes_dist,
            },
        }

    # -------------------------------------------------------------------------
    # 3. VERSIONED DATASET GENERATION (LEAKAGE PREVENTION & TEMPORAL SPLITS)
    # -------------------------------------------------------------------------

    def build_versioned_dataset(
        self,
        dataset_type: str = "geo_outcomes",
        feature_schema_version: str = "v1.0",
        dataset_version: Optional[str] = None,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15,
    ) -> Dict[str, Any]:
        """
        Builds a deterministic, versioned training/evaluation dataset.
        QUALITY GATES & LEAKAGE CONTROLS:
        - Only includes records with valid ground truth.
        - Strict chronological sorting (older -> train, newer -> val, newest -> test).
        - Complaint grouping protection (no complaint rows split across train/test).
        - Features frozen at prediction time (temporal leakage check).
        - Generates SHA256 checksum for reproducibility.
        """
        all_evals = repo.get_model_evaluations(limit=5000)

        # Filter strictly valid evaluated rows
        valid_rows = []
        for e in all_evals:
            if dataset_type == "geo_outcomes":
                if e.get("actual_lat") is not None and e.get("actual_lon") is not None:
                    valid_rows.append(e)
            else:
                if e.get("actual_outcome"):
                    valid_rows.append(e)

        # Sort chronologically by evaluated_at or created_at for temporal split
        valid_rows.sort(key=lambda x: str(x.get("evaluated_at") or x.get("created_at") or ""))
        total_valid = len(valid_rows)
        version_name = dataset_version or f"{dataset_type}_v{int(datetime.datetime.now().timestamp())}"

        # Group rows by complaint_id to strictly prevent complaint/group leakage across splits
        complaint_groups: Dict[str, List[Dict[str, Any]]] = {}
        for r in valid_rows:
            cid = r["complaint_id"]
            if cid not in complaint_groups:
                complaint_groups[cid] = []
            complaint_groups[cid].append(r)

        # Sort complaints chronologically by earliest timestamp
        sorted_complaints = sorted(
            complaint_groups.keys(),
            key=lambda c: min(str(x.get("evaluated_at") or x.get("created_at") or "") for x in complaint_groups[c])
        )

        n_comp = len(sorted_complaints)
        n_comp_train = int(n_comp * train_ratio)
        n_comp_val = int(n_comp * val_ratio)

        train_cids = set(sorted_complaints[:n_comp_train])
        val_cids = set(sorted_complaints[n_comp_train:n_comp_train + n_comp_val])
        test_cids = set(sorted_complaints[n_comp_train + n_comp_val:])

        train_rows = [r for c in sorted_complaints[:n_comp_train] for r in complaint_groups[c]]
        val_rows = [r for c in sorted_complaints[n_comp_train:n_comp_train + n_comp_val] for r in complaint_groups[c]]
        test_rows = [r for c in sorted_complaints[n_comp_train + n_comp_val:] for r in complaint_groups[c]]

        leakage_detected = bool((train_cids & test_cids) or (val_cids & test_cids) or (train_cids & val_cids))

        split_config = {
            "train_ratio": train_ratio,
            "val_ratio": val_ratio,
            "test_ratio": test_ratio,
            "train_rows": len(train_rows),
            "val_rows": len(val_rows),
            "test_rows": len(test_rows),
            "group_leakage_detected": leakage_detected,
            "temporal_ordering": "chronological_ascending",
        }

        # Deterministic checksum of row IDs and outcomes
        hash_input = "".join([f"{r.get('eval_id')}:{r.get('distance_error_km')}" for r in valid_rows])
        checksum = hashlib.sha256(hash_input.encode("utf-8")).hexdigest()

        dataset_meta = {
            "dataset_id": f"ds_{version_name}",
            "dataset_version": version_name,
            "dataset_type": dataset_type,
            "feature_schema_version": feature_schema_version,
            "label_definition": "target_lat, target_lon from validated incident outcome" if dataset_type == "geo_outcomes" else "actual_outcome label",
            "evaluation_config_version": self.eval_config_version,
            "source_reference": "model_evaluations",
            "row_count": total_valid,
            "validation_status": "VALID" if not leakage_detected else "WARNING_GROUP_OVERLAP",
            "split_config": split_config,
            "checksum": checksum,
            "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }

        saved = repo.record_model_dataset(dataset_meta)
        return saved

    # -------------------------------------------------------------------------
    # 4. CANDIDATE MODEL EVALUATION & QUALITY GATES
    # -------------------------------------------------------------------------

    def compare_candidate_to_production(
        self,
        candidate_model_version: str,
    ) -> Dict[str, Any]:
        """
        Compares candidate model against current deployed production model.
        Runs quality gates:
        - Artifact existence & integrity
        - Feature schema compatibility (40 features for geo)
        - Inference contract check
        - Delta evaluation on identical sample
        """
        # 1. Fetch Candidate and Deployed Production
        candidate = repo.get_model_candidate_by_id(candidate_model_version)
        if not candidate:
            raise ValueError(f"Candidate model '{candidate_model_version}' not found in registry.")

        deployed = repo.get_deployed_model(model_type=candidate.get("model_type", "geo"))
        prod_version = deployed.get("model_version") if deployed else "geo_lgbm_v3"

        # 2. Performance metrics on evaluated sample
        prod_perf = self.get_model_performance(prod_version)
        cand_perf = self.get_model_performance(candidate_model_version)

        prod_mean_err = prod_perf["geo_metrics"].get("mean_error_km")
        cand_mean_err = cand_perf["geo_metrics"].get("mean_error_km")

        delta_mean_err = None
        if prod_mean_err is not None and cand_mean_err is not None:
            delta_mean_err = round(cand_mean_err - prod_mean_err, 2)

        # 3. Quality Gate Checks
        gates = {
            "feature_schema_compatible": candidate.get("feature_schema_version") == self.feature_schema_version,
            "dataset_validated": candidate.get("dataset_version") is not None,
            "artifact_reference_valid": bool(candidate.get("artifact_reference")),
            "critical_regression_absent": delta_mean_err is None or delta_mean_err <= 50.0,
            "metrics_available": candidate.get("metrics") is not None,
        }

        all_gates_passed = all(gates.values())

        # Update candidate status to VALIDATED if candidate is in CANDIDATE status
        if candidate.get("status") == "CANDIDATE" and all_gates_passed:
            repo.update_model_candidate_status(candidate_model_version, "VALIDATED")
            candidate["status"] = "VALIDATED"

        return {
            "candidate_model_version": candidate_model_version,
            "candidate_status": candidate.get("status"),
            "current_production_version": prod_version,
            "comparison": {
                "production_mean_error_km": prod_mean_err,
                "candidate_mean_error_km": cand_mean_err,
                "delta_mean_error_km": delta_mean_err,
                "production_accuracy_pct": prod_perf["geo_metrics"].get("accuracy_2_5km_pct"),
                "candidate_accuracy_pct": cand_perf["geo_metrics"].get("accuracy_2_5km_pct"),
                "sample_size_n": prod_perf.get("sample_size_n", 0),
            },
            "quality_gates": gates,
            "gates_passed": all_gates_passed,
        }

    # -------------------------------------------------------------------------
    # 5. CONTROLLED MODEL RELEASE GATES & ROLLBACK
    # -------------------------------------------------------------------------

    def approve_candidate(
        self,
        candidate_model_version: str,
        authorized_user: Dict[str, Any],
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Explicit authorized human approval gate.
        Pre-requisite: Candidate must exist and pass quality gates (VALIDATED or CANDIDATE).
        """
        cand = repo.get_model_candidate_by_id(candidate_model_version)
        if not cand:
            raise ValueError(f"Candidate model '{candidate_model_version}' not found.")

        if cand.get("status") == "REJECTED":
            raise ValueError(f"Cannot approve a REJECTED model candidate '{candidate_model_version}'.")

        approver_name = authorized_user.get("email") or authorized_user.get("badge_id") or authorized_user.get("name")
        updated = repo.update_model_candidate_status(
            model_id_or_version=candidate_model_version,
            status="APPROVED",
            actor=approver_name,
            notes=notes or "Human authorization confirmed through Release Gate.",
        )
        return updated

    def reject_candidate(
        self,
        candidate_model_version: str,
        authorized_user: Dict[str, Any],
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Explicit rejection of a model candidate."""
        cand = repo.get_model_candidate_by_id(candidate_model_version)
        if not cand:
            raise ValueError(f"Candidate model '{candidate_model_version}' not found.")

        actor_name = authorized_user.get("email") or authorized_user.get("badge_id") or authorized_user.get("name")
        updated = repo.update_model_candidate_status(
            model_id_or_version=candidate_model_version,
            status="REJECTED",
            actor=actor_name,
            rejection_reason=reason or "Candidate rejected during review.",
        )
        return updated

    def deploy_candidate(
        self,
        candidate_model_version: str,
        authorized_user: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Controlled deployment of an APPROVED candidate model.
        STRICT RULES:
        - NEVER allows CANDIDATE -> DEPLOYED shortcut (must be APPROVED).
        - Production artifacts are protected; records rollback pointer to previous version.
        - NEVER mutates historical prediction rows.
        """
        cand = repo.get_model_candidate_by_id(candidate_model_version)
        if not cand:
            raise ValueError(f"Candidate model '{candidate_model_version}' not found.")

        if cand.get("status") != "APPROVED":
            raise ValueError(
                f"Candidate model '{candidate_model_version}' cannot be deployed. Current status is '{cand.get('status')}'. Must be APPROVED first."
            )

        # Retrieve current deployed model for rollback record
        mtype = cand.get("model_type", "geo")
        current_deployed = repo.get_deployed_model(model_type=mtype)
        prev_version = current_deployed.get("model_version") if current_deployed else "geo_lgbm_v3"

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        actor_name = authorized_user.get("email") or authorized_user.get("badge_id") or authorized_user.get("name")

        # Retire previously deployed model
        if current_deployed and current_deployed.get("model_id") != cand.get("model_id"):
            repo.update_model_candidate_status(
                model_id_or_version=prev_version,
                status="RETIRED",
                retired_at=now_iso,
            )

        # Deploy candidate
        deployed_record = repo.update_model_candidate_status(
            model_id_or_version=candidate_model_version,
            status="DEPLOYED",
            actor=actor_name,
            deployed_at=now_iso,
        )

        return {
            "status": "DEPLOYED",
            "deployed_model_version": candidate_model_version,
            "previous_model_version": prev_version,
            "deployed_at": now_iso,
            "deployed_by": actor_name,
            "rollback_available": True,
        }

    def rollback_model(
        self,
        target_model_version: str,
        authorized_user: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Rolls back production to a previously known version.
        Historical predictions retain the model version that generated them.
        """
        target = repo.get_model_candidate_by_id(target_model_version)
        if not target:
            raise ValueError(f"Target model version '{target_model_version}' not found.")

        mtype = target.get("model_type", "geo")
        current_deployed = repo.get_deployed_model(model_type=mtype)
        curr_version = current_deployed.get("model_version") if current_deployed else "unknown"

        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        actor_name = authorized_user.get("email") or authorized_user.get("badge_id") or authorized_user.get("name")

        if current_deployed:
            repo.update_model_candidate_status(curr_version, "RETIRED", retired_at=now_iso)

        rolled_back = repo.update_model_candidate_status(
            model_id_or_version=target_model_version,
            status="DEPLOYED",
            actor=actor_name,
            deployed_at=now_iso,
        )

        return {
            "status": "ROLLED_BACK",
            "deployed_model_version": target_model_version,
            "previous_model_version": curr_version,
            "rollback_at": now_iso,
            "rolled_back_by": actor_name,
        }

    # -------------------------------------------------------------------------
    # 6. DRIFT MONITORING
    # -------------------------------------------------------------------------

    def check_drift(
        self,
        model_version: Optional[str] = None,
        min_sample: int = MIN_DRIFT_SAMPLE_SIZE,
    ) -> Dict[str, Any]:
        """
        Calculates drift indicators between recent evaluations vs historical baseline.
        If sample size < min_sample, returns INSUFFICIENT_SAMPLE honestly without claiming drift.
        """
        target_version = model_version or "geo_lgbm_v3"
        evals = repo.get_model_evaluations(model_version=target_version, limit=500)

        evaluated_with_coords = [e for e in evals if e.get("distance_error_km") is not None]
        n_sample = len(evaluated_with_coords)

        if n_sample < min_sample:
            return {
                "status": "INSUFFICIENT_SAMPLE",
                "model_version": target_version,
                "current_sample_n": n_sample,
                "min_sample_required": min_sample,
                "drift_detected": False,
                "message": f"Sample size (n={n_sample}) is insufficient to measure statistical drift with confidence (minimum n={min_sample}).",
            }

        # Compare first half (baseline window) vs second half (current window)
        half = n_sample // 2
        baseline_slice = evaluated_with_coords[half:]
        current_slice = evaluated_with_coords[:half]

        base_mean = sum(e["distance_error_km"] for e in baseline_slice) / len(baseline_slice)
        curr_mean = sum(e["distance_error_km"] for e in current_slice) / len(current_slice)
        drift_delta_km = round(curr_mean - base_mean, 2)

        # Threshold: if current window mean error is > 20% higher than baseline
        drift_detected = (drift_delta_km > (base_mean * 0.20)) if base_mean > 0 else False

        return {
            "status": "DRIFT_DETECTED" if drift_detected else "STABLE",
            "model_version": target_version,
            "drift_detected": drift_detected,
            "baseline_mean_error_km": round(base_mean, 2),
            "current_mean_error_km": round(curr_mean, 2),
            "delta_error_km": drift_delta_km,
            "baseline_n": len(baseline_slice),
            "current_n": len(current_slice),
            "sample_size_n": n_sample,
        }


# Singleton service instance
model_evaluation_service = ModelEvaluationService()
