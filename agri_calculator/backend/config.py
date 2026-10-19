"""
Configuration settings for Annadata Bharat Agriculture Calculator Backend
Uses MongoDB and PyMongo for data persistence and scikit-learn for ML predictions.
"""

import os
from pathlib import Path

# Base Paths
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent
SAVED_MODELS_DIR = BACKEND_DIR / "saved_models"
SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
DATABASE_NAME = os.getenv("MONGO_DB_NAME", "annadata_bharat_db")

# Collection Names
COLL_FARMERS = "farmer_profiles"
COLL_FARM_DETAILS = "farm_details"
COLL_RECOMMENDATIONS = "recommendation_history"
COLL_ML_PREDICTIONS = "ml_predictions"

# Server Configuration
SERVER_HOST = os.getenv("SERVER_HOST", "127.0.0.1")
SERVER_PORT = int(os.getenv("SERVER_PORT", 5000))
DEBUG_MODE = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")

# Available ML Models and Versions
AVAILABLE_MODELS = {
    "random_forest": {
        "display_name": "Random Forest Regressor",
        "version": "rf-v1.2.0",
        "description": "Ensemble of decision trees. Highly accurate, resistant to overfitting."
    },
    "gradient_boosting": {
        "display_name": "Gradient Boosting Regressor",
        "version": "gb-v1.1.0",
        "description": "Sequential boosting model optimized for non-linear soil-yield relationships."
    },
    "decision_tree": {
        "display_name": "Decision Tree Regressor",
        "version": "dt-v1.0.0",
        "description": "Fast tree-based regression model with clear rule splits."
    },
    "ridge": {
        "display_name": "Ridge Linear Regressor",
        "version": "ridge-v1.0.0",
        "description": "L2-regularized linear model providing a robust baseline."
    }
}
DEFAULT_MODEL_KEY = "random_forest"
