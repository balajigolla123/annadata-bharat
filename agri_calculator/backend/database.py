"""
MongoDB Database Service using PyMongo
Implements all four core features:
1. Save farm details: Store crop, area, soil type, and sowing date
2. Recommendation history: Let users retrieve previous calculations
3. Farmer profile: Store a farmer's profile with registration and login
4. ML prediction: Save predicted results and model version for future analysis
"""

import datetime
import hashlib
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
            # 1. Farmer profiles: index on username and phone
            try:
                self.db[COLL_FARMERS].create_index([("username", ASCENDING)], unique=True, sparse=True)
                self.db[COLL_FARMERS].create_index([("phone", ASCENDING)], sparse=True)
            except Exception as ie:
                logger.warning("Index creation notice: %s", ie)

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

def hash_password(password: str) -> str:
    """Hash password with SHA-256 for secure MongoDB storage."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def register_farmer(
    name: str = "",
    phone: str = "",
    pincode: str = "",
    username: str = "",
    password: str = ""
) -> Dict[str, Any]:
    """
    Register a new farmer profile in MongoDB with username & password using PyMongo.
    Returns status and user document.
    """
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    name = str(name).strip()
    phone = str(phone).strip()
    pincode = str(pincode).strip()
    u = str(username).strip().lower() if username else (phone or name.lower().replace(" ", "_"))
    p = str(password).strip() if password else "123456"

    if not u:
        return {"success": False, "error": "Username is required"}

    # Check if username is already taken
    existing = db_mgr.db[COLL_FARMERS].find_one({"username": u})
    if existing:
        return {"success": False, "exists": True, "error": f"Username '{u}' is already registered. Please log in."}

    now = datetime.datetime.utcnow()
    farmer_doc = {
        "username": u,
        "password_hash": hash_password(p),
        "name": name or u,
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
        serialized = serialize_doc(farmer_doc)
        serialized.pop("password_hash", None)
        return {"success": True, "created": True, "user": serialized}
    except DuplicateKeyError:
        # Fallback query
        existing = db_mgr.db[COLL_FARMERS].find_one({"$or": [{"username": u}, {"phone": phone}]})
        if existing:
            serialized = serialize_doc(existing)
            serialized.pop("password_hash", None)
            return {"success": True, "created": False, "user": serialized}
        return {"success": False, "error": "User with this username or phone already exists"}

def login_farmer(username_or_phone: str, password: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """
    Log in farmer by username or phone with password validation.
    Updates last_login timestamp in MongoDB.
    """
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    ident = str(username_or_phone).strip().lower()
    if not ident:
        return None

    user = db_mgr.db[COLL_FARMERS].find_one({
        "$or": [
            {"username": ident},
            {"phone": ident}
        ]
    })

    if not user:
        return None

    # If password is provided, verify it
    if password is not None:
        expected_hash = user.get("password_hash")
        if expected_hash:
            if hash_password(password) != expected_hash:
                return {"_error": "Incorrect password. Please try again."}
        else:
            # Set initial password hash for legacy records
            db_mgr.db[COLL_FARMERS].update_one(
                {"_id": user["_id"]},
                {"$set": {"password_hash": hash_password(password)}}
            )

    now = datetime.datetime.utcnow()
    db_mgr.db[COLL_FARMERS].update_one(
        {"_id": user["_id"]},
        {"$set": {"last_login": now}}
    )
    user["last_login"] = now

    serialized = serialize_doc(user)
    serialized.pop("password_hash", None)
    return serialized

def get_farmer_profile(identifier: str) -> Optional[Dict[str, Any]]:
    """Retrieve farmer profile by username or mobile number."""
    db_mgr = MongoManager()
    if not db_mgr.is_connected:
        raise RuntimeError("MongoDB connection unavailable")

    ident = str(identifier).strip().lower()
    doc = db_mgr.db[COLL_FARMERS].find_one({
        "$or": [
            {"username": ident},
            {"phone": ident}
        ]
    })
    if doc:
        serialized = serialize_doc(doc)
        serialized.pop("password_hash", None)
        return serialized
    return None


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
