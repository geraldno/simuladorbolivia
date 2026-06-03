// ===== ESCENARIO E: Raíces de Ecuaciones =====
// Métodos: Bisección, Newton-Raphson, Secante

let currentMethod = 'biseccion';
let chartInstance = null;

document.querySelectorAll('.method-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMethod = btn.dataset.method;
  });
});

// Mostrar/ocultar parámetros según función
document.getElementById('fnTipo').addEventListener('change', () => {
  const v = document.getElementById('fnTipo').value;
  document.getElementById('paramsA').style.display = v === 'costovsingreso' ? '' : 'none';
  document.getElementById('paramsB').style.display = v === 'reposicion'     ? '' : 'none';
  document.getElementById('paramsC').style.display = v === 'opinion'        ? '' : 'none';
  // Sugerir intervalo
  if (v === 'costovsingreso') { document.getElementById('xa').value=0; document.getElementById('xb').value=30; }
  if (v === 'reposicion')     { document.getElementById('xa').value=0; document.getElementById('xb').value=1; }
  if (v === 'opinion')        { document.getElementById('xa').value=0; document.getElementById('xb').value=1; }
});

// --- Definir función según escenario ---
function getFn() {
  const tipo = document.getElementById('fnTipo').value;

  if (tipo === 'costovsingreso') {
    const p0      = parseFloat(document.getElementById('precioBase').value) || 35;
    const tasa    = parseFloat(document.getElementById('tasaE').value) / 100 || 0.025;
    const ingreso = parseFloat(document.getElementById('ingresoE').value) || 2500;
    // f(t) = p0*(e^(tasa*t)-1)/tasa - ingreso  (costo acumulado exponencial - ingreso)
    const fn = t => p0 * (Math.exp(tasa * t) - 1) / tasa - ingreso;
    const dfn= t => p0 * Math.exp(tasa * t);
    return { fn, dfn, label: 'f(t) = Costo acumulado(t) − Ingreso', xLabel: 'Día t' };
  }

  if (tipo === 'reposicion') {
    const consumo    = parseFloat(document.getElementById('consumoE').value)    || 400;
    const llegadaMax = parseFloat(document.getElementById('llegadaMax').value)  || 500;
    // f(r) = consumo - llegadaMax*r  (r = fracción de capacidad usada; raíz = tasa crítica)
    const fn = r => consumo - llegadaMax * r * (1 + 0.5 * Math.sin(Math.PI * r));
    const dfn= r => -llegadaMax * (1 + 0.5*Math.sin(Math.PI*r) + 0.5*Math.PI*r*Math.cos(Math.PI*r));
    return { fn, dfn, label: 'f(r) = Consumo − Llegada(r)', xLabel: 'Fracción r' };
  }

  if (tipo === 'opinion') {
    const alfa    = parseFloat(document.getElementById('alfa').value)   || 0.3;
    const beta    = parseFloat(document.getElementById('beta').value)   || 0.1;
    const umbral  = parseFloat(document.getElementById('umbral').value) || 0.5;
    // f(x) = alfa*x*(1-x) - beta*x - umbral*(x-0.5)  modelo SIS social simplificado
    const fn = x => alfa * x * (1 - x) - beta * x - umbral * (x - 0.5);
    const dfn= x => alfa * (1 - 2*x) - beta - umbral;
    return { fn, dfn, label: 'f(x) = Dinámica de opinión social', xLabel: 'Fracción x' };
  }
}

// ===== MÉTODOS =====

function biseccion(fn, a, b, tol, maxIter) {
  const hist = [];
  if (fn(a) * fn(b) >= 0) return { raiz: null, hist, msg: 'f(a) y f(b) tienen el mismo signo.' };
  let c;
  for (let i = 0; i < maxIter; i++) {
    c = (a + b) / 2;
    const fc = fn(c);
    const err = Math.abs(b - a) / 2;
    hist.push({ iter: i+1, x: c, fx: fc, err });
    if (err < tol || Math.abs(fc) < tol) break;
    if (fn(a) * fc < 0) b = c; else a = c;
  }
  return { raiz: c, hist };
}

function newtonRaphson(fn, dfn, x0, tol, maxIter) {
  const hist = [];
  let x = x0;
  for (let i = 0; i < maxIter; i++) {
    const fx  = fn(x);
    const dfx = dfn(x);
    if (Math.abs(dfx) < 1e-14) return { raiz: x, hist, msg: 'Derivada ≈ 0, no converge.' };
    const xNew = x - fx / dfx;
    const err  = Math.abs(xNew - x);
    hist.push({ iter: i+1, x: xNew, fx: fn(xNew), err });
    x = xNew;
    if (err < tol) break;
  }
  return { raiz: x, hist };
}

function secante(fn, x0, x1, tol, maxIter) {
  const hist = [];
  for (let i = 0; i < maxIter; i++) {
    const f0 = fn(x0), f1 = fn(x1);
    if (Math.abs(f1 - f0) < 1e-14) return { raiz: x1, hist, msg: 'División por cero.' };
    const x2  = x1 - f1 * (x1 - x0) / (f1 - f0);
    const err  = Math.abs(x2 - x1);
    hist.push({ iter: i+1, x: x2, fx: fn(x2), err });
    x0 = x1; x1 = x2;
    if (err < tol) break;
  }
  return { raiz: x1, hist };
}

// --- BUSCAR RAÍZ ---
function buscarRaiz() {
  const { fn, dfn, label, xLabel } = getFn();
  const a      = parseFloat(document.getElementById('xa').value)       || 0;
  const b      = parseFloat(document.getElementById('xb').value)       || 30;
  const tol    = parseFloat(document.getElementById('tolE').value)     || 0.0001;
  const maxI   = parseInt(document.getElementById('maxIterE').value)   || 100;

  let res;
  if (currentMethod === 'biseccion')     res = biseccion(fn, a, b, tol, maxI);
  else if (currentMethod === 'newtonraphson') res = newtonRaphson(fn, dfn, a, tol, maxI);
  else                                    res = secante(fn, a, b, tol, maxI);

  document.getElementById('resultsPanel').style.display = '';
  document.getElementById('methodBadge').textContent = currentMethod.toUpperCase();

  const raiz    = res.raiz;
  const iters   = res.hist.length;
  const fRaiz   = raiz !== null ? fn(raiz) : null;
  const errFinal= res.hist.length ? res.hist[res.hist.length-1].err : null;

  document.getElementById('resultGrid').innerHTML = `
    <div class="result-item">
      <span class="result-value">${raiz !== null ? raiz.toFixed(6) : 'N/A'}</span>
      <span class="result-label">Raíz encontrada<br/><small>${xLabel}</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">${fRaiz !== null ? fRaiz.toExponential(3) : '—'}</span>
      <span class="result-label">f(raíz)<br/><small>residuo</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">${iters}</span>
      <span class="result-label">Iteraciones<br/><small>para converger</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">${errFinal !== null ? errFinal.toExponential(2) : '—'}</span>
      <span class="result-label">Error final<br/><small>|xn − xn₋₁|</small></span>
    </div>
  `;

  // Tabla de iteraciones
  document.getElementById('tableBody').innerHTML = res.hist.map(h => `
    <tr>
      <td>${h.iter}</td>
      <td>${h.x.toFixed(8)}</td>
      <td>${h.fx.toExponential(4)}</td>
      <td>${h.err.toExponential(4)}</td>
    </tr>`).join('');

  renderChart(fn, a, b, raiz, label, xLabel);
}

function renderChart(fn, a, b, raiz, label, xLabel) {
  const ctx = document.getElementById('chartE').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const N = 200;
  const rng = b - a || 1;
  const xs  = Array.from({length: N+1}, (_, i) => a + (rng) * i / N);
  const ys  = xs.map(x => { try { const v=fn(x); return isFinite(v)&&Math.abs(v)<1e6?v:null; } catch{return null;} });

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: xs.map(x => x.toFixed(3)),
      datasets: [
        {
          label,
          data: ys,
          borderColor: '#ef476f',
          backgroundColor: 'rgba(239,71,111,0.06)',
          borderWidth: 2, pointRadius: 0, tension: 0.3, fill: true,
          spanGaps: false,
        },
        {
          label: 'y = 0',
          data: xs.map(() => 0),
          borderColor: '#6b6b80', borderDash: [4,3],
          borderWidth: 1, pointRadius: 0, fill: false,
        },
        ...(raiz !== null ? [{
          label: `Raíz ≈ ${raiz.toFixed(4)}`,
          data: xs.map(x => Math.abs(x - raiz) < rng/N*2 ? fn(raiz) : null),
          borderColor: '#ffd166', backgroundColor: '#ffd166',
          pointRadius: 8, pointStyle: 'triangle', showLine: false,
        }] : [])
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e8e8f0', font: { family: 'Space Mono', size: 10 } } },
        title: { display: true, text: 'Función y ubicación de la raíz',
          color: '#6b6b80', font: { family: 'Syne', size: 12 } }
      },
      scales: {
        x: { ticks: { color: '#6b6b80', maxTicksLimit: 10 }, grid: { color: '#2a2a3a' },
             title: { display: true, text: xLabel, color: '#6b6b80' } },
        y: { ticks: { color: '#6b6b80' }, grid: { color: '#2a2a3a' },
             title: { display: true, text: 'f(x)', color: '#6b6b80' } }
      }
    }
  });
}