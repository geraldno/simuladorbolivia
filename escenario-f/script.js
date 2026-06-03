// ===== ESCENARIO F: Rumores y Sistemas Mal Condicionados =====

let currentRumor = 'bajo';
let chartInstance = null;

document.querySelectorAll('.method-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentRumor = btn.dataset.method;
  });
});

// Factores de perturbación según tipo de rumor
const rumorFactores = {
  bajo:    { pct: 2,   label: 'Rumor bajo (+2%)' },
  medio:   { pct: 10,  label: 'Rumor medio (+10%)' },
  alto:    { pct: 30,  label: 'Rumor alto (+30%)' },
  panico:  { pct: 80,  label: 'Pánico de compra (+80%)' },
  stock:   { pct: -40, label: 'Reducción de stock (−40%)' },
};

// --- Multiplicación matriz-vector ---
function matVec(A, x) {
  return A.map(row => row.reduce((s, a, j) => s + a * x[j], 0));
}

// --- Norma infinita de vector ---
function normInf(v) { return Math.max(...v.map(Math.abs)); }

// --- Resolver 3x3 por eliminación gaussiana ---
function gaussElim(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let k = 0; k < n; k++) {
    // Pivoteo parcial
    let maxRow = k;
    for (let i = k+1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[maxRow][k])) maxRow = i;
    [M[k], M[maxRow]] = [M[maxRow], M[k]];
    for (let i = k+1; i < n; i++) {
      const f = M[i][k] / M[k][k];
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n-1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i+1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}

// --- Número de condición aproximado (norma ∞) ---
function numCondicion(A) {
  // ||A||_inf * ||A^-1||_inf
  const normA = Math.max(...A.map(row => row.reduce((s,v)=>s+Math.abs(v),0)));
  // Calcular A^-1 columna a columna
  const n = A.length;
  const invCols = [];
  for (let j = 0; j < n; j++) {
    const ej = Array.from({length:n}, (_,i) => i===j?1:0);
    try { invCols.push(gaussElim(A.map(r=>[...r]), ej)); }
    catch { return Infinity; }
  }
  // Construir A^-1 (transponer invCols)
  const invA = Array.from({length:n}, (_,i) => invCols.map(col => col[i]));
  const normInvA = Math.max(...invA.map(row => row.reduce((s,v)=>s+Math.abs(v),0)));
  return normA * normInvA;
}

// --- Construir matriz A según condicionamiento ---
function buildMatrix(tipo) {
  if (tipo === 'bien') {
    return [
      [4,  1,  0],
      [1,  3, -1],
      [0, -1,  4],
    ];
  }
  if (tipo === 'moderado') {
    return [
      [3.0, 2.9, 0.1],
      [2.9, 3.0, 0.2],
      [0.1, 0.2, 2.0],
    ];
  }
  // Mal condicionado (tipo Hilbert parcial)
  return [
    [1,    1/2,  1/3],
    [1/2,  1/3,  1/4],
    [1/3,  1/4,  1/5],
  ];
}

// --- SIMULAR ---
function simular() {
  const d1  = parseFloat(document.getElementById('d1').value)       || 100;
  const d2  = parseFloat(document.getElementById('d2').value)       || 150;
  const d3  = parseFloat(document.getElementById('d3').value)       || 120;
  const tipo = document.getElementById('condType').value;

  const A = buildMatrix(tipo);
  const b = [d1, d2, d3];

  // Solución original
  let x;
  try { x = gaussElim(A.map(r=>[...r]), [...b]); }
  catch { alert('Sistema singular, no tiene solución única.'); return; }

  // Perturbación según rumor
  const rumor = rumorFactores[currentRumor];
  const deltaPct = rumor.pct / 100;
  const db = b.map(v => v * deltaPct);
  const bPert = b.map((v, i) => v + db[i]);

  let xPert;
  try { xPert = gaussElim(A.map(r=>[...r]), [...bPert]); }
  catch { alert('Sistema singular tras perturbación.'); return; }

  const kappa   = numCondicion(A);
  const normDb  = normInf(db);
  const normB   = normInf(b);
  const normDx  = normInf(xPert.map((v,i)=>v-x[i]));
  const normX   = normInf(x);
  const errRel  = normDx / normX;
  const errRelB = normDb / normB;

  document.getElementById('resultsPanel').style.display = '';
  document.getElementById('methodBadge').textContent = rumor.label.toUpperCase();

  document.getElementById('resultGrid').innerHTML = `
    <div class="result-item">
      <span class="result-value">${kappa > 1e6 ? kappa.toExponential(2) : kappa.toFixed(1)}</span>
      <span class="result-label">κ(A) — Núm. Condición<br/><small>${tipo}</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">${(errRelB*100).toFixed(2)}%</span>
      <span class="result-label">Perturbación en b<br/><small>||δb||/||b||</small></span>
    </div>
    <div class="result-item">
      <span class="result-value" style="color:${errRel>0.5?'var(--accent-e)':'var(--accent-d)'}">${(errRel*100).toFixed(2)}%</span>
      <span class="result-label">Cambio en x<br/><small>||δx||/||x||</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">${(kappa * errRelB * 100).toFixed(1)}%</span>
      <span class="result-label">Cota teórica error<br/><small>κ · ||δb||/||b||</small></span>
    </div>
  `;

  // Tabla
  const vars = ['x₁ (Zona 1)', 'x₂ (Zona 2)', 'x₃ (Zona 3)'];
  document.getElementById('tableBody').innerHTML = vars.map((v, i) => {
    const cambio = xPert[i] - x[i];
    const pct    = x[i] !== 0 ? (cambio / Math.abs(x[i]) * 100).toFixed(2) : '—';
    return `<tr>
      <td>${v}</td>
      <td>${x[i].toFixed(4)}</td>
      <td>${xPert[i].toFixed(4)}</td>
      <td style="color:${Math.abs(cambio)>10?'var(--accent-e)':'inherit'}">${cambio.toFixed(4)}</td>
      <td>${pct}%</td>
    </tr>`;
  }).join('');

  // Info interpretativa
  const interpretacion = kappa > 1e4
    ? `⚠️ Sistema <strong>muy mal condicionado</strong> (κ ≈ ${kappa.toExponential(2)}). Un pequeño rumor del ${Math.abs(deltaPct*100)}% causa un error del ${(errRel*100).toFixed(1)}% en la distribución.`
    : kappa > 100
    ? `⚡ Sistema <strong>moderadamente mal condicionado</strong> (κ ≈ ${kappa.toFixed(0)}). El rumor amplifica el error ${(errRel/errRelB).toFixed(1)}x.`
    : `✓ Sistema <strong>bien condicionado</strong> (κ ≈ ${kappa.toFixed(1)}). El rumor no causa grandes distorsiones.`;
  document.getElementById('infoBox').innerHTML = interpretacion;

  renderChart(x, xPert, vars, rumor.label);
}

function renderChart(x, xPert, vars, rumorLabel) {
  const ctx = document.getElementById('chartF').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: vars,
      datasets: [
        {
          label: 'Sin rumor (original)',
          data: x.map(v => +v.toFixed(4)),
          backgroundColor: 'rgba(255,209,102,0.3)',
          borderColor: '#ffd166', borderWidth: 2, borderRadius: 3,
        },
        {
          label: `Con rumor: ${rumorLabel}`,
          data: xPert.map(v => +v.toFixed(4)),
          backgroundColor: 'rgba(239,71,111,0.3)',
          borderColor: '#ef476f', borderWidth: 2, borderRadius: 3,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e8e8f0', font: { family: 'Space Mono', size: 10 } } },
        title: { display: true, text: 'Distribución antes y después del rumor',
          color: '#6b6b80', font: { family: 'Syne', size: 12 } }
      },
      scales: {
        x: { ticks: { color: '#6b6b80' }, grid: { color: '#2a2a3a' } },
        y: { ticks: { color: '#6b6b80' }, grid: { color: '#2a2a3a' },
             title: { display: true, text: 'Cantidad distribuida', color: '#6b6b80' } }
      }
    }
  });
}