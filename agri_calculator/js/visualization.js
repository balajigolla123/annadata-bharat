// js/visualization.js
// Adds visualizations to the results page based on user crop and ICAR data

// Use window 'load' so this runs AFTER results.js has finished
// populating the #results container, avoiding our charts being
// wiped out by innerHTML assignments.
// Expose a function to render extra visualizations after weed management

window.renderExtraVisualizations = function(results) {
  try {
    if (!window.Chart) { console.warn('Chart.js not loaded'); return; }
    if (!results) { console.warn('No results data'); return; }

    // Render NPK Bar Chart in its dedicated container (or fallback)
    let npkBarDiv = document.getElementById('npk-bar-chart-container');
    if (!npkBarDiv) {
      npkBarDiv = document.getElementById('extra-visualization-container');
    }
    if (npkBarDiv) {
      npkBarDiv.innerHTML =
        '<h3 style="text-align:center;font-size:1.15rem;margin:0 0 10px;color:#2e7d32;">NPK Recommendation (kg/ha)</h3>' +
        '<canvas id="extraNpkBar" width="700" height="320"></canvas>';
      const ctxNpkBar = document.getElementById('extraNpkBar').getContext('2d');
      new Chart(ctxNpkBar, {
        type: 'bar',
        data: {
          labels: ['N', 'P', 'K'],
          datasets: [{
            label: 'Recommended',
            data: [results.recommendedN || 0, results.recommendedP || 0, results.recommendedK || 0],
            backgroundColor: ['#388e3c', '#fbc02d', '#1976d2']
          }]
        },
        options: {
          responsive: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, title: { display: true, text: 'kg/ha' } } }
        }
      });
    }

    // Render Micro-nutrient Pie Chart in its dedicated container (or fallback)
    let microPieDiv = document.getElementById('micro-pie-chart-container');
    if (!microPieDiv) {
      microPieDiv = document.getElementById('extra-visualization-container');
    }
    if (microPieDiv && results.microValues && (results.microValues.Zn || results.microValues.Fe || results.microValues.B || results.microValues.Cu)) {
      microPieDiv.innerHTML +=
        '<h3 style="text-align:center;font-size:1.15rem;margin:0 0 10px;color:#2e7d32;">Micro Nutrient Distribution (kg/ha)</h3>' +
        '<canvas id="extraMicroPie" width="700" height="320"></canvas>';
      const ctxMicroPie = document.getElementById('extraMicroPie').getContext('2d');
      new Chart(ctxMicroPie, {
        type: 'pie',
        data: {
          labels: ['Zinc (Zn)', 'Iron (Fe)', 'Boron (B)', 'Copper (Cu)'],
          datasets: [{
            label: 'Micro-nutrients (kg/ha)',
            data: [results.microValues.Zn || 0, results.microValues.Fe || 0, results.microValues.B || 0, results.microValues.Cu || 0],
            backgroundColor: ['#8d6e63', '#90caf9', '#ffd54f', '#a5d6a7']
          }]
        },
        options: {
          responsive: false,
          plugins: { legend: { display: true, position: 'bottom' } }
        }
      });
    }

    // 3. Column chart: Land area vs. expected yield (if available)
    if (results.expectedYield && results.area) {
      let extraDiv = document.getElementById('extra-visualization-container');
      if (!extraDiv) {
        extraDiv = document.createElement('div');
        extraDiv.id = 'extra-visualization-container';
        document.body.appendChild(extraDiv);
      }
      const colDiv = document.createElement('div');
      colDiv.style = 'width:700px;max-width:98vw;margin:32px auto;';
      colDiv.innerHTML =
        '<h3 style="text-align:center;font-size:1.15rem;margin:0 0 10px;color:#2e7d32;">Land Area vs Expected Yield</h3>' +
        '<canvas id="extraColChart" width="700" height="320"></canvas>';
      extraDiv.appendChild(colDiv);
      const ctxCol = document.getElementById('extraColChart').getContext('2d');
      new Chart(ctxCol, {
        type: 'bar',
        data: {
          labels: ['Land Area (ha)', 'Expected Yield'],
          datasets: [{
            label: 'Details',
            data: [results.area, parseFloat(results.expectedYield) || 0],
            backgroundColor: ['#43a047', '#fbc02d']
          }]
        },
        options: {
          responsive: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true } }
        }
      });
    }
  } catch (err) {
    console.error('[renderExtraVisualizations] error:', err);
  }
};

  // --- Irrigation Bar Chart: Daily vs Weekly Water ---
  if (typeof results.irrigationLitresPerDay === "number" &&
      typeof results.irrigationWeeklyTotal === "number" &&
      window.Chart) {
    const chartDiv = document.createElement('div');
    chartDiv.id = 'irrigationChartContainer';
    chartDiv.style = 'width:700px;max-width:98vw;margin:32px auto;';
    chartDiv.innerHTML = ''
      + '<h3 style="text-align:center;font-size:1.15rem;margin:0 0 10px;color:#2e7d32;">'
      + 'Irrigation Water Requirement (Litres)'
      + '</h3>'
      + '<canvas id="irrigationChart" width="700" height="320"></canvas>';

    insertAfterAnchor(chartDiv);

    const ctx = document.getElementById('irrigationChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Per Day', 'Per Week'],
        datasets: [{
          label: 'Irrigation Requirement (Litres)',
          data: [results.irrigationLitresPerDay, results.irrigationWeeklyTotal],
          backgroundColor: ['#29b6f6', '#0288d1']
        }]
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Litres' }
          }
        }
      }
    });
  }

function drawNPKChart(npk, type) {
  if (!window.Chart) return;
  const ctx = document.getElementById('npkChart').getContext('2d');
  new Chart(ctx, {
    type: type,
    data: {
      labels: ['Nitrogen (N)', 'Phosphorus (P)', 'Potassium (K)'],
      datasets: [{
        label: 'NPK Recommendation (kg/ha)',
        data: [npk.N, npk.P, npk.K],
        backgroundColor: ['#388e3c', '#fbc02d', '#1976d2']
      }]
    },
    options: {
      responsive: false,
      plugins: { legend: { display: type !== 'bar' } },
      scales: type==='bar'||type==='radar'?{ y: { beginAtZero: true } }:{}
    }
  });
}

function drawMicroChart(micro, type) {
  if (!window.Chart) return;
  const ctx = document.getElementById('microChart').getContext('2d');
  new Chart(ctx, {
    type: type,
    data: {
      labels: ['Zinc (Zn)', 'Iron (Fe)', 'Boron (B)', 'Copper (Cu)'],
      datasets: [{
        label: 'Micro-nutrients (kg/ha)',
        data: [micro.Zn, micro.Fe, micro.B, micro.Cu],
        backgroundColor: ['#8d6e63', '#90caf9', '#ffd54f', '#a5d6a7']
      }]
    },
    options: {
      responsive: false,
      plugins: { legend: { display: true } }
    }
  });
}
