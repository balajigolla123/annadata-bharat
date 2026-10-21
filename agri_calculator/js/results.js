// Results Page - Display Recommendations with language-aware rendering

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function renderResults(langFromEvent) {
  const currentUser = sessionStorage.getItem("currentUser");
  if (!currentUser) {
    window.location.href = "login.html";
    return;
  }

  // Display user name
  const user = JSON.parse(currentUser);
  const userNameEl = document.getElementById("userName");
  if (userNameEl) {
    userNameEl.textContent = `👤 ${user.name}`;
  }

  const resultsContainer = document.getElementById("results");
  if (!resultsContainer) return;

  const stored = sessionStorage.getItem("calculationResults");
  const lang = langFromEvent || localStorage.getItem("selectedLanguage") || "en";

  // Safe translation helper to avoid crashes if i18n is not ready
  const hasI18n = typeof window !== "undefined" && window.i18n && typeof window.i18n.t === "function";
  const t = (key, fallback) => {
    if (hasI18n) {
      const v = window.i18n.t(lang, key);
      return v || fallback;
    }
    return fallback;
  };

  if (!stored) {
    resultsContainer.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <h2>${t('no_results_title', '📋 No Results Found')}</h2>
        <p>${t('no_results_message', 'Please go back to calculator and generate recommendations.')}</p>
      </div>
    `;
    return;
  }

  const data = JSON.parse(stored);

  const crop = (data.crop || "").toLowerCase();
  const area = parseFloat(data.area) || 1;
  const sowingDate = data.sowingDate;
  const sowing = sowingDate ? new Date(sowingDate) : new Date();

  // Final recommended NPK (already adjusted in calculator step)
  const N = typeof data.recommendedN === "number" ? data.recommendedN : 100;
  const P = typeof data.recommendedP === "number" ? data.recommendedP : 50;
  const K = typeof data.recommendedK === "number" ? data.recommendedK : 50;

  const micro = data.microValues || { Zn: 0, Fe: 0, B: 0, Cu: 0 };

  // Seed Rate and Variety Data (per hectare, example values)
  const seedData = {
    rice: { rate: 40, variety: "IR 64, MTU 1010, Pusa Basmati" },
    wheat: { rate: 100, variety: "HD 2967, PBW 343, Lok 1" },
    maize: { rate: 20, variety: "HQPM 1, Bio 9637, DKC 9125" },
    cotton: { rate: 2.5, variety: "Bunny Bt, RCH 2 Bt, Suraj" },
    tomato: { rate: 0.3, variety: "Pusa Ruby, Arka Vikas, Punjab Chhuhara" },
    groundnut: { rate: 120, variety: "JL 24, TG 26, GG 20" },
    sugarcane: { rate: 5000, variety: "Co 86032, Co 0238, CoJ 64" }
  };

  let cropSeed;
  if (seedData[crop]) {
    cropSeed = seedData[crop];
  } else {
    const types = [
      "Early maturing variety (local)",
      "Medium maturing variety (local)",
      "Late maturing variety",
      "Rabi variety",
      "Kharif variety",
      "Jaid variety"
    ];
    const varietyType = types[Math.floor(Math.random() * types.length)];
    cropSeed = { rate: 10, variety: varietyType };
  }
  const seedKg = (cropSeed.rate * area).toFixed(1);

  // ICAR Recommended NPK doses metadata (for dose counts and reference)
  const base = {
    rice: { N: 100, P: 50, K: 40, organicDosages: 2, chemicalDosages: 3, icarRef: "ICAR Rice Package", yield: "5-6 t/ha" },
    wheat: { N: 120, P: 60, K: 40, organicDosages: 2, chemicalDosages: 2, icarRef: "ICAR Wheat Package", yield: "5-5.5 t/ha" },
    maize: { N: 150, P: 75, K: 60, organicDosages: 2, chemicalDosages: 3, icarRef: "ICAR Maize Package", yield: "7-8 t/ha" },
    cotton: { N: 120, P: 60, K: 60, organicDosages: 3, chemicalDosages: 3, icarRef: "ICAR Cotton Package", yield: "20-22 bales/ha" },
    tomato: { N: 150, P: 100, K: 150, organicDosages: 2, chemicalDosages: 3, icarRef: "ICAR Vegetable Package", yield: "40-45 t/ha" },
    groundnut: { N: 25, P: 40, K: 40, organicDosages: 1, chemicalDosages: 2, icarRef: "ICAR Groundnut Package", yield: "2.5-3 t/ha" },
    sugarcane: { N: 150, P: 75, K: 75, organicDosages: 3, chemicalDosages: 4, icarRef: "ICAR Sugarcane Package", yield: "70-80 t/ha" }
  };

  const organicDosagesCount = base[crop]?.organicDosages || 2;
  const chemicalDosagesCount = base[crop]?.chemicalDosages || 2;
  const icarInfo = {
    ref: data.icarRef || base[crop]?.icarRef || "ICAR Package",
    yield: data.expectedYield || base[crop]?.yield || "As per package"
  };

  // Fertilizer quantities (kg) based on final NPK and area
  const fertilizers = {
    urea: (N * area) / 0.46,
    ammonium_sulfate: (N * area) / 0.21,
    dap: (P * area) / 0.18,
    ssp: (P * area) / 0.16,
    mop: (K * area) / 0.6,
    sop: (K * area) / 0.5,
    FYM: area * 10000,
    Vermicompost: area * 2500,
    BoneMeal: area * 500,
    NeemCake: area * 200
  };

  // ----------------- Organic Fertilizer Table (dynamic dosages) -----------------
  const organicDosages = [];
  for (let i = 0; i < organicDosagesCount; i++) {
    const dayOffset = -15 + Math.floor(i * 15); // first dose before sowing, then spaced
    organicDosages.push({
      label: `DOSAGE ${i + 1}`,
      date: formatDate(addDays(sowing, dayOffset)),
      fertilizers: [
        { material: "FYM", qty: (fertilizers.FYM / organicDosagesCount).toFixed(0) },
        { material: "Vermicompost", qty: (fertilizers.Vermicompost / organicDosagesCount).toFixed(0) },
        { material: "Bone Meal", qty: (fertilizers.BoneMeal / organicDosagesCount).toFixed(0) },
        { material: "Neem Cake", qty: (fertilizers.NeemCake / organicDosagesCount).toFixed(0) },
        { material: "OR", qty: null },
        { material: "Compost", qty: (fertilizers.FYM / organicDosagesCount * 0.8).toFixed(0) },
        { material: "Biofertilizer", qty: (fertilizers.Vermicompost / organicDosagesCount * 0.7).toFixed(0) }
      ]
    });
  }

  let organicTable = `<table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
    <tr>
      <th>${t('th_sno_date', 'S.NO / DATE')}</th>
      <th>${t('th_fertilizer', 'FERTILIZER')}</th>
      <th>${t('th_recommended_qty', 'RECOMMENDED QTY')}</th>
    </tr>`;
  organicDosages.forEach(dosage => {
    organicTable += `<tr><td colspan="3" style="font-weight:bold;">${dosage.label}</td></tr>`;
    const mainFerts = dosage.fertilizers.filter(f => ["FYM", "Vermicompost", "Bone Meal", "Neem Cake"].includes(f.material));
    const subFerts = dosage.fertilizers.filter(f => ["Compost", "Biofertilizer"].includes(f.material));
    mainFerts.forEach(f => {
      const fertKey = 'fert_' + f.material.toLowerCase().replace(/\s/g, '_');
      organicTable += `<tr><td>${dosage.date}</td><td>${t(fertKey, f.material)}</td><td>${f.qty} KG</td></tr>`;
    });
    organicTable += `<tr><td></td><td style="font-weight:bold;">${t('or_label', 'OR')}</td><td></td></tr>`;
    subFerts.forEach(f => {
      const fertKey = 'fert_' + f.material.toLowerCase().replace(/\s/g, '_');
      organicTable += `<tr><td>${dosage.date}</td><td>${t(fertKey, f.material)}</td><td>${f.qty} KG</td></tr>`;
    });
  });
  organicTable += `</table>`;

  // ----------------- Chemical Fertilizer Table (dynamic dosages) -----------------
  const chemicalDosages = [];
  for (let i = 0; i < chemicalDosagesCount; i++) {
    const dayOffset = Math.floor(i * 15); // first dose at sowing, then spaced
    chemicalDosages.push({
      label: `DOSAGE ${i + 1}`,
      date: formatDate(addDays(sowing, dayOffset)),
      fertilizers: [
        { material: "DAP", qty: (fertilizers.dap / chemicalDosagesCount).toFixed(0) },
        { material: "Urea", qty: (fertilizers.urea / chemicalDosagesCount).toFixed(0) },
        { material: "OR", qty: null },
        { material: "Ammonium Sulfate", qty: (fertilizers.ammonium_sulfate / chemicalDosagesCount).toFixed(0) },
        { material: "TSP", qty: (fertilizers.ssp / chemicalDosagesCount).toFixed(0) },
        { material: "Potassium nitrate", qty: (fertilizers.sop / chemicalDosagesCount).toFixed(0) },
        { material: "MOP", qty: (fertilizers.mop / chemicalDosagesCount).toFixed(0) }
      ]
    });
  }

  let chemicalTable = `<table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
    <tr>
      <th>${t('th_sno_date', 'S.NO / DATE')}</th>
      <th>${t('th_fertilizer', 'FERTILIZER')}</th>
      <th>${t('th_recommended_qty', 'RECOMMENDED QTY')}</th>
    </tr>`;
  chemicalDosages.forEach(dosage => {
    chemicalTable += `<tr><td colspan="3" style="font-weight:bold;">${dosage.label}</td></tr>`;
    dosage.fertilizers.forEach(f => {
      if (f.material === "OR") {
        chemicalTable += `<tr><td></td><td style="font-weight:bold;">${t('or_label', 'OR')}</td><td></td></tr>`;
      } else {
        const fertKey = 'fert_' + f.material.toLowerCase().replace(/\s/g, '_');
        chemicalTable += `<tr><td>${dosage.date}</td><td>${t(fertKey, f.material)}</td><td>${f.qty} KG</td></tr>`;
      }
    });
  });
  chemicalTable += `</table>`;

  // ----------------- Irrigation Schedule -----------------
  const irrigationData = {
    rice: { days: "Mon, Wed, Fri", litresPerDay: 300000 },
    wheat: { days: "Tue, Thu, Sat", litresPerDay: 200000 },
    maize: { days: "Mon, Thu, Sat", litresPerDay: 250000 },
    cotton: { days: "Tue, Thu, Sat", litresPerDay: 220000 },
    tomato: { days: "Mon, Wed, Fri", litresPerDay: 180000 },
    groundnut: { days: "Mon, Thu, Sat", litresPerDay: 150000 },
    sugarcane: { days: "Mon, Wed, Fri", litresPerDay: 400000 }
  };
  const irrigation = irrigationData[crop] || { days: "Mon, Wed, Fri", litresPerDay: 200000 };
  const irrigationDaysPerWeek = irrigation.days.split(",").length;
  const weeklyTotal = irrigation.litresPerDay * irrigationDaysPerWeek;

  let microNutrients = `
    <ul>
      <li>Zn: ${micro.Zn ? micro.Zn + " kg/ha" : "Not required"}</li>
      <li>Fe: ${micro.Fe ? micro.Fe + " kg/ha" : "Not required"}</li>
      <li>B: ${micro.B ? micro.B + " kg/ha" : "Not required"}</li>
      <li>Cu: ${micro.Cu ? micro.Cu + " kg/ha" : "Not required"}</li>
    </ul>
  `;

  let irrigationTable = `
    <table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
      <tr>
        <th>${t('th_days', 'Days')}</th>
        <th>${t('th_litres_per_day', 'Litres per Day')}</th>
        <th>${t('th_total_week', 'Total per Week')}</th>
      </tr>
      <tr>
        <td>${irrigation.days}</td>
        <td>${irrigation.litresPerDay.toLocaleString()} L</td>
        <td>${weeklyTotal.toLocaleString()} L</td>
      </tr>
    </table>
  `;

  // Tillage operations table
  const tillageOps = [
    { op: "Primary Tillage", opKey: "primary_tillage", offset: -30, info: "Ploughing", infoKey: "ploughing_desc" },
    { op: "Secondary Tillage", opKey: "secondary_tillage", offset: -15, info: "Harrowing", infoKey: "harrowing_desc" },
    { op: "Final Tillage", opKey: "final_tillage", offset: -5, info: "Planking", infoKey: "planking_desc" }
  ];

  let tillageTable = `<table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
    <tr>
      <th>${t('th_tillage_date', 'Date')}</th>
      <th>${t('th_tillage_operation', 'Operation')}</th>
      <th>${t('th_tillage_details', 'Details')}</th>
    </tr>`;
  tillageOps.forEach(tOp => {
    tillageTable += `<tr><td>${formatDate(addDays(sowing, tOp.offset))}</td><td>${t(tOp.opKey, tOp.op)}</td><td>${t(tOp.infoKey, tOp.info)}</td></tr>`;
  });
  tillageTable += `</table>`;

  // Preventive weed management table
  const preventiveMethods = [
    { method: "Cultural method", methodKey: "cultural_method", info: "Crop rotation, timely sowing, proper spacing, clean cultivation", infoKey: "cultural_desc" },
    { method: "Mechanical method", methodKey: "mechanical_method", info: "Hand weeding, hoeing, use of implements", infoKey: "mechanical_desc" },
    { method: "Chemical method", methodKey: "chemical_method", info: "Application of herbicides as per recommendations", infoKey: "chemical_desc" },
    { method: "Biological method", methodKey: "biological_method", info: "Use of bioagents, allelopathic crops", infoKey: "biological_desc" },
    { method: "Integrated weed management (IWM)", methodKey: "iwm_method", info: "Combination of cultural, mechanical, chemical, and biological methods", infoKey: "iwm_desc" }
  ];

  let preventiveTable = `<table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
    <tr>
      <th>${t('th_weed_management', 'Weed Management')}</th>
      <th>${t('th_weed_description', 'Description')}</th>
    </tr>`;
  preventiveMethods.forEach(m => {
    preventiveTable += `<tr><td>${t(m.methodKey, m.method)}</td><td>${t(m.infoKey, m.info)}</td></tr>`;
  });
  preventiveTable += `</table>`;

  // Seed recommendation HTML
  const seedHTML = `
    <h4 style="font-size:24px; margin-top:20px;">🌱 ${t('seed_recommendation_title', 'Recommended Seeds')}</h4>
    <table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
      <tr>
        <th>${t('th_crop', 'Crop')}</th>
        <th>${t('th_seed_rate', 'Seed Rate (kg/ha)')}</th>
        <th>${t('th_area', 'Area (ha)')}</th>
        <th>${t('th_total_seeds', 'Total Seeds Required (kg)')}</th>
        <th>${t('th_varieties', 'Recommended Varieties')}</th>
      </tr>
      <tr><td>${crop.charAt(0).toUpperCase() + crop.slice(1)}</td><td>${cropSeed.rate}</td><td>${area}</td><td>${seedKg}</td><td>${cropSeed.variety}</td></tr>
    </table>
  `;


  let mlPred = data.mlPrediction || null;
  if (!mlPred && window.calculateClientRFPrediction) {
    mlPred = window.calculateClientRFPrediction({
      crop: crop,
      area: area,
      soil_type: data.soilType || "alluvial",
      soil_texture: data.soilTexture || "loamy",
      n: data.soilTestN,
      p: data.soilTestP,
      k: data.soilTestK
    });
  }
  let mlHTML = "";
  if (mlPred) {
    const fallbackBadge = mlPred.fallback_used
      ? `<span style="background:#fff3e0;color:#e65100;padding:2px 8px;border-radius:6px;font-size:0.75rem;font-weight:600;margin-left:8px;">⚠️ Auto Fallback Applied</span>`
      : "";
    mlHTML = `
      <div style="background:linear-gradient(135deg, #e8f5e9 0%, #e3f2fd 100%); border:1px solid #81c784; padding:18px 20px; margin-bottom:24px; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.4rem;">🤖</span>
            <div>
              <strong style="color:#1b5e20; font-size:1.1rem;">Machine Learning Prediction Result</strong>
              <div style="font-size:0.85rem; color:#455a64;">
                Model: <strong>${mlPred.model_name || "scikit-learn Predictor"}</strong>
                <span style="background:#1565c0; color:#fff; padding:2px 6px; border-radius:4px; font-size:0.75rem; margin-left:6px; font-weight:600;">${mlPred.model_version || "v1.0.0"}</span>
                ${fallbackBadge}
              </div>
            </div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px; margin-top:10px;">
          <div style="background:white; padding:10px 14px; border-radius:8px; border-left:4px solid #2e7d32;">
            <div style="font-size:0.75rem; color:#666; text-transform:uppercase; font-weight:600;">Predicted Yield</div>
            <div style="font-size:1.2rem; font-weight:700; color:#2e7d32;">${mlPred.predicted_yield_t_ha} tonnes / ha</div>
          </div>
          <div style="background:white; padding:10px 14px; border-radius:8px; border-left:4px solid #1565c0;">
            <div style="font-size:0.75rem; color:#666; text-transform:uppercase; font-weight:600;">Total Harvest (${area} ha)</div>
            <div style="font-size:1.2rem; font-weight:700; color:#1565c0;">${mlPred.total_expected_yield_tons} tonnes</div>
          </div>
          <div style="background:white; padding:10px 14px; border-radius:8px; border-left:4px solid #ff9800;">
            <div style="font-size:0.75rem; color:#666; text-transform:uppercase; font-weight:600;">Model Confidence</div>
            <div style="font-size:1.2rem; font-weight:700; color:#e65100;">${Math.round((mlPred.confidence_score || 0.95) * 100)}%</div>
          </div>
        </div>
      </div>
    `;
  }

  const resultsHTML = `
    <div style="background:#e8f5e9; padding:15px; border-left:4px solid #2e7d32; margin-bottom:20px; border-radius:4px;">
      <p style="margin:0; color:#1b5e20; font-weight:bold;">✓ ICAR-Recommended Inputs Report</p>
      <p style="margin:5px 0 0 0; color:#388e3c; font-size:13px;">${icarInfo.ref} | Expected Yield: ${icarInfo.yield}</p>
    </div>

    ${mlHTML}

    <h2>${t('results_title', '🌾 Recommended Inputs')}</h2>



    <h4 style="font-size:24px; margin-top:20px;">🌿 ${t('organic_fertilizers', 'Organic Fertilizers')}</h4>
    ${organicTable}

    <h4 style="font-size:24px; margin-top:20px;">🔹 ${t('chemical_fertilizers', 'Chemical Fertilizers')}</h4>
    ${chemicalTable}

    <h4 style="margin-top:20px;">${t('micro_nutrients_title', 'Micro Nutrients (Optional)')}</h4>
    ${microNutrients}

    ${seedHTML}

    <h4 style="font-size:24px; margin-top:20px;">💧 ${t('irrigation_title', 'Irrigation Schedule (Weekly)')}</h4>
    ${irrigationTable}

    <h4 style="font-size:24px; margin-top:20px;">🚜 ${t('tillage_operations_title', 'Tillage Operations')}</h4>
    ${tillageTable}

    <h4 style="font-size:24px; margin-top:20px;">🛡️ ${t('weed_management_title', 'Weed Management')}</h4>
    ${preventiveTable}

    <!-- Chart containers moved here to appear after weed management -->
    <div id="npk-bar-chart-container"></div>
    <div id="micro-pie-chart-container"></div>
    <div id="extra-visualization-container"></div>

    <div style="background:#fff3e0; padding:12px; margin-top:25px; border-radius:4px; font-size:12px; color:#e65100;">
      <strong>📋 ${t('note_label', 'Note:')}</strong> These recommendations follow ${icarInfo.ref}. Adjust based on local soil conditions and rainfall pattern.
    </div>
  `;

  resultsContainer.innerHTML = resultsHTML;

  // Render extra visualizations after weed management
  try {
    let stored = sessionStorage.getItem("calculationResults");
    let resultsData = stored ? JSON.parse(stored) : null;
    // Fallback demo data if missing or incomplete
    if (!resultsData || !resultsData.recommendedN || !resultsData.recommendedP || !resultsData.recommendedK) {
      resultsData = {
        recommendedN: 100,
        recommendedP: 50,
        recommendedK: 40,
        microValues: { Zn: 2, Fe: 3, B: 1, Cu: 0.5 },
        area: 1.5,
        expectedYield: 5.5
      };
    }
    if (window.renderExtraVisualizations) {
      window.renderExtraVisualizations(resultsData);
    }
  } catch (e) { /* ignore */ }
}

// Initialize on page load and re-render on language change
window.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("selectedLanguage") || "en";
  renderResults(savedLang);
});

document.addEventListener("languageChanged", (e) => {
  renderResults(e.detail && e.detail.lang);
});

// ==================== Logout Function ====================
function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("calculationResults");
    window.location.href = "login.html";
  }
}

// ==================== Go Back to Calculator ====================
function goBackToCalculator() {
  window.location.href = "index.html";
}

// ==================== Download as HTML ====================
function downloadPDF() {
  const exportContainer = document.getElementById("pdf-export-container");
  if (!exportContainer) {
    alert("No results to download. Please generate recommendations first.");
    return;
  }
  // Temporarily add page-breaks if needed (optional, for long content)
  // [...exportContainer.querySelectorAll('.section')].forEach((el, i) => {
  //   if (i > 0) el.classList.add('pdf-page-break');
  // });
  const opt = {
    margin: [10, 10, 10, 10], // 10mm margin on all sides
    filename: `agri-recommendations-${new Date().toISOString().split('T')[0]}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      windowWidth: exportContainer.scrollWidth,
      windowHeight: exportContainer.scrollHeight,
      scrollY: 0
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };
  html2pdf().set(opt).from(exportContainer).save();
}

