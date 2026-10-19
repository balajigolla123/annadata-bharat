"""
Integration and Verification Test for PyMongo & ML Backend.
Tests all four required features:
1. Save farm details
2. Recommendation history retrieval
3. Farmer profile registration and login
4. ML prediction (multi-model with version tracking and fallback)
"""

import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.database import (
    MongoManager,
    register_farmer,
    login_farmer,
    get_farmer_profile,
    save_farm_details,
    get_farmer_farms,
    get_latest_farm,
    save_ml_prediction,
    get_farmer_predictions,
    save_recommendation_history,
    get_farmer_history,
    get_recommendation_by_id,
)
from backend.ml_service import MultiModelMLEngine

def run_tests():
    print("=" * 60)
    print("🧪 Running PyMongo & ML Integration Tests")
    print("=" * 60)

    # 1. Test PyMongo Connection
    print("\n[TEST 1] Testing PyMongo MongoDB Connection...")
    mgr = MongoManager()
    health = mgr.check_health()
    assert health.get("connected") is True, f"Failed to connect to MongoDB: {health}"
    print(f"✅ PyMongo connected successfully to database: {health.get('database')}")
    print(f"   Existing collections: {health.get('collections')}")

    test_phone = "9988776655"
    test_name = "Test Farmer Ramesh"
    test_pincode = "500081"

    # 2. Test Feature 3: Farmer Profile Registration & Login
    print("\n[TEST 2] Testing Feature 3: Farmer Profile (Registration & Login)...")
    reg_res = register_farmer(test_name, test_phone, test_pincode)
    assert reg_res["success"] is True, f"Registration failed: {reg_res}"
    print(f"✅ Farmer registered/synced in MongoDB: {reg_res['user']['name']} ({reg_res['user']['phone']})")

    login_res = login_farmer(test_phone)
    assert login_res is not None, "Login failed: user not found"
    assert login_res["phone"] == test_phone, "Phone mismatch"
    print(f"✅ Farmer login verified. Last login timestamp updated: {login_res['last_login']}")

    profile = get_farmer_profile(test_phone)
    assert profile["name"] == test_name, "Profile name mismatch"
    print(f"✅ Profile retrieved from MongoDB: {profile['name']}, Pincode: {profile['pincode']}")

    # 3. Test Feature 1: Save Farm Details
    print("\n[TEST 3] Testing Feature 1: Save Farm Details (Crop, Area, Soil Type, Sowing Date)...")
    farm = save_farm_details(
        farmer_phone=test_phone,
        crop="wheat",
        area=3.5,
        soil_type="alluvial",
        soil_texture="loamy",
        sowing_date="2026-11-10",
        soil_test={"n": 220, "p": 45, "k": 110, "ph": 6.8}
    )
    assert farm.get("id") is not None, "Farm details not assigned an ID"
    assert farm["crop"] == "wheat"
    assert farm["area"] == 3.5
    assert farm["soil_type"] == "alluvial"
    assert farm["sowing_date"] == "2026-11-10"
    print(f"✅ Farm details saved in MongoDB: ID={farm['id']}, Crop={farm['crop']}, Area={farm['area']} ha, Soil={farm['soil_type']}")

    latest_farm = get_latest_farm(test_phone)
    assert latest_farm["crop"] == "wheat"
    print(f"✅ Retrieved latest farm details from MongoDB for {test_phone}")

    farms_list = get_farmer_farms(test_phone)
    assert len(farms_list) >= 1
    print(f"✅ Farmer has {len(farms_list)} farm record(s) in MongoDB")

    # 4. Test Feature 4: ML Prediction (Multi-model & Fallback)
    print("\n[TEST 4] Testing Feature 4: ML Prediction (Model Versioning & Fallback)...")
    ml_engine = MultiModelMLEngine()

    # Test Model 1: Random Forest
    rf_pred = ml_engine.predict_yield(
        crop="wheat",
        area=3.5,
        soil_type="alluvial",
        soil_texture="loamy",
        sowing_date="2026-11-10",
        n=220, p=45, k=110, ph=6.8,
        requested_model="random_forest"
    )
    print(f"✅ Model 1 ({rf_pred['model_name']} - {rf_pred['model_version']}):")
    print(f"   Yield: {rf_pred['predicted_yield_t_ha']} t/ha | Total: {rf_pred['total_expected_yield_tons']} tons | Conf: {rf_pred['confidence_score']}")

    # Test Model 2: Gradient Boosting
    gb_pred = ml_engine.predict_yield(
        crop="wheat",
        area=3.5,
        soil_type="alluvial",
        soil_texture="loamy",
        sowing_date="2026-11-10",
        n=220, p=45, k=110, ph=6.8,
        requested_model="gradient_boosting"
    )
    print(f"✅ Model 2 ({gb_pred['model_name']} - {gb_pred['model_version']}):")
    print(f"   Yield: {gb_pred['predicted_yield_t_ha']} t/ha | Total: {gb_pred['total_expected_yield_tons']} tons")

    # Test Model 3: Decision Tree
    dt_pred = ml_engine.predict_yield(
        crop="wheat",
        area=3.5,
        soil_type="alluvial",
        soil_texture="loamy",
        sowing_date="2026-11-10",
        requested_model="decision_tree"
    )
    print(f"✅ Model 3 ({dt_pred['model_name']} - {dt_pred['model_version']}):")
    print(f"   Yield: {dt_pred['predicted_yield_t_ha']} t/ha | Total: {dt_pred['total_expected_yield_tons']} tons")

    # Test Model Fallback: Request invalid/broken model -> auto fallback to another model
    fallback_pred = ml_engine.predict_yield(
        crop="wheat",
        area=3.5,
        soil_type="alluvial",
        soil_texture="loamy",
        sowing_date="2026-11-10",
        requested_model="non_existent_deep_network"
    )
    assert fallback_pred["fallback_used"] is True, "Fallback should be marked as used"
    print(f"✅ Fallback Mechanism Verified! Requested 'non_existent_deep_network' -> Gracefully used '{fallback_pred['model_name']}' ({fallback_pred['model_version']})")

    # Save ML Prediction to MongoDB
    pred_record = save_ml_prediction(
        farmer_phone=test_phone,
        crop="wheat",
        area=3.5,
        soil_type="alluvial",
        model_name=rf_pred["model_name"],
        model_version=rf_pred["model_version"],
        predicted_yield_t_ha=rf_pred["predicted_yield_t_ha"],
        total_expected_yield_tons=rf_pred["total_expected_yield_tons"],
        confidence_score=rf_pred["confidence_score"],
        features_used=rf_pred["features_used"],
        fallback_used=rf_pred["fallback_used"]
    )
    assert pred_record.get("id") is not None
    print(f"✅ ML prediction record saved to MongoDB with version '{pred_record['model_version']}' (ID: {pred_record['id']})")

    pred_history = get_farmer_predictions(test_phone)
    assert len(pred_history) >= 1
    print(f"✅ Retrieved {len(pred_history)} prediction record(s) from MongoDB for analysis")

    # 5. Test Feature 2: Recommendation History
    print("\n[TEST 5] Testing Feature 2: Recommendation History...")
    rec_record = save_recommendation_history(
        farmer_phone=test_phone,
        farmer_name=test_name,
        farm_details={
            "crop": "wheat",
            "area": 3.5,
            "soil_type": "alluvial",
            "sowing_date": "2026-11-10"
        },
        recommended_npk={"N": 120, "P": 60, "K": 40},
        seed_requirement={"rate_kg_ha": 100, "total_kg": 350, "variety": "HD 2967, PBW 343"},
        ml_prediction={
            "model_name": rf_pred["model_name"],
            "model_version": rf_pred["model_version"],
            "predicted_yield_t_ha": rf_pred["predicted_yield_t_ha"],
            "total_expected_yield_tons": rf_pred["total_expected_yield_tons"]
        },
        fertilizer_schedule={
            "basal": {"urea_kg": 75, "dap_kg": 130, "mop_kg": 65},
            "first_split": {"urea_kg": 95}
        },
        irrigation_plan={"total_litres_per_day": 70000, "frequency_days": 7},
        icar_ref="ICAR Wheat Package of Practices"
    )
    rec_id = rec_record.get("id")
    assert rec_id is not None, "Failed to save recommendation history"
    print(f"✅ Recommendation calculation saved in MongoDB: Calculation ID = {rec_id}")

    # Retrieve history
    history = get_farmer_history(test_phone)
    assert len(history) >= 1, "No history returned"
    print(f"✅ Retrieved calculation history for farmer: {len(history)} record(s) found")

    # Retrieve single record by ID
    single_rec = get_recommendation_by_id(rec_id)
    assert single_rec is not None
    assert single_rec["farm_details"]["crop"] == "wheat"
    print(f"✅ Retrieved calculation details by ID {rec_id}: Crop={single_rec['farm_details']['crop']}, ICAR Ref={single_rec['icar_ref']}")

    print("\n" + "=" * 60)
    print("🎉 ALL 4 FEATURES TESTED & FULLY FUNCTIONAL WITH PYMONGO & MONGODB!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
