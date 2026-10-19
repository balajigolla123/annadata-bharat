/**
 * Annadata Bharat - Frontend API Client
 * Connects the web frontend to the Python PyMongo backend (Flask on port 5000).
 * Handles all 4 core features:
 * 1. Save Farm Details
 * 2. Recommendation History Retrieval
 * 3. Farmer Profile Registration & Login
 * 4. ML Prediction with Model Versioning & Fallback
 */

const API_BASE_URL = (typeof window !== "undefined" && window.location.protocol.startsWith("http"))
  ? `${window.location.origin}/api`
  : "http://127.0.0.1:5000/api";

const AgriAPI = {
  /**
   * Check if backend and MongoDB are online and get available ML models.
   */
  async checkHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) return { connected: false, error: response.statusText };
      return await response.json();
    } catch (err) {
      return { connected: false, error: err.message };
    }
  },

  /**
   * Get list of all available ML models and their versions.
   */
  async getModels() {
    try {
      const response = await fetch(`${API_BASE_URL}/ml/models`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.models || [];
    } catch (err) {
      console.warn("Could not fetch models list:", err);
      return [];
    }
  },

  // ===================================================================
  // FEATURE 3: FARMER PROFILE (Registration & Login)
  // ===================================================================

  /**
   * Register a new farmer profile in MongoDB via PyMongo.
   */
  async registerFarmer(name, phone, pincode) {
    try {
      const response = await fetch(`${API_BASE_URL}/farmer/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, pincode })
      });
      return await response.json();
    } catch (err) {
      console.error("registerFarmer error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Sign in farmer, updating last_login timestamp in MongoDB.
   */
  async loginFarmer(phone) {
    try {
      const response = await fetch(`${API_BASE_URL}/farmer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      return await response.json();
    } catch (err) {
      console.error("loginFarmer error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Retrieve farmer profile from MongoDB.
   */
  async getFarmerProfile(phone) {
    try {
      const response = await fetch(`${API_BASE_URL}/farmer/profile?phone=${encodeURIComponent(phone)}`);
      return await response.json();
    } catch (err) {
      console.error("getFarmerProfile error:", err);
      return { success: false, error: err.message };
    }
  },

  // ===================================================================
  // FEATURE 1: SAVE FARM DETAILS (Crop, Area, Soil Type, Sowing Date)
  // ===================================================================

  /**
   * Store crop, area, soil type, and sowing date in MongoDB.
   */
  async saveFarmDetails(farmData) {
    try {
      const response = await fetch(`${API_BASE_URL}/farm/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(farmData)
      });
      return await response.json();
    } catch (err) {
      console.error("saveFarmDetails error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Retrieve all saved farms for a farmer.
   */
  async getFarmHistory(phone) {
    try {
      const response = await fetch(`${API_BASE_URL}/farm/history?phone=${encodeURIComponent(phone)}`);
      return await response.json();
    } catch (err) {
      console.error("getFarmHistory error:", err);
      return { success: false, error: err.message };
    }
  },

  // ===================================================================
  // FEATURE 4: ML PREDICTION (Save predicted results & model version)
  // ===================================================================

  /**
   * Run ML yield prediction and save result + model version to MongoDB.
   */
  async predictYield(inputData) {
    try {
      const response = await fetch(`${API_BASE_URL}/ml/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputData)
      });
      return await response.json();
    } catch (err) {
      console.error("predictYield error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Retrieve saved ML prediction records for analysis.
   */
  async getSavedPredictions(phone) {
    try {
      const response = await fetch(`${API_BASE_URL}/ml/predictions?phone=${encodeURIComponent(phone)}`);
      return await response.json();
    } catch (err) {
      console.error("getSavedPredictions error:", err);
      return { success: false, error: err.message };
    }
  },

  // ===================================================================
  // FEATURE 2: RECOMMENDATION HISTORY (Retrieve previous calculations)
  // ===================================================================

  /**
   * Save complete recommendation calculation snapshot in MongoDB.
   */
  async saveRecommendation(recData) {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recData)
      });
      return await response.json();
    } catch (err) {
      console.error("saveRecommendation error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Retrieve list of previous calculations for a farmer from MongoDB.
   */
  async getRecommendationHistory(phone) {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/history?phone=${encodeURIComponent(phone)}`);
      return await response.json();
    } catch (err) {
      console.error("getRecommendationHistory error:", err);
      return { success: false, error: err.message, history: [] };
    }
  },

  /**
   * Retrieve full details of a single calculation by MongoDB ID.
   */
  async getRecommendationById(recId) {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/${recId}`);
      return await response.json();
    } catch (err) {
      console.error("getRecommendationById error:", err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Delete a previous calculation from MongoDB.
   */
  async deleteRecommendation(recId, phone) {
    try {
      const response = await fetch(`${API_BASE_URL}/recommendations/${recId}?phone=${encodeURIComponent(phone)}`, {
        method: "DELETE"
      });
      return await response.json();
    } catch (err) {
      console.error("deleteRecommendation error:", err);
      return { success: false, error: err.message };
    }
  }
};

// Make available globally
window.AgriAPI = AgriAPI;
