// ===== ESCENARIO C: Interpolación de Precios =====
// Métodos: Lagrange, Newton (Diferencias Divididas), Splines Cúbicos Naturales

let currentMethod = 'lagrange';
let chartInstance = null;

// Datos por defecto (del enunciado)
const datosDefault = [
  { dia: 1,  precio: 8  },
  { dia: 5,  precio: 10 },
  { dia: 10, precio: 13 },
  { dia: 15, precio: 16 },
  { dia: 20, precio: 19 },
  { dia: 30, precio: 22 },
];

let puntos = datosDefault.map(d => ({ ...d }));

document.querySelectorAll('.method-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMethod = btn.dataset.method;
  });
});

// --- Renderizar inputs de puntos ---
function renderPuntos() {
  const cont = document.getElementById('puntosContainer');
  cont.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:0.5rem;margin-bottom:0.5rem;">
      <span style="font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">Día</span>
      <span style="font-size:0.65rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);">Precio (Bs)</span>
      <span></span>
    </div>
    ${puntos.map((p, i) => `
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:0.5rem;margin-bottom:0.4rem;align-items:center;">
        <input type="number" value="${p.dia}" min="1" max="365" onchange="updatePunto(${i},'dia',this.value)"
          style="background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:0.82rem;padding:0.5rem 0.7rem;border-radius:3px;"/>
        <input type="number" value="${p.precio}" min="0" step="0.5" onchange="updatePunto(${i},'precio',this.value)"
          style="background:var(--bg);border:1px solid var(--border);color:var(--text);font-family:var(--font-mono);font-size:0.82rem;padding:0.5rem 0.7rem;border-radius:3px;"/>
        <button onclick="eliminarPunto(${i})" style="background:rgba(255,107,53,0.15);border:1px solid rgba(255,107,53,0.3);color:#ff6b35;padding:0.4rem 0.6rem;border-radius:3px;cursor:pointer;font-size:0.75rem;">✕</button>
      </div>
    `).join('')}
  `;
}

function updatePunto(i, key, val) {
  puntos[i][key] = parseFloat(val);
}

function agregarPunto() {
  const lastDia = puntos.length ? puntos[puntos.length-1].dia : 0;
  puntos.push({ dia: lastDia + 5, precio: 0 });
  renderPuntos();
}

function eliminarPunto(i) {
  if (puntos.length <= 2) return alert('Mínimo 2 puntos requeridos.');
  puntos.splice(i, 1);
  renderPuntos();
}

function resetDatos() {
  puntos = datosDefault.map(d => ({ ...d }));
  renderPuntos();
}

renderPuntos();

// ===== MÉTODOS =====

// --- LAGRANGE ---
function lagrange(xs, ys, xEval) {
  const n = xs.length;
  let result = 0;
  for (let i = 0; i < n; i++) {
    let L = 1;
    for (let j = 0; j < n; j++) {
      if (j !== i) L *= (xEval - xs[j]) / (xs[i] - xs[j]);
    }
    result += ys[i] * L;
  }
  return result;
}

// --- NEWTON (Diferencias Divididas) ---
function newtonDivididas(xs, ys) {
  const n = xs.length;
  // Tabla de diferencias divididas
  const dd = Array.from({length:n}, (_, i) => [...ys]);
  for (let j = 1; j < n; j++) {
    for (let i = n-1; i >= j; i--) {
      dd[i][j] = (dd[i][j-1] - dd[i-1][j-1]) / (xs[i] - xs[i-j]);
    }
  }
  // Coeficientes: diagonal
  const coefs = Array.from({length:n}, (_, i) => dd[i][i]);

  return function eval(xEval) {
    let result = coefs[0];
    let prod   = 1;
    for (let i = 1; i < n; i++) {
      prod   *= (xEval - xs[i-1]);
      result += coefs[i] * prod;
    }
    return result;
  };
}

// --- SPLINES CÚBICOS NATURALES ---
function splineCubico(xs, ys) {
  const n = xs.length - 1; // número de intervalos
  const h = [];
  for (let i = 0; i < n; i++) h.push(xs[i+1] - xs[i]);

  // Construcción del sistema tridiagonal para los momentos M
  const size = xs.length;
  const a = new Array(size).fill(0);
  const b = new Array(size).fill(0);
  const c = new Array(size).fill(0);
  const d = new Array(size).fill(0);

  b[0] = 1; b[size-1] = 1; // spline natural

  for (let i = 1; i < size-1; i++) {
    a[i] = h[i-1];
    b[i] = 2*(h[i-1]+h[i]);
    c[i] = h[i];
    d[i] = 6 * ((ys[i+1]-ys[i])/h[i] - (ys[i]-ys[i-1])/h[i-1]);
  }

  // Eliminación de Thomas (tridiagonal)
  const M = new Array(size).fill(0);
  const cp = [...c], dp = [...d];
  for (let i = 1; i < size; i++) {
    const w = a[i] / b[i-1];
    b[i]  -= w * cp[i-1];
    dp[i] -= w * dp[i-1];
  }
  M[size-1] = dp[size-1] / b[size-1];
  for (let i = size-2; i >= 0; i--) {
    M[i] = (dp[i] - cp[i] * M[i+1]) / b[i];
  }

  return function eval(xEval) {
    // Encontrar intervalo
    let k = 0;
    for (let i = 0; i < n-1; i++) {
      if (xEval >= xs[i]) k = i;
    }
    if (xEval >= xs[n]) k = n-1;

    const dx = xEval - xs[k];
    const hk = h[k];
    return (
      (M[k]/(6*hk)) * Math.pow(xs[k+1]-xEval, 3) +
      (M[k+1]/(6*hk)) * Math.pow(dx, 3) +
      (ys[k]/hk - M[k]*hk/6) * (xs[k+1]-xEval) +
      (ys[k+1]/hk - M[k+1]*hk/6) * dx
    );
  };
}

// --- INTERPOLAR ---
function interpolar() {
  // Ordenar puntos por día
  const sorted = [...puntos].sort((a, b) => a.dia - b.dia);
  const xs = sorted.map(p => p.dia);
  const ys = sorted.map(p => p.precio);

  const diaEst = parseFloat(document.getElementById('diaEstimar').value) || 7;

  let evalFn;
  if (currentMethod === 'lagrange') {
    evalFn = x => lagrange(xs, ys, x);
  } else if (currentMethod === 'newton') {
    evalFn = newtonDivididas(xs, ys);
  } else {
    evalFn = splineCubico(xs, ys);
  }

  // Curva completa día 1..31
  const dias = Array.from({length:31}, (_, i) => i+1);
  const precios = dias.map(d => {
    try { const v = evalFn(d); return isFinite(v) ? +v.toFixed(3) : null; }
    catch { return null; }
  });

  const precioEstimado = evalFn(diaEst);
  const precioMax = Math.max(...precios.filter(Boolean));
  const diaMax    = dias[precios.indexOf(precioMax)];
  const incremento = +((ys[ys.length-1] - ys[0]).toFixed(2));

  document.getElementById('resultsPanel').style.display = '';
  document.getElementById('methodBadge').textContent = currentMethod.toUpperCase();

  document.getElementById('resultGrid').innerHTML = `
    <div class="result-item">
      <span class="result-value">${isFinite(precioEstimado) ? precioEstimado.toFixed(2) : '—'}</span>
      <span class="result-label">Precio día ${diaEst}<br/><small>Bs</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">${precioMax.toFixed(2)}</span>
      <span class="result-label">Precio máximo<br/><small>día ${diaMax}</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">+${incremento}</span>
      <span class="result-label">Variación total<br/><small>Bs</small></span>
    </div>
  `;

  renderChart(dias, precios, xs, ys, diaEst, precioEstimado);

  // Tabla
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = dias.filter((_, i) => precios[i] !== null).map(d => {
    const esOriginal = xs.includes(d);
    const idx = xs.indexOf(d);
    const precio = esOriginal ? ys[idx] : (precios[d-1] || '—');
    return `<tr>
      <td>${d}</td>
      <td style="color:${d===diaEst?'var(--accent-c)':'inherit'}">${typeof precio === 'number' ? precio.toFixed(2) : precio} Bs</td>
      <td>${esOriginal ? '✓ Sí' : '—'}</td>
    </tr>`;
  }).join('');
}

function renderChart(dias, precios, xsOrig, ysOrig, diaEst, precioEst) {
  const ctx = document.getElementById('chartC').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dias,
      datasets: [
        {
          label: 'Curva interpolada (Bs)',
          data: precios,
          borderColor: '#7c5cfc',
          backgroundColor: 'rgba(124,92,252,0.07)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Datos originales',
          data: dias.map(d => {
            const idx = xsOrig.indexOf(d);
            return idx >= 0 ? ysOrig[idx] : null;
          }),
          borderColor: '#ffd166',
          backgroundColor: '#ffd166',
          borderWidth: 0,
          pointRadius: 6,
          pointStyle: 'circle',
          showLine: false,
          spanGaps: false,
        },
        {
          label: `Estimación día ${diaEst}`,
          data: dias.map(d => d === Math.round(diaEst) ? precioEst : null),
          borderColor: '#ff6b35',
          backgroundColor: '#ff6b35',
          borderWidth: 0,
          pointRadius: 9,
          pointStyle: 'triangle',
          showLine: false,
          spanGaps: false,
        }
      ]
    },
    options: {
      responsive: true,
      animation: { duration: 600 },
      plugins: {
        legend: { labels: { color: '#e8e8f0', font: { family: 'Space Mono', size: 10 } } },
        title: {
          display: true,
          text: 'Curva de precios del mercado – interpolación',
          color: '#6b6b80', font: { family: 'Syne', size: 12 }
        }
      },
      scales: {
        x: {
          ticks: { color: '#6b6b80' }, grid: { color: '#2a2a3a' },
          title: { display: true, text: 'Día del mes', color: '#6b6b80' }
        },
        y: {
          ticks: { color: '#6b6b80' }, grid: { color: '#2a2a3a' },
          title: { display: true, text: 'Precio (Bs)', color: '#6b6b80' }
        }
      }
    }
  });
}