// ==================== Download PDF Function ====================
function downloadPDF() {
  // Use html2pdf to download the main container as PDF
  const element = document.querySelector('.container');
  if (!element) {
    alert('No content to download!');
    return;
  }
  html2pdf().set({
    margin: 0.5,
    filename: 'recommendations.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  }).from(element).save();
}
// ==================== Authentication Check & MongoDB Health ====================
window.addEventListener("DOMContentLoaded", async () => {
  const currentUser = sessionStorage.getItem("currentUser");
  
  if (!currentUser) {
    // Redirect to login if not authenticated
    window.location.href = "login.html";
    return;
  }

  // Display user name
  const user = JSON.parse(currentUser);
  const nameEl = document.getElementById("userName");
  if (nameEl) nameEl.textContent = `👤 ${user.name}`;
});

// ==================== Logout Function ====================
function handleLogout() {
  if (confirm("Are you sure you want to logout?")) {
    sessionStorage.removeItem("currentUser");
    window.location.href = "login.html";
  }
}

// ==================== Calculator Function ====================
async function calculate(renderOnly = false) {

  // If rendering only, load previous results from sessionStorage
  let crop, area, soilType, soilTexture, sowingDate;
  if (renderOnly) {
    const prev = JSON.parse(sessionStorage.getItem("calculationResults"));
    crop = prev.crop;
    area = prev.area;
    soilType = prev.soilType;
    soilTexture = prev.soilTexture;
    sowingDate = prev.sowingDate;
  } else {
    const cropEl = document.getElementById("crop");
    const cropSearchEl = document.getElementById("cropSearch");
    let resolvedCrop = "";
    if (cropEl && cropEl.value && cropEl.value !== "other") {
      resolvedCrop = cropEl.value;
    } else if (cropSearchEl && cropSearchEl.value.trim()) {
      resolvedCrop = cropSearchEl.value.trim();
    } else if (cropEl && cropEl.value) {
      resolvedCrop = cropEl.value;
    }
    crop = (resolvedCrop || "").toLowerCase().trim();

    area = parseFloat(document.getElementById("area") ? document.getElementById("area").value : NaN);
    soilType = document.getElementById("soilType") ? document.getElementById("soilType").value : "";
    soilTexture = document.getElementById("soilTexture") ? document.getElementById("soilTexture").value : "";
    sowingDate = document.getElementById("sowingDate") ? document.getElementById("sowingDate").value : "";
  }

  // --- Seed Rate and Variety Data (per hectare, example values) ---
  const seedData = {
    rice: {rate: 40, variety: 'IR 64, MTU 1010, Pusa Basmati'},
    wheat: {rate: 100, variety: 'HD 2967, PBW 343, Lok 1'},
    maize: {rate: 20, variety: 'HQPM 1, Bio 9637, DKC 9125'},
    cotton: {rate: 2.5, variety: 'Bunny Bt, RCH 2 Bt, Suraj'},
    tomato: {rate: 0.3, variety: 'Pusa Ruby, Arka Vikas, Punjab Chhuhara'},
    groundnut: {rate: 120, variety: 'JL 24, TG 26, GG 20'},
    sugarcane: {rate: 5000, variety: 'Co 86032, Co 0238, CoJ 64'}
  };
  // If crop not in seedData, pick a specific local variety type
  let cropSeed;
  if (seedData[crop]) {
    cropSeed = seedData[crop];
  } else {
    // Pick a type based on crop name or cycle (simple logic)
    let types = [
      'Early maturing variety (local)',
      'Medium maturing variety (local)',
      'Late maturing variety',
      'Rabi variety',
      'Kharif variety',
      'Jaid variety'
    ];
    // Optionally, pick based on crop or random
    let varietyType = types[Math.floor(Math.random() * types.length)];
    cropSeed = {rate: 10, variety: varietyType};
  }
  const seedKg = (cropSeed.rate * area).toFixed(1);

  const n = parseFloat(document.getElementById("n").value);
  const p = parseFloat(document.getElementById("p").value);
  const k = parseFloat(document.getElementById("k").value);
  const zn = parseFloat(document.getElementById("zn").value);
  const fe = parseFloat(document.getElementById("fe").value);
  const b = parseFloat(document.getElementById("b").value);
  const cu = parseFloat(document.getElementById("cu").value);
  const ph = parseFloat(document.getElementById("ph") ? document.getElementById("ph").value : NaN);
  const selectedModel = "random_forest";

  if (!renderOnly && (!crop || !soilType || !soilTexture || !sowingDate || isNaN(area) || area <= 0)) {
    alert("Please fill all mandatory fields correctly");
    return;
  }

  const sowing = new Date(sowingDate);

  // ICAR Recommended NPK doses (kg/ha) - As per ICAR guidelines
  let base = {
    rice: {N:100,P:50,K:40,organicDosages:2, chemicalDosages:3, icarRef:"ICAR Rice Package"},
    wheat:{N:120,P:60,K:40,organicDosages:2, chemicalDosages:2, icarRef:"ICAR Wheat Package"},
    maize:{N:150,P:75,K:60,organicDosages:2, chemicalDosages:3, icarRef:"ICAR Maize Package"},
    cotton:{N:120,P:60,K:60,organicDosages:3, chemicalDosages:3, icarRef:"ICAR Cotton Package"},
    tomato:{N:150,P:100,K:150,organicDosages:2, chemicalDosages:3, icarRef:"ICAR Vegetable Package"},
    groundnut:{N:25,P:40,K:40,organicDosages:1, chemicalDosages:2, icarRef:"ICAR Groundnut Package"},
    sugarcane:{N:150,P:75,K:75,organicDosages:3, chemicalDosages:4, icarRef:"ICAR Sugarcane Package"}
  };

  let N = base[crop]?.N || 100;
  let P = base[crop]?.P || 50;
  let K = base[crop]?.K || 50;
  let organicDosagesCount = base[crop]?.organicDosages || 2;
  let chemicalDosagesCount = base[crop]?.chemicalDosages || 2;

  if (!isNaN(n)) N = adjustValue(N, n, [100,200]);
  if (!isNaN(p)) P = adjustValue(P, p, [15,30]);
  if (!isNaN(k)) K = adjustValue(K, k, [60,120]);

  // Soil Texture adjustments
  if (soilTexture === "sandy") { N*=1.05; P*=1.1; K*=1.15; }
  else if (soilTexture === "clay") { N*=0.95; P*=0.9; K*=0.85; }

  // Micro Nutrients
  let micro = {Zn:0, Fe:0, B:0, Cu:0};
  if (!isNaN(zn) && zn<0.6) micro.Zn=5;
  if (!isNaN(fe) && fe<4) micro.Fe=10;
  if (!isNaN(b) && b<0.3) micro.B=1;
  if (!isNaN(cu) && cu<0.3) micro.Cu=2;

  // Fertilizer quantities (kg)
  let fertilizers = {
    urea: (N * area)/0.46,
    ammonium_sulfate: (N * area)/0.21,
    dap: (P * area)/0.18,
    ssp: (P * area)/0.16,
    mop: (K * area)/0.60,
    sop: (K * area)/0.50,
    FYM: area*10000,
    Vermicompost: area*2500,
    BoneMeal: area*500,
    NeemCake: area*200
  };

  const result = document.getElementById("result");
  result.style.display = "block";
  const lang = (localStorage.getItem('selectedLanguage') || 'en');

  // ----------------- Organic Fertilizer Table (dynamic dosages) -----------------
  const organicDosages = [];
  for (let i=0; i<organicDosagesCount; i++) {
    let dayOffset = -15 + Math.floor(i * 15); // first dose before sowing, then spaced
    organicDosages.push({
      label: `DOSAGE ${i+1}`,
      date: formatDate(addDays(sowing, dayOffset)),
      fertilizers: [
        {material:"FYM", qty: (fertilizers.FYM / organicDosagesCount).toFixed(0)},
        {material:"Vermicompost", qty: (fertilizers.Vermicompost / organicDosagesCount).toFixed(0)},
        {material:"Bone Meal", qty: (fertilizers.BoneMeal / organicDosagesCount).toFixed(0)},
        {material:"Neem Cake", qty: (fertilizers.NeemCake / organicDosagesCount).toFixed(0)},
        {material:"OR", qty:null},
        {material:"Compost", qty: (fertilizers.FYM / organicDosagesCount * 0.8).toFixed(0)},
        {material:"Biofertilizer", qty: (fertilizers.Vermicompost / organicDosagesCount * 0.7).toFixed(0)}
      ]
    });
  }

  let organicTable = `<table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
    <tr>
      <th>${window.i18n.t(lang,'th_sno_date') || 'S.NO / DATE'}</th>
      <th>${window.i18n.t(lang,'th_fertilizer') || 'FERTILIZER'}</th>
      <th>${window.i18n.t(lang,'th_recommended_qty') || 'RECOMMENDED QTY'}</th>
    </tr>`;
  organicDosages.forEach(dosage => {
    organicTable += `<tr><td colspan="3" style="font-weight:bold;">${dosage.label}</td></tr>`;
    let mainFerts = dosage.fertilizers.filter(f => f.material === "FYM" || f.material === "Vermicompost" || f.material === "Bone Meal" || f.material === "Neem Cake");
    let subFerts = dosage.fertilizers.filter(f => f.material === "Compost" || f.material === "Biofertilizer");
    mainFerts.forEach(f => {
      organicTable += `<tr><td>${dosage.date}</td><td>${window.i18n.t(lang, 'fert_' + f.material.toLowerCase().replace(/\s/g, '_')) || f.material}</td><td>${f.qty} KG</td></tr>`;
    });
    organicTable += `<tr><td></td><td style="font-weight:bold;">${window.i18n.t(lang,'or_label') || 'OR'}</td><td></td></tr>`;
    subFerts.forEach(f => {
      organicTable += `<tr><td>${dosage.date}</td><td>${window.i18n.t(lang, 'fert_' + f.material.toLowerCase().replace(/\s/g, '_')) || f.material}</td><td>${f.qty} KG</td></tr>`;
    });
  });
  organicTable += `</table>`;

  // ----------------- Chemical Fertilizer Table (dynamic dosages) -----------------
  const chemicalDosages = [];
  for (let i=0; i<chemicalDosagesCount; i++) {
    let dayOffset = Math.floor(i * 15); // first dose at sowing, then spaced
    chemicalDosages.push({
      label: `DOSAGE ${i+1}`,
      date: formatDate(addDays(sowing, dayOffset)),
      fertilizers: [
        {material:"DAP", qty: (fertilizers.dap / chemicalDosagesCount).toFixed(0)},
        {material:"Urea", qty: (fertilizers.urea / chemicalDosagesCount).toFixed(0)},
        {material:"OR", qty:null},
        {material:"Ammonium Sulfate", qty: (fertilizers.ammonium_sulfate / chemicalDosagesCount).toFixed(0)},
        {material:"TSP", qty: (fertilizers.ssp / chemicalDosagesCount).toFixed(0)},
        {material:"Potassium nitrate", qty: (fertilizers.sop / chemicalDosagesCount).toFixed(0)},
        {material:"MOP", qty: (fertilizers.mop / chemicalDosagesCount).toFixed(0)}
      ]
    });
  }

  let chemicalTable = `<table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
    <tr>
      <th>${window.i18n.t(lang,'th_sno_date') || 'S.NO / DATE'}</th>
      <th>${window.i18n.t(lang,'th_fertilizer') || 'FERTILIZER'}</th>
      <th>${window.i18n.t(lang,'th_recommended_qty') || 'RECOMMENDED QTY'}</th>
    </tr>`;
  chemicalDosages.forEach(dosage => {
    chemicalTable += `<tr><td colspan="3" style="font-weight:bold;">${dosage.label}</td></tr>`;
    dosage.fertilizers.forEach(f => {
      if(f.material === "OR") {
        chemicalTable += `<tr><td></td><td style="font-weight:bold;">${window.i18n.t(lang,'or_label') || 'OR'}</td><td></td></tr>`;
      } else {
        chemicalTable += `<tr><td>${dosage.date}</td><td>${window.i18n.t(lang, 'fert_' + f.material.toLowerCase().replace(/\s/g, '_')) || f.material}</td><td>${f.qty} KG</td></tr>`;
      }
    });
  });
  chemicalTable += `</table>`;

  // ----------------- Irrigation Schedule -----------------
  const irrigationData = {
    rice: {days:"Mon, Wed, Fri", litresPerDay:300000},
    wheat:{days:"Tue, Thu, Sat", litresPerDay:200000},
    maize:{days:"Mon, Thu, Sat", litresPerDay:250000},
    cotton:{days:"Tue, Thu, Sat", litresPerDay:220000},
    tomato:{days:"Mon, Wed, Fri", litresPerDay:180000},
    groundnut:{days:"Mon, Thu, Sat", litresPerDay:150000},
    sugarcane:{days:"Mon, Wed, Fri", litresPerDay:400000}
  };
  const irrigation = irrigationData[crop] || {days:"Mon, Wed, Fri", litresPerDay:200000};
  const irrigationDaysPerWeek = irrigation.days.split(",").length;
  const weeklyTotal = irrigation.litresPerDay * irrigationDaysPerWeek;

  // Build micro nutrients HTML
  let microNutrients = `
    <ul>
      <li>Zn: ${micro.Zn?micro.Zn+" kg/ha":"Not required"}</li>
      <li>Fe: ${micro.Fe?micro.Fe+" kg/ha":"Not required"}</li>
      <li>B: ${micro.B?micro.B+" kg/ha":"Not required"}</li>
      <li>Cu: ${micro.Cu?micro.Cu+" kg/ha":"Not required"}</li>
    </ul>
  `;

  // Build irrigation table HTML
  let irrigationTable = `
    <table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
      <tr>
        <th>${window.i18n.t(lang,'th_days') || 'Days'}</th>
        <th>${window.i18n.t(lang,'th_litres_per_day') || 'Litres per Day'}</th>
        <th>${window.i18n.t(lang,'th_total_week') || 'Total per Week'}</th>
      </tr>
      <tr>
        <td>${irrigation.days}</td>
        <td>${irrigation.litresPerDay.toLocaleString()} L</td>
        <td>${weeklyTotal.toLocaleString()} L</td>
      </tr>
    </table>
  `;

  // Build tillage operations table
  const tillageOps = [
    {op: 'Primary Tillage', opKey: 'primary_tillage', offset: -30, info: 'Ploughing', infoKey: 'ploughing_desc'},
    {op: 'Secondary Tillage', opKey: 'secondary_tillage', offset: -15, info: 'Harrowing', infoKey: 'harrowing_desc'},
    {op: 'Final Tillage', opKey: 'final_tillage', offset: -5, info: 'Planking', infoKey: 'planking_desc'}
  ];
  let tillageTable = `<table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
    <tr>
      <th>${window.i18n.t(lang,'th_tillage_date') || 'Date'}</th>
      <th>${window.i18n.t(lang,'th_tillage_operation') || 'Operation'}</th>
      <th>${window.i18n.t(lang,'th_tillage_details') || 'Details'}</th>
    </tr>`;
  tillageOps.forEach(t => {
    tillageTable += `<tr><td>${formatDate(addDays(sowing, t.offset))}</td><td>${window.i18n.t(lang, t.opKey) || t.op}</td><td>${window.i18n.t(lang, t.infoKey) || t.info}</td></tr>`;
  });
  tillageTable += `</table>`;

  // Build preventive methods table
  const preventiveMethods = [
    {method: 'Cultural method', methodKey: 'cultural_method', info: 'Crop rotation, timely sowing, proper spacing, clean cultivation', infoKey: 'cultural_desc'},
    {method: 'Mechanical method', methodKey: 'mechanical_method', info: 'Hand weeding, hoeing, use of implements', infoKey: 'mechanical_desc'},
    {method: 'Chemical method', methodKey: 'chemical_method', info: 'Application of herbicides as per recommendations', infoKey: 'chemical_desc'},
    {method: 'Biological method', methodKey: 'biological_method', info: 'Use of bioagents, allelopathic crops', infoKey: 'biological_desc'},
    {method: 'Integrated weed management (IWM)', methodKey: 'iwm_method', info: 'Combination of cultural, mechanical, chemical, and biological methods', infoKey: 'iwm_desc'}
  ];
  let preventiveTable = `<table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
    <tr>
      <th>${window.i18n.t(lang,'th_weed_management') || 'Weed Management'}</th>
      <th>${window.i18n.t(lang,'th_weed_description') || 'Description'}</th>
    </tr>`;
  preventiveMethods.forEach(m => {
    preventiveTable += `<tr><td>${window.i18n.t(lang, m.methodKey) || m.method}</td><td>${window.i18n.t(lang, m.infoKey) || m.info}</td></tr>`;
  });
  preventiveTable += `</table>`;

  // Get ICAR reference
  const cropData = {
    rice: {ref: "ICAR Rice Package", yield: "5-6 t/ha"},
    wheat: {ref: "ICAR Wheat Package", yield: "5-5.5 t/ha"},
    maize: {ref: "ICAR Maize Package", yield: "7-8 t/ha"},
    cotton: {ref: "ICAR Cotton Package", yield: "20-22 bales/ha"},
    tomato: {ref: "ICAR Vegetable Package", yield: "40-45 t/ha"},
    groundnut: {ref: "ICAR Groundnut Package", yield: "2.5-3 t/ha"},
    sugarcane: {ref: "ICAR Sugarcane Package", yield: "70-80 t/ha"}
  };
  const icarInfo = cropData[crop] || {ref: "ICAR Package", yield: "As per package"};

  // Build full results HTML
  // --- Seed Recommendation HTML ---
  const seedHTML = `
    <h4 style="font-size:24px; margin-top:20px;">🌱 ${window.i18n.t(lang,'seed_recommendation_title')}</h4>
    <table border="1" style="width:100%; border-collapse:collapse; text-align:center;">
      <tr>
        <th>${window.i18n.t(lang,'th_crop') || 'Crop'}</th>
        <th>${window.i18n.t(lang,'th_seed_rate') || 'Seed Rate (kg/ha)'}</th>
        <th>${window.i18n.t(lang,'th_area') || 'Area (ha)'}</th>
        <th>${window.i18n.t(lang,'th_total_seeds') || 'Total Seeds Required (kg)'}</th>
        <th>${window.i18n.t(lang,'th_varieties') || 'Recommended Varieties'}</th>
      </tr>
      <tr><td>${crop.charAt(0).toUpperCase() + crop.slice(1)}</td><td>${cropSeed.rate}</td><td>${area}</td><td>${seedKg}</td><td>${cropSeed.variety}</td></tr>
    </table>
  `;

  const resultsHTML = `
    <div style="background:#e8f5e9; padding:15px; border-left:4px solid #2e7d32; margin-bottom:20px; border-radius:4px;">
      <p style="margin:0; color:#1b5e20; font-weight:bold;">✓ ICAR-Recommended Inputs Report</p>
      <p style="margin:5px 0 0 0; color:#388e3c; font-size:13px;">${icarInfo.ref} | Expected Yield: ${icarInfo.yield}</p>
    </div>

    <h2>${window.i18n.t(lang,'results_title')}</h2>

    <h4 style="font-size:24px; margin-top:20px;">🌿 ${window.i18n.t(lang,'organic_fertilizers')}</h4>
    ${organicTable}

    <h4 style="font-size:24px; margin-top:20px;">🔹 ${window.i18n.t(lang,'chemical_fertilizers')}</h4>
    ${chemicalTable}

    <h4 style="margin-top:20px;">${window.i18n.t(lang,'micro_nutrients_title')}</h4>
    ${microNutrients}

    ${seedHTML}

    <h4 style="font-size:24px; margin-top:20px;">💧 ${window.i18n.t(lang,'irrigation_title')}</h4>
    ${irrigationTable}

    <h4 style="font-size:24px; margin-top:20px;">🚜 ${window.i18n.t(lang,'tillage_operations_title')}</h4>
    ${tillageTable}

    <h4 style="font-size:24px; margin-top:20px;">🛡️ ${window.i18n.t(lang,'weed_management_title')}</h4>
    ${preventiveTable}

    <div style="background:#fff3e0; padding:12px; margin-top:25px; border-radius:4px; font-size:12px; color:#e65100;">
      <strong>📋 ${window.i18n.t(lang,'note_label')}</strong> These recommendations follow ${icarInfo.ref}. Adjust based on local soil conditions and rainfall pattern.
    </div>
  `;

  // Save results to MongoDB via PyMongo and sessionStorage
  if (!renderOnly) {
    const currentUser = JSON.parse(sessionStorage.getItem("currentUser") || "{}");
    const farmerPhone = currentUser.phone || "guest_farmer";
    const farmerName = currentUser.name || "Farmer";

    // 1. FEATURE 1: Save Farm Details in MongoDB via PyMongo
    if (window.AgriAPI) {
      try {
        await window.AgriAPI.saveFarmDetails({
          farmer_phone: farmerPhone,
          crop: crop,
          area: area,
          soil_type: soilType,
          soil_texture: soilTexture,
          sowing_date: sowingDate,
          soil_test: { n, p, k, ph, zn, fe, b, cu }
        });
        console.log("✅ Feature 1: Farm details stored in MongoDB via PyMongo");
      } catch (e) {
        console.warn("Farm details save notice:", e);
      }
    }

    // 2. FEATURE 4: Run ML Prediction & save predicted results + model version to MongoDB
    let mlPrediction = null;
    if (window.AgriAPI) {
      try {
        const mlRes = await window.AgriAPI.predictYield({
          farmer_phone: farmerPhone,
          crop: crop,
          area: area,
          soil_type: soilType,
          soil_texture: soilTexture,
          sowing_date: sowingDate,
          n: isNaN(n) ? null : n,
          p: isNaN(p) ? null : p,
          k: isNaN(k) ? null : k,
          ph: isNaN(ph) ? null : ph,
          model: selectedModel
        });
        if (mlRes && mlRes.success && mlRes.prediction) {
          mlPrediction = mlRes.prediction;
          console.log("✅ Feature 4: ML Prediction & Model Version saved in MongoDB:", mlPrediction);
        }
      } catch (e) {
        console.warn("ML Prediction inference notice:", e);
      }
    }

    // Ensure ML prediction is never null (Random Forest rf-v1.2.0 engine)
    if (!mlPrediction && window.calculateClientRFPrediction) {
      mlPrediction = window.calculateClientRFPrediction({
        crop, area, soil_type: soilType, soil_texture: soilTexture, n, p, k, ph
      });
    }

    // 3. FEATURE 2: Save full calculation snapshot to Recommendation History in MongoDB
    if (window.AgriAPI) {
      try {
        const recPayload = {
          farmer_phone: farmerPhone,
          farmer_name: farmerName,
          farm_details: {
            crop: crop,
            area: area,
            soil_type: soilType,
            soil_texture: soilTexture,
            sowing_date: sowingDate
          },
          recommended_npk: { N, P, K },
          seed_requirement: { rate_kg_ha: cropSeed.rate, total_kg: seedKg, variety: cropSeed.variety },
          ml_prediction: mlPrediction,
          fertilizer_schedule: {
            organicTable: organicTable,
            chemicalTable: chemicalTable,
            microNutrients: microNutrients
          },
          irrigation_plan: {
            litresPerDay: irrigation.litresPerDay,
            weeklyTotal: weeklyTotal,
            daysPerWeek: irrigationDaysPerWeek
          },
          icar_ref: icarInfo.ref,
          raw_results_html: resultsHTML
        };
        await window.AgriAPI.saveRecommendation(recPayload);
        console.log("✅ Feature 2: Recommendation History saved in MongoDB via PyMongo");
      } catch (e) {
        console.warn("Recommendation history save notice:", e);
      }
    }

    sessionStorage.setItem("calculationResults", JSON.stringify({
      html: resultsHTML,
      crop: crop,
      area: area,
      soilType: soilType,
      soilTexture: soilTexture,
      sowingDate: sowingDate,
      organicTable: organicTable,
      chemicalTable: chemicalTable,
      microNutrients: microNutrients,
      irrigationTable: irrigationTable,
      icarRef: icarInfo.ref,
      expectedYield: mlPrediction ? `${mlPrediction.predicted_yield_t_ha} t/ha (${mlPrediction.total_expected_yield_tons} tonnes total)` : icarInfo.yield,
      mlPrediction: mlPrediction,
      // Numeric values for visualizations
      recommendedN: N,
      recommendedP: P,
      recommendedK: K,
      soilTestN: isNaN(n) ? null : n,
      soilTestP: isNaN(p) ? null : p,
      soilTestK: isNaN(k) ? null : k,
      microValues: micro,
      irrigationLitresPerDay: irrigation.litresPerDay,
      irrigationWeeklyTotal: weeklyTotal,
      irrigationDaysPerWeek: irrigationDaysPerWeek
    }));

    // Redirect to results page
    window.location.href = "results.html";
  } else {
    // If rendering only, update the results div
    document.getElementById("results").innerHTML = resultsHTML;
  }
// ==================== Language Change Sync ====================
// Listen for language change and update results page
document.addEventListener('languageChanged', function(e) {
  if (window.location.pathname.endsWith('results.html')) {
    calculate(true);
  }
});
}

// ----------------- Helper Functions -----------------
function adjustValue(base, val, thresholds) {
  if (val >= thresholds[1]) return base*0.7;
  else if (val >= thresholds[0]) return base*0.85;
  return base;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate()+days);
  return d;
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
}
