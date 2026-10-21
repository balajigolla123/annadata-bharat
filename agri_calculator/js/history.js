/**
 * History Manager for Annadata Bharat Agriculture Calculator
 * Fetches and displays previous calculations from MongoDB via PyMongo
 * with instant client-side cache fallback so history is always available.
 */

let allCalculations = [];

window.addEventListener("DOMContentLoaded", () => {
  const currentUserStr = sessionStorage.getItem("currentUser");
  let phone = "guest_farmer";
  let name = "Farmer";

  if (currentUserStr) {
    try {
      const user = JSON.parse(currentUserStr);
      phone = user.phone || "guest_farmer";
      name = user.name || "Farmer";
    } catch (e) {}
  }

  const userNameEl = document.getElementById("userName");
  if (userNameEl) {
    userNameEl.textContent = `👤 ${name}`;
  }

  loadHistory(phone);
});

async function loadHistory(phone) {
  const container = document.getElementById("historyListContainer");
  if (!container) return;

  // 1. Immediately render cached calculations from localStorage
  try {
    const rawLocal = localStorage.getItem("agriRecommendationHistory");
    if (rawLocal) {
      const cached = JSON.parse(rawLocal);
      if (Array.isArray(cached) && cached.length > 0) {
        allCalculations = cached;
        renderHistoryList(allCalculations);
      }
    }
  } catch (e) {
    console.warn("Local cache read notice:", e);
  }

  // 2. Fetch and synchronize with MongoDB via PyMongo
  try {
    if (window.AgriAPI) {
      const res = await window.AgriAPI.getRecommendationHistory(phone);
      if (res && res.success && Array.isArray(res.history)) {
        allCalculations = res.history;
        renderHistoryList(allCalculations);
        return;
      }
    }
  } catch (err) {
    console.warn("Backend history sync notice:", err);
  }

  // If still empty after local read and API attempt
  if (!allCalculations || allCalculations.length === 0) {
    renderEmptyState("You haven't generated any fertilizer recommendations yet.");
  }
}

function renderHistoryList(records) {
  const container = document.getElementById("historyListContainer");
  if (!container) return;

  if (!records || records.length === 0) {
    renderEmptyState();
    return;
  }

  let html = "";
  records.forEach((rec, idx) => {
    const recId = rec.id || rec._id || `idx_${idx}`;
    const farm = rec.farm_details || {};
    const ml = rec.ml_prediction || {};
    const npk = rec.recommended_npk || {};

    const formattedDate = rec.created_at ? new Date(rec.created_at).toLocaleString() : "Recent Calculation";
    const cropName = (farm.crop || "Crop").toUpperCase();
    const area = farm.area || "1";
    const soilType = farm.soil_type || "Standard";
    const sowingDate = farm.sowing_date || "N/A";

    const modelName = ml.model_name || "Random Forest Regressor";
    const modelVersion = ml.model_version || "rf-v1.2.0";
    const predictedYield = ml.predicted_yield_t_ha ? `${ml.predicted_yield_t_ha} t/ha` : "5.2 t/ha";
    const totalYield = ml.total_expected_yield_tons ? `${ml.total_expected_yield_tons} tonnes` : `${(area * 5.2).toFixed(1)} tonnes`;

    html += `
      <div class="history-card" id="card-${recId}">
        <div class="history-header">
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
            <span class="crop-badge">🌾 ${cropName}</span>
            <span style="color:#666;font-size:0.9rem;">📅 ${formattedDate}</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span class="model-badge">🤖 ${modelName} (${modelVersion})</span>
          </div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <div class="detail-label">Field Area</div>
            <div class="detail-value">${area} Hectares</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Soil Type</div>
            <div class="detail-value" style="text-transform:capitalize;">${soilType}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Sowing Date</div>
            <div class="detail-value">${sowingDate}</div>
          </div>
          <div class="detail-item" style="border-left-color:#2196f3;background:#e3f2fd;">
            <div class="detail-label" style="color:#1976d2;">ML Predicted Yield</div>
            <div class="detail-value" style="color:#0d47a1;">${predictedYield}</div>
          </div>
          <div class="detail-item" style="border-left-color:#ff9800;background:#fff3e0;">
            <div class="detail-label" style="color:#e65100;">Total Harvest</div>
            <div class="detail-value" style="color:#e65100;">${totalYield}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Rec. N-P-K (kg/ha)</div>
            <div class="detail-value">${npk.N || 100} - ${npk.P || 50} - ${npk.K || 50}</div>
          </div>
        </div>

        <div class="actions-bar">
          <button class="btn-delete" onclick="handleDeleteCalculation('${recId}')">🗑️ Delete</button>
          <button class="btn-view" onclick="handleViewCalculation('${recId}')">👁️ View Full Recommendation →</button>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function renderEmptyState(message) {
  const container = document.getElementById("historyListContainer");
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <h2 style="color:#388e3c;margin-bottom:8px;">📋 No Previous Calculations Found</h2>
      <p style="color:#666;margin-bottom:20px;">${message || "You haven't generated any fertilizer recommendations yet."}</p>
      <button onclick="window.location.href='index.html'" style="background:#2e7d32;color:#fff;border:none;padding:12px 24px;border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer;">
        🌱 Calculate Your First Recommendation
      </button>
    </div>
  `;
}

function filterHistory() {
  const searchInput = document.getElementById("searchInput");
  if (!searchInput) return;
  const term = searchInput.value.toLowerCase().trim();
  if (!term) {
    renderHistoryList(allCalculations);
    return;
  }

  const filtered = allCalculations.filter(rec => {
    const crop = (rec.farm_details?.crop || "").toLowerCase();
    const soil = (rec.farm_details?.soil_type || "").toLowerCase();
    const model = (rec.ml_prediction?.model_name || "").toLowerCase();
    const date = (rec.created_at || "").toLowerCase();
    return crop.includes(term) || soil.includes(term) || model.includes(term) || date.includes(term);
  });

  renderHistoryList(filtered);
}

async function handleViewCalculation(recId) {
  const rec = allCalculations.find(r => r.id === recId || r._id === recId);
  if (!rec) {
    alert("Record not found");
    return;
  }

  const farm = rec.farm_details || {};
  const ml = rec.ml_prediction || {};
  const npk = rec.recommended_npk || {};

  // Store in sessionStorage so results.html can render it directly
  const calculationData = {
    crop: farm.crop,
    area: farm.area,
    soilType: farm.soil_type,
    soilTexture: farm.soil_texture || "loamy",
    sowingDate: farm.sowing_date,
    recommendedN: npk.N,
    recommendedP: npk.P,
    recommendedK: npk.K,
    mlPrediction: ml,
    icarRef: rec.icar_ref || "ICAR Package of Practices",
    fromHistory: true,
    historyId: recId
  };

  sessionStorage.setItem("calculationResults", JSON.stringify(calculationData));
  window.location.href = "results.html";
}

async function handleDeleteCalculation(recId) {
  if (!confirm("Are you sure you want to delete this calculation from your history?")) {
    return;
  }

  const user = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
  const phone = user.phone || "guest_farmer";

  try {
    if (window.AgriAPI) {
      await window.AgriAPI.deleteRecommendation(recId, phone);
    }
    allCalculations = allCalculations.filter(r => r.id !== recId && r._id !== recId);
    renderHistoryList(allCalculations);
  } catch (err) {
    alert("Notice during deletion: " + err.message);
  }
}
