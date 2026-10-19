"""
Flask REST API for Annadata Bharat Agriculture Calculator
Integrates MongoDB & PyMongo with scikit-learn ML engine for:
1. Save farm details (crop, area, soil type, sowing date)
2. Recommendation history retrieval & management
3. Farmer profile registration & login persistence
4. ML prediction with model versioning and fallback
"""

import sys
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from .config import SERVER_HOST, SERVER_PORT, DEBUG_MODE, PROJECT_DIR
from .database import (
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
    delete_recommendation,
)
from .ml_service import MultiModelMLEngine

logger = logging.getLogger("AgriApp")
logging.basicConfig(level=logging.INFO)

app = Flask(__name__, static_folder=str(PROJECT_DIR), static_url_path="")
# Enable CORS for all domains so local static files (file://, localhost:5500, etc.) can communicate smoothly
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize PyMongo Connection and ML Engine on startup
db_manager = MongoManager()
ml_engine = MultiModelMLEngine()


# ===================================================================
# FRONTEND STATIC PAGE SERVING & HEALTH ENDPOINTS
# ===================================================================

@app.route("/", methods=["GET"])
def index():
    """Serve the login/home page directly when visiting http://127.0.0.1:5000/"""
    return send_from_directory(str(PROJECT_DIR), "login.html")

@app.route("/<path:filename>", methods=["GET"])
def serve_static_page(filename):
    """Serve HTML, JS, CSS, and asset files."""
    file_path = PROJECT_DIR / filename
    if file_path.exists() and file_path.is_file():
        return send_from_directory(str(PROJECT_DIR), filename)
    return jsonify({"error": "Page or file not found"}), 404

@app.route("/api", methods=["GET"])
def api_info():
    return jsonify({
        "status": "online",
        "service": "Annadata Bharat Agriculture Backend",
        "database": "MongoDB with PyMongo",
        "features": [
            "1. Save Farm Details (crop, area, soil type, sowing date)",
            "2. Recommendation History Retrieval",
            "3. Farmer Profile Registration & Login",
            "4. Multi-Model ML Prediction & Version Tracking"
        ]
    })

@app.route("/api/health", methods=["GET"])
def health_check():
    db_health = db_manager.check_health()
    models = ml_engine.list_models()
    return jsonify({
        "status": "healthy" if db_health.get("connected") else "degraded",
        "mongodb": db_health,
        "ml_models_available": len(models),
        "models": models
    })

@app.route("/api/ml/models", methods=["GET"])
def get_available_models():
    """List all available ML models and their versions."""
    models = ml_engine.list_models()
    return jsonify({
        "success": True,
        "models": models
    })


# ===================================================================
# FEATURE 3: FARMER PROFILE (Registration & Login)
# ===================================================================

@app.route("/api/farmer/register", methods=["POST"])
def api_register_farmer():
    """
    Store a farmer's profile in MongoDB via PyMongo on registration.
    """
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    phone = data.get("phone", "").strip()
    pincode = data.get("pincode", "").strip()

    if not name or not phone or not pincode:
        return jsonify({"success": False, "error": "Name, phone, and pincode are required"}), 400

    if len(phone) != 10 or not phone.isdigit():
        return jsonify({"success": False, "error": "Phone number must be a 10-digit number"}), 400

    try:
        res = register_farmer(name, phone, pincode)
        return jsonify(res)
    except Exception as e:
        logger.error("Error registering farmer: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/farmer/login", methods=["POST"])
def api_login_farmer():
    """
    Authenticate farmer and update last_login timestamp in MongoDB.
    """
    data = request.get_json() or {}
    phone = data.get("phone", "").strip()

    if not phone:
        return jsonify({"success": False, "error": "Phone number is required"}), 400

    try:
        user = login_farmer(phone)
        if not user:
            return jsonify({"success": False, "error": "Farmer not registered. Please create an account."}), 404
        return jsonify({"success": True, "user": user})
    except Exception as e:
        logger.error("Error logging in farmer: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/farmer/profile", methods=["GET"])
def api_get_farmer_profile():
    """Retrieve farmer profile from MongoDB."""
    phone = request.args.get("phone", "").strip()
    if not phone:
        return jsonify({"success": False, "error": "Phone parameter required"}), 400

    try:
        user = get_farmer_profile(phone)
        if not user:
            return jsonify({"success": False, "error": "Farmer not found"}), 404
        return jsonify({"success": True, "profile": user})
    except Exception as e:
        logger.error("Error retrieving profile: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================================
# FEATURE 1: SAVE FARM DETAILS (Crop, Area, Soil Type, Sowing Date)
# ===================================================================

@app.route("/api/farm/save", methods=["POST"])
def api_save_farm_details():
    """
    Store crop, area, soil type, and sowing date in MongoDB.
    """
    data = request.get_json() or {}
    farmer_phone = data.get("farmer_phone", "").strip()
    crop = data.get("crop", "").strip()
    area = data.get("area")
    soil_type = data.get("soil_type", "").strip()
    soil_texture = data.get("soil_texture", "loamy").strip()
    sowing_date = data.get("sowing_date", "").strip()
    soil_test = data.get("soil_test", {})
    farm_name = data.get("farm_name")

    if not farmer_phone or not crop or area is None or not soil_type or not sowing_date:
        return jsonify({
            "success": False,
            "error": "Missing mandatory fields: farmer_phone, crop, area, soil_type, and sowing_date are required"
        }), 400

    try:
        saved_farm = save_farm_details(
            farmer_phone=farmer_phone,
            crop=crop,
            area=float(area),
            soil_type=soil_type,
            soil_texture=soil_texture,
            sowing_date=sowing_date,
            soil_test=soil_test,
            farm_name=farm_name
        )
        return jsonify({"success": True, "farm": saved_farm})
    except Exception as e:
        logger.error("Error saving farm details: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/farm/history", methods=["GET"])
def api_get_farmer_farms():
    """Get all saved farm details for a farmer."""
    phone = request.args.get("phone", "").strip()
    if not phone:
        return jsonify({"success": False, "error": "Phone parameter required"}), 400

    try:
        farms = get_farmer_farms(phone)
        return jsonify({"success": True, "farms": farms})
    except Exception as e:
        logger.error("Error retrieving farms: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/farm/latest", methods=["GET"])
def api_get_latest_farm():
    """Get the most recently saved farm for a farmer."""
    phone = request.args.get("phone", "").strip()
    if not phone:
        return jsonify({"success": False, "error": "Phone parameter required"}), 400

    try:
        farm = get_latest_farm(phone)
        return jsonify({"success": True, "farm": farm})
    except Exception as e:
        logger.error("Error retrieving latest farm: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================================
# FEATURE 4: ML PREDICTION (Save predicted results & model version)
# ===================================================================

@app.route("/api/ml/predict", methods=["POST"])
def api_ml_predict():
    """
    Run ML yield prediction and save prediction result + model version in MongoDB.
    Includes multi-model support and fallback if requested model is unavailable.
    """
    data = request.get_json() or {}
    farmer_phone = data.get("farmer_phone", "guest").strip()
    crop = data.get("crop", "").strip()
    area = data.get("area", 1.0)
    soil_type = data.get("soil_type", "alluvial").strip()
    soil_texture = data.get("soil_texture", "loamy").strip()
    sowing_date = data.get("sowing_date", "")
    requested_model = data.get("model", "random_forest")

    # Optional soil test values
    n = data.get("n")
    p = data.get("p")
    k = data.get("k")
    ph = data.get("ph")

    if not crop:
        return jsonify({"success": False, "error": "Crop is required for prediction"}), 400

    try:
        # Run ML inference with automatic fallback
        prediction_result = ml_engine.predict_yield(
            crop=crop,
            area=float(area),
            soil_type=soil_type,
            soil_texture=soil_texture,
            sowing_date=sowing_date,
            n=n,
            p=p,
            k=k,
            ph=ph,
            requested_model=requested_model
        )

        # Persist prediction in MongoDB via PyMongo
        saved_record = save_ml_prediction(
            farmer_phone=farmer_phone,
            crop=crop,
            area=float(area),
            soil_type=soil_type,
            model_name=prediction_result["model_name"],
            model_version=prediction_result["model_version"],
            predicted_yield_t_ha=prediction_result["predicted_yield_t_ha"],
            total_expected_yield_tons=prediction_result["total_expected_yield_tons"],
            confidence_score=prediction_result["confidence_score"],
            features_used=prediction_result["features_used"],
            fallback_used=prediction_result.get("fallback_used", False)
        )

        return jsonify({
            "success": True,
            "prediction": prediction_result,
            "saved_record_id": saved_record.get("id")
        })
    except Exception as e:
        logger.error("Error during ML prediction: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/ml/predictions", methods=["GET"])
def api_get_predictions():
    """Retrieve saved prediction records for analysis."""
    phone = request.args.get("phone", "").strip()
    if not phone:
        return jsonify({"success": False, "error": "Phone parameter required"}), 400

    try:
        preds = get_farmer_predictions(phone)
        return jsonify({"success": True, "predictions": preds})
    except Exception as e:
        logger.error("Error retrieving predictions: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================================
# FEATURE 2: RECOMMENDATION HISTORY (Retrieve previous calculations)
# ===================================================================

@app.route("/api/recommendations/save", methods=["POST"])
def api_save_recommendation():
    """
    Store full calculation snapshot in MongoDB via PyMongo so users can
    retrieve previous calculations at any time.
    """
    data = request.get_json() or {}
    farmer_phone = data.get("farmer_phone", "").strip()
    farmer_name = data.get("farmer_name", "Farmer").strip()
    farm_details = data.get("farm_details", {})
    recommended_npk = data.get("recommended_npk", {})
    seed_requirement = data.get("seed_requirement", {})
    ml_prediction = data.get("ml_prediction", {})
    fertilizer_schedule = data.get("fertilizer_schedule", {})
    irrigation_plan = data.get("irrigation_plan", {})
    tillage_weed_plan = data.get("tillage_weed_plan", {})
    icar_ref = data.get("icar_ref", "")
    raw_results_html = data.get("raw_results_html", "")

    if not farmer_phone or not farm_details:
        return jsonify({"success": False, "error": "farmer_phone and farm_details are required"}), 400

    try:
        saved = save_recommendation_history(
            farmer_phone=farmer_phone,
            farmer_name=farmer_name,
            farm_details=farm_details,
            recommended_npk=recommended_npk,
            seed_requirement=seed_requirement,
            ml_prediction=ml_prediction,
            fertilizer_schedule=fertilizer_schedule,
            irrigation_plan=irrigation_plan,
            tillage_weed_plan=tillage_weed_plan,
            icar_ref=icar_ref,
            raw_results_html=raw_results_html
        )
        return jsonify({"success": True, "calculation_id": saved.get("id"), "record": saved})
    except Exception as e:
        logger.error("Error saving recommendation history: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/recommendations/history", methods=["GET"])
def api_get_recommendation_history():
    """
    Retrieve previous calculation history for a farmer from MongoDB.
    """
    phone = request.args.get("phone", "").strip()
    if not phone:
        return jsonify({"success": False, "error": "Phone parameter required"}), 400

    try:
        history = get_farmer_history(phone)
        return jsonify({"success": True, "count": len(history), "history": history})
    except Exception as e:
        logger.error("Error retrieving history: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/recommendations/<rec_id>", methods=["GET"])
def api_get_recommendation_by_id(rec_id):
    """Retrieve a single previous calculation by its MongoDB ID."""
    try:
        rec = get_recommendation_by_id(rec_id)
        if not rec:
            return jsonify({"success": False, "error": "Calculation record not found"}), 404
        return jsonify({"success": True, "record": rec})
    except Exception as e:
        logger.error("Error retrieving calculation: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/recommendations/<rec_id>", methods=["DELETE"])
def api_delete_recommendation(rec_id):
    """Delete a calculation from history."""
    phone = request.args.get("phone", "").strip()
    if not phone:
        return jsonify({"success": False, "error": "Phone parameter required for authorization"}), 400

    try:
        success = delete_recommendation(rec_id, phone)
        return jsonify({"success": success})
    except Exception as e:
        logger.error("Error deleting calculation: %s", e)
        return jsonify({"success": False, "error": str(e)}), 500


# ===================================================================
# ENTRY POINT
# ===================================================================

def run_server():
    print("=" * 60)
    print("🌾 Annadata Bharat - PyMongo & ML Agriculture Backend")
    print("=" * 60)
    print(f"🚀 Server running on: http://{SERVER_HOST}:{SERVER_PORT}")
    print("📊 MongoDB Status:", "Connected ✅" if db_manager.is_connected else "Disconnected ❌")
    print(f"🤖 Loaded ML Models: {len(ml_engine.models)} available with automatic fallback")
    print("=" * 60)
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG_MODE)

if __name__ == "__main__":
    run_server()
