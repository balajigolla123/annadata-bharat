"""
MongoDB Database Service using PyMongo
Implements all four core features:
1. Save farm details: Store crop, area, soil type, and sowing date
2. Recommendation history: Let users retrieve previous calculations
3. Farmer profile: Store a farmer's profile with registration and login
4. ML prediction: Save predicted results and model version for future analysis
"""

import datetime
import logging
from typing import Dict, Any, List, Optional
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure, DuplicateKeyError, PyMongoError
from bson.objectid import ObjectId

from .config import (
    MONGODB_URI,
    DATABASE_NAME,
    COLL_FARMERS,
    COLL_FARM_DETAILS,
    COLL_RECOMMENDATIONS,
    COLL_ML_PREDICTIONS,
)

logger = logging.getLogger("AgriDB")
logging.basicConfig(level=logging.INFO)

class MongoManager:
    """Singleton MongoDB manager using PyMongo."""
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MongoManager, cls).__new__(cls)
            cls._instance._init_connection()
        return cls._instance

    def _init_connection(self):
        self.client = None
        self.db = None
        self.is_connected = False
        try:
            self.client = MongoClient(
                MONGODB_URI,
                serverSelectionTimeoutMS=3000,
                connectTimeoutMS=3000
            )
            # Force server check
            self.client.admin.command('ping')
            self.db = self.client[DATABASE_NAME]
            self.is_connected = True
            logger.info("✅ Connected to MongoDB at %s (DB: %s)", MONGODB_URI, DATABASE_NAME)
            self._ensure_indexes()
        except ConnectionFailure as e:
            logger.error("❌ MongoDB connection failure: %s", e)
            self.is_connected = False
        except Exception as e:
            logger.error("❌ Unexpected error connecting to MongoDB: %s", e)
            self.is_connected = False

    def _ensure_indexes(self):
        """Create necessary indexes for performance and uniqueness."""
        if not self.is_connected or self.db is None:
            return
        try:
            # 1. Farmer profiles: unique index on phone
            self.db[COLL_FARMERS].create_index([("phone", ASCENDING)], unique=True)

            # 2. Farm details: index on farmer_phone and created_at
            self.db[COLL_FARM_DETAILS].create_index([("farmer_phone", ASCENDING), ("created_at", DESCENDING)])

            # 3. Recommendation history: index on farmer_phone and created_at
            self.db[COLL_RECOMMENDATIONS].create_index([("farmer_phone", ASCENDING), ("created_at", DESCENDING)])

            # 4. ML predictions: index on farmer_phone, model_name, created_at
            self.db[COLL_ML_PREDICTIONS].create_index([
                ("farmer_phone", ASCENDING),
                ("created_at", DESCENDING)
            ])
            logger.info("✅ PyMongo collection indexes verified.")
        except Exception as e:
            logger.warning("⚠️ Error creating indexes: %s", e)

    def check_health(self) -> Dict[str, Any]:
        """Verify MongoDB connection health."""
        if not self.is_connected or self.client is None:
            # Retry connection once
            self._init_connection()

        if self.is_connected:
            try:
                self.client.admin.command('ping')
                collections = self.db.list_collection_names()
                return {
                    "connected": True,
                    "database": DATABASE_NAME,
                    "uri": MONGODB_URI,
                    "collections": collections
                }
            except Exception as e:
                return {"connected": False, "error": str(e)}
        return {"connected": False, "error": "Unable to connect to MongoDB server"}


# Helper to convert MongoDB document for JSON serialization
def serialize_doc(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not doc:
        return None
    doc_copy = dict(doc)
    if "_id" in doc_copy:
        doc_copy["id"] = str(doc_copy.pop("_id"))
    for k, v in doc_copy.items():
        if isinstance(v, datetime.datetime):
            doc_copy[k] = v.isoformat()
        elif isinstance(v, ObjectId):
            doc_copy[k] = str(v)
    return doc_copy

def serialize_docs(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [serialize_doc(d) for d in docs]


# ===================================================================
# FEATURE 3: FARMER PROFILE (Registration, Login, Profile Retrieval)
# ===================================================================

def register_farmer(name: str, phone: str, pincode: str) -> Dict[str, Any]:
    """
    Register a new farmer profile in MongoDB using PyMongo.
    Returns status and user document.
    """
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    phone = str(phone).strip()
    name = str(name).strip()
    pincode = str(pincode).strip()

    now = datetime.datetime.utcnow()
    farmer_doc = {
        "name": name,
        "phone": phone,
        "pincode": pincode,
        "created_at": now,
        "last_login": now,
        "total_farms": 0,
        "total_calculations": 0
    }

    try:
        res = db_mgr.db[COLL_FARMERS].insert_one(farmer_doc)
        farmer_doc["_id"] = res.inserted_id
        return {"success": True, "created": True, "user": serialize_doc(farmer_doc)}
    except DuplicateKeyError:
        # User already exists, update name and pincode if needed
        db_mgr.db[COLL_FARMERS].update_one(
            {"phone": phone},
            {"$set": {"name": name, "pincode": pincode, "last_login": now}}
        )
        existing = db_mgr.db[COLL_FARMERS].find_one({"phone": phone})
        return {"success": True, "created": False, "user": serialize_doc(existing)}

def login_farmer(phone: str) -> Optional[Dict[str, Any]]:
    """
    Log in farmer by phone, updates last_login timestamp.
    """
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    phone = str(phone).strip()
    now = datetime.datetime.utcnow()

    res = db_mgr.db[COLL_FARMERS].find_one_and_update(
        {"phone": phone},
        {"$set": {"last_login": now}},
        return_document=True
    )
    return serialize_doc(res)

def get_farmer_profile(phone: str) -> Optional[Dict[str, Any]]:
    """Retrieve farmer profile by mobile number."""
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    doc = db_mgr.db[COLL_FARMERS].find_one({"phone": str(phone).strip()})
    return serialize_doc(doc)


# ===================================================================
# FEATURE 1: SAVE FARM DETAILS (Crop, Area, Soil Type, Sowing Date)
# ===================================================================

def save_farm_details(
    farmer_phone: str,
    crop: str,
    area: float,
    soil_type: str,
    soil_texture: str,
    sowing_date: str,
    soil_test: Optional[Dict[str, Any]] = None,
    farm_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Store crop, area, soil type, and sowing date for a farmer in MongoDB.
    """
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    now = datetime.datetime.utcnow()
    farm_doc = {
        "farmer_phone": str(farmer_phone).strip(),
        "crop": str(crop).strip().lower(),
        "area": float(area),
        "soil_type": str(soil_type).strip().lower(),
        "soil_texture": str(soil_texture).strip().lower(),
        "sowing_date": str(sowing_date).strip(),
        "soil_test": soil_test or {},
        "farm_name": farm_name or f"{crop.capitalize()} Field ({area} ha)",
        "created_at": now,
        "updated_at": now
    }

    res = db_mgr.db[COLL_FARM_DETAILS].insert_one(farm_doc)
    farm_doc["_id"] = res.inserted_id

    # Update total farms counter on farmer profile
    db_mgr.db[COLL_FARMERS].update_one(
        {"phone": str(farmer_phone).strip()},
        {"$inc": {"total_farms": 1}}
    )

    return serialize_doc(farm_doc)

def get_farmer_farms(farmer_phone: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Retrieve saved farm details for a farmer."""
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    cursor = db_mgr.db[COLL_FARM_DETAILS].find(
        {"farmer_phone": str(farmer_phone).strip()}
    ).sort("created_at", DESCENDING).limit(limit)

    return serialize_docs(list(cursor))

def get_latest_farm(farmer_phone: str) -> Optional[Dict[str, Any]]:
    """Retrieve latest saved farm details for a farmer."""
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    doc = db_mgr.db[COLL_FARM_DETAILS].find_one(
        {"farmer_phone": str(farmer_phone).strip()},
        sort=[("created_at", DESCENDING)]
    )
    return serialize_doc(doc)


# ===================================================================
# FEATURE 4: ML PREDICTION (Save predicted results & model version)
# ===================================================================

def save_ml_prediction(
    farmer_phone: str,
    crop: str,
    area: float,
    soil_type: str,
    model_name: str,
    model_version: str,
    predicted_yield_t_ha: float,
    total_expected_yield_tons: float,
    confidence_score: float,
    features_used: Dict[str, Any],
    fallback_used: bool = False,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Save predicted results and model version for future analysis in MongoDB.
    """
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    now = datetime.datetime.utcnow()
    pred_doc = {
        "farmer_phone": str(farmer_phone).strip(),
        "crop": crop.lower(),
        "area": float(area),
        "soil_type": soil_type.lower(),
        "model_name": model_name,
        "model_version": model_version,
        "predicted_yield_t_ha": round(float(predicted_yield_t_ha), 2),
        "total_expected_yield_tons": round(float(total_expected_yield_tons), 2),
        "confidence_score": round(float(confidence_score), 2),
        "features_used": features_used,
        "fallback_used": bool(fallback_used),
        "notes": notes or "Automated ML prediction",
        "created_at": now
    }

    res = db_mgr.db[COLL_ML_PREDICTIONS].insert_one(pred_doc)
    pred_doc["_id"] = res.inserted_id

    return serialize_doc(pred_doc)

def get_farmer_predictions(farmer_phone: str, limit: int = 15) -> List[Dict[str, Any]]:
    """Retrieve ML prediction records for a farmer."""
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    cursor = db_mgr.db[COLL_ML_PREDICTIONS].find(
        {"farmer_phone": str(farmer_phone).strip()}
    ).sort("created_at", DESCENDING).limit(limit)

    return serialize_docs(list(cursor))


# ===================================================================
# FEATURE 2: RECOMMENDATION HISTORY (Retrieve previous calculations)
# ===================================================================

def save_recommendation_history(
    farmer_phone: str,
    farmer_name: str,
    farm_details: Dict[str, Any],
    recommended_npk: Dict[str, Any],
    seed_requirement: Dict[str, Any],
    ml_prediction: Optional[Dict[str, Any]] = None,
    fertilizer_schedule: Optional[Dict[str, Any]] = None,
    irrigation_plan: Optional[Dict[str, Any]] = None,
    tillage_weed_plan: Optional[Dict[str, Any]] = None,
    icar_ref: Optional[str] = None,
    raw_results_html: Optional[str] = None
) -> Dict[str, Any]:
    """
    Store full recommendation calculation snapshot in MongoDB so farmers
    can retrieve past calculations at any time.
    """
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    now = datetime.datetime.utcnow()
    rec_doc = {
        "farmer_phone": str(farmer_phone).strip(),
        "farmer_name": str(farmer_name).strip(),
        "farm_details": farm_details,
        "recommended_npk": recommended_npk,
        "seed_requirement": seed_requirement,
        "ml_prediction": ml_prediction or {},
        "fertilizer_schedule": fertilizer_schedule or {},
        "irrigation_plan": irrigation_plan or {},
        "tillage_weed_plan": tillage_weed_plan or {},
        "icar_ref": icar_ref or "ICAR Agricultural Package",
        "raw_results_html": raw_results_html,
        "created_at": now
    }

    res = db_mgr.db[COLL_RECOMMENDATIONS].insert_one(rec_doc)
    rec_doc["_id"] = res.inserted_id

    # Increment calculations counter on farmer profile
    db_mgr.db[COLL_FARMERS].update_one(
        {"phone": str(farmer_phone).strip()},
        {"$inc": {"total_calculations": 1}}
    )

    return serialize_doc(rec_doc)

def get_farmer_history(farmer_phone: str, limit: int = 25) -> List[Dict[str, Any]]:
    """
    Retrieve previous calculation history for a given farmer from MongoDB.
    """
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    cursor = db_mgr.db[COLL_RECOMMENDATIONS].find(
        {"farmer_phone": str(farmer_phone).strip()}
    ).sort("created_at", DESCENDING).limit(limit)

    return serialize_docs(list(cursor))

def get_recommendation_by_id(rec_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve a single previous calculation by its MongoDB ID."""
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    try:
        oid = ObjectId(rec_id)
    except Exception:
        return None

    doc = db_mgr.db[COLL_RECOMMENDATIONS].find_one({"_id": oid})
    return serialize_doc(doc)

def delete_recommendation(rec_id: str, farmer_phone: str) -> bool:
    """Delete a calculation from history."""
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    try:
        oid = ObjectId(rec_id)
        res = db_mgr.db[COLL_RECOMMENDATIONS].delete_one({
            "_id": oid,
            "farmer_phone": str(farmer_phone).strip()
        })
        return res.deleted_count > 0
    except Exception:
        return False
