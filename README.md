# 🌾 Smart Fertilizer & Irrigation Calculator

A web-based agriculture tool that provides **crop-specific fertilizer recommendations and irrigation schedules** based on soil data and ICAR standards.

---

## 🚀 Project Overview

The **Smart Fertilizer & Irrigation Calculator** helps farmers and agricultural users make better decisions by generating:

**Writing**

**New!Click to edit**

* 🌱 Fertilizer recommendations (NPK-based)
* 💧 Irrigation schedules
* 🧪 Soil nutrient analysis
* 📊 Visual reports (charts + tables)
* 📄 Downloadable PDF reports

All recommendations follow **ICAR (Indian Council of Agricultural Research) guidelines** for accuracy and reliability .

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

* **Frontend:** HTML, CSS, JavaScript
* **Storage:** LocalStorage & SessionStorage
* **Libraries:**

  * Chart.js (data visualization)
  * html2pdf.js (PDF export)

---

## 📁 Project Structure

```
project/
│
├── index.html            # Main calculator page
├── login.html            # Authentication page
├── results.html          # Results & report page
├── contact.html          # Contact details
│
├── css/
│   ├── style.css
│   └── login.css
│
├── js/
│   ├── script.js         # Main calculator logic
│   ├── results.js        # Report generation
│   ├── login.js          # Authentication logic
│   ├── visualization.js  # Charts
│   └── i18n.js           # Multi-language support
│
├── assets/               # Images (logo, etc.)
├── SETUP_GUIDE.md        # Setup instructions
└── ICAR_INTEGRATION.md   # ICAR documentation
```

---

## ⚙️ How to Run

### 🔹 Step 1: Clone Repository

```bash
git clone https://github.com/your-username/agriculture-calculator.git
cd agriculture-calculator
```

### 🔹 Step 2: Open in Browser

Simply open:

```bash
login.html
```

No backend required (fully frontend-based).

---

## 🧪 Testing

* Register using any phone number
* OTP will appear in:

  * Browser alert
  * Console log
* Use OTP to login and test calculator features 

---

## 🔐 Data Handling

* **localStorage:** Stores user accounts
* **sessionStorage:** Stores current login session
* No external database required

---

## 📈 Future Enhancements

* 📡 Real SMS OTP integration (Twilio/Firebase)
* 🌦 Weather-based recommendations
* 📍 Location-based ICAR guidelines
* 🌱 Organic fertilizer suggestions
* 📊 Farmer dashboard

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
