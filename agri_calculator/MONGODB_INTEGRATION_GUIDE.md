# Annadata Bharat - MongoDB & PyMongo Integration Guide

This guide documents the integration of **MongoDB**, **PyMongo**, and **Machine Learning** into the Agriculture Calculator project.

---

## 🌟 4 Core Features Implemented

| Feature | What MongoDB and PyMongo Do | Implementation Details |
|---|---|---|
| **Save farm details** | Stores crop, area, soil type, soil texture, sowing date, and soil test values | `farm_details` collection in MongoDB. Saved whenever a calculation is executed. |
| **Recommendation history** | Lets users retrieve and reload previous calculations | `recommendation_history` collection. Accessible via the new `history.html` page and `📜 History` buttons. |
| **Farmer profile** | Stores farmer profile on registration and updates last login | `farmer_profiles` collection with unique mobile number index, name, pincode, and timestamps. |
| **ML prediction** | Saves predicted yield, total harvest, and model version for future analysis | `ml_predictions` collection. Trained with scikit-learn, versioned (`rf-v1.2.0`, `gb-v1.1.0`, etc.) with automatic fallback. |

---

## 🤖 Multi-Model Machine Learning Engine with Fallback

The backend includes 4 pre-trained scikit-learn models:
1. **Random Forest Regressor** (`rf-v1.2.0`) - Default / Recommended
2. **Gradient Boosting Regressor** (`gb-v1.1.0`) - High-accuracy boosting
3. **Decision Tree Regressor** (`dt-v1.0.0`) - Fast rule-based tree
4. **Ridge Linear Regressor** (`ridge-v1.0.0`) - L2 regularized linear model

> **Graceful Model Fallback**: As requested (*"use any model to integrate if that model is not working try with another model"*), if any model fails or is missing, the engine automatically catches the exception and falls back to the next available working model, marking `fallback_used: true` and preserving continuous operation.

---

## 📁 Architecture & File Overview

```
agri_calculator/
├── backend/
│   ├── app.py                 # Flask REST API connecting frontend to PyMongo & ML
│   ├── database.py            # PyMongo client & CRUD operations for all 4 features
│   ├── ml_service.py          # Multi-model scikit-learn engine with automatic fallback
│   ├── config.py              # MongoDB URI (mongodb://localhost:27017/), DB & collections
│   ├── saved_models/          # Persisted joblib models & metadata JSONs
│   └── test_integration.py    # Test suite verifying MongoDB & PyMongo operations
├── js/
│   ├── api.js                 # Unified JavaScript API client
│   ├── history.js             # Controller for recommendation history page
│   ├── login.js               # Farmer profile authentication with MongoDB
│   ├── script.js              # Calculator logic with farm detail & ML PyMongo saves
│   └── results.js             # Results view with ML Prediction & Model Version Card
├── history.html               # Dedicated past calculations viewer
├── index.html                 # Calculator UI with ML Model selector & History button
├── login.html                 # Auth UI with live MongoDB connection status
├── results.html               # Recommendations report with ML prediction badge
├── run_backend.py             # Python server launcher
└── run_backend.bat            # Windows 1-click launcher
```

---

## 🚀 How to Run and Test

### 1. Ensure MongoDB is Running
MongoDB is already installed and running on your system at `mongodb://localhost:27017/`.
You can view the database (`annadata_bharat_db`) in **MongoDB Compass**.

### 2. Start the PyMongo Backend
Double-click `run_backend.bat` or run in terminal:
```powershell
py -3 run_backend.py
```
Output:
```
=================================================================
🌾 Annadata Bharat - PyMongo & Machine Learning Server
=================================================================
📡 API Base URL: http://127.0.0.1:5000/api
🍃 MongoDB Status: Connected ✅
🤖 Loaded ML Models: 4 algorithms ready
   • Random Forest Regressor (rf-v1.2.0) [R² = 0.9954]
   • Gradient Boosting Regressor (gb-v1.1.0) [R² = 0.9981]
   • Decision Tree Regressor (dt-v1.0.0) [R² = 0.9938]
   • Ridge Linear Regressor (ridge-v1.0.0) [R² = 0.9623]
=================================================================
```

### 3. Run the Verification Tests
To verify all 4 features directly against MongoDB:
```powershell
py -3 backend/test_integration.py
```

### 4. Test in the Browser
1. Open `login.html`:
   - Enter your name, mobile number, and pincode.
   - Click **Send OTP**, enter the 6-digit code shown in the demo prompt, and click **Verify OTP**.
   - Your profile is saved in MongoDB collection `farmer_profiles`.
2. On `index.html`:
   - Select your crop, area, soil type, and sowing date.
   - Select your desired **ML Model** (or leave default Random Forest).
   - Click **Calculate Recommendation**.
   - Farm details are saved to `farm_details`.
   - The ML prediction runs, records predicted yield and model version to `ml_predictions`.
   - The full recommendation is saved to `recommendation_history`.
3. On `results.html`:
   - View the **Machine Learning Prediction Result** card with Model Name, Model Version, Predicted Yield (t/ha), Total Harvest, and Confidence.
4. Click **📜 History** (in header or open `history.html`):
   - View all your previous calculations retrieved live from MongoDB.
   - Click **👁️ View Full Recommendation** to reload any past calculation!
