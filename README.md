# 🌾 Smart Fertilizer & Irrigation Calculator

A web-based agriculture tool that provides **crop-specific fertilizer recommendations and irrigation schedules** based on soil data and ICAR standards.

---

## 🌐 Live Demo

👉 **Open the website:** [https://annadatabharat.netlify.app](https://annadatabharat.netlify.app)

---

## 🚀 Project Overview

The **Smart Fertilizer & Irrigation Calculator** helps farmers and agricultural users make better decisions by generating:

* 🌱 Fertilizer recommendations (NPK-based)
* 💧 Irrigation schedules
* 🧪 Soil nutrient analysis
* 📊 Visual reports (charts + tables)
* 📄 Downloadable PDF reports

All recommendations follow **ICAR (Indian Council of Agricultural Research) guidelines** for accuracy and reliability.

---

## ✨ Features

### 🔐 Authentication System

* OTP-based login & registration
* LocalStorage-based user management
* Session handling with auto-login protection
* Multi-language support (English, Hindi, Telugu, etc.)

---

### 🌾 Smart Calculator

* Supports **50+ crops** (rice, wheat, maize, fruits, vegetables, etc.)
* Input parameters:

  * Crop type
  * Area (hectares)
  * Soil type & texture
  * Sowing date
  * Optional soil test values (N, P, K, pH, micronutrients)

---

### 📊 ICAR-Based Recommendations

* NPK values aligned with ICAR standards
* Soil-based adjustments (low/medium/high fertility)
* Micro-nutrient deficiency detection (Zn, Fe, B, Cu)
* Expected yield targets included

---

### 📄 Report Generation

* ICAR-compliant report output
* Download as PDF
* Includes:

  * Fertilizer schedule
  * Irrigation plan
  * Nutrient charts
  * Compliance notes

---

### 🌐 Additional Pages

* 🔑 Login Page (OTP authentication)
* 📞 Contact Page with project details
* 📊 Results Page with charts and export options

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6+), Chart.js, html2pdf.js
* **Backend:** Python 3.13, Flask REST API
* **Database:** MongoDB & PyMongo
* **Machine Learning:** scikit-learn (Random Forest Regressor, Gradient Boosting, Decision Tree, Ridge)
* **Cloud & Hosting:** Vercel (Serverless Python Functions & Static CDN)

---

## 🍃 MongoDB & PyMongo Integration

| Feature | Description | Collection |
|---|---|---|
| **Save Farm Details** | Stores crop, acreage, soil type & texture, and sowing date | `farm_details` |
| **Recommendation History** | Farmers can view, filter, and reload past calculation snapshots | `recommendation_history` |
| **Farmer Profile** | Stores profile on registration and tracks last login | `farmer_profiles` |
| **ML Prediction** | Predicts crop harvest with Random Forest and records prediction & model version | `ml_predictions` |

---

## 🚀 How to Run Locally

### 1️⃣ Start Backend (Flask + PyMongo + ML)
```bash
py -3 run_backend.py
# Or double-click run_backend.bat
```

### 2️⃣ Open the Application
Navigate to:
```
http://127.0.0.1:5000
```

---

## ☁️ Deployment on Vercel

1. Import this repository on [Vercel](https://vercel.com/new).
2. Set **Root Directory** to `agri_calculator`.
3. In **Environment Variables**, add `MONGODB_URI` pointing to your MongoDB Atlas cluster.
4. Click **Deploy**! Vercel automatically deploys the frontend and serverless Python backend.

---

## 🤝 Contributing

Feel free to fork this repository and submit pull requests.

---

## 📧 Contact

* 📞 Phone: 9381039799
* 📩 Email: [balajigolla330@gmail.com](mailto:balajigolla330@gmail.com)
* 📍 Location: Lovely Professional University, Punjab

---

## 📜 License

This project is open-source and available under the MIT License.

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!

---
