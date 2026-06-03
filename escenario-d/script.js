// ===== ESCENARIO D: Integración Numérica =====
// Métodos: Trapecio, Simpson 1/3, Simpson 3/8

let currentMethod = 'trapecio';
let chartInstance = null;

document.querySelectorAll('.method-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMethod = btn.dataset.method;
  });
});

// --- Función de precio P(t) según tipo de curva ---
function precio(t, p0, tasa, dias, tipo) {
  const r = tasa / 100;
  switch (tipo) {
    case 'exponencial':
      return p0 * Math.exp(r * t);
    case 'lineal':
      return p0 + (p0 * r * dias / 2) * (t / dias);
    case 'cuadratica':
      return p0 + p0 * r * (t * t / dias);
    case 'mixta':
      // Sube normal, luego pega un salto de pánico al 60% del mes
      const base = p0 * Math.exp(r * t);
      return t > dias * 0.6 ? base * 1.3 : base;
    default:
      return p0 * Math.exp(r * t);
  }
}

// --- TRAPECIO ---
function trapecio(xs, ys) {
  let sum = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    sum += (xs[i+1] - xs[i]) * (ys[i] + ys[i+1]) / 2;
  }
  return sum;
}

// --- SIMPSON 1/3 (compuesto) ---
function simpson13(a, b, n, fn) {
  if (n % 2 !== 0) n++; // n debe ser par
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) {
    sum += fn(a + i * h) * (i % 2 === 0 ? 2 : 4);
  }
  return (h / 3) * sum;
}

// --- SIMPSON 3/8 (compuesto) ---
function simpson38(a, b, n, fn) {
  if (n % 3 !== 0) n = n + (3 - n % 3); // n múltiplo de 3
  const h = (b - a) / n;
  let sum = fn(a) + fn(b);
  for (let i = 1; i < n; i++) {
    sum += fn(a + i * h) * (i % 3 === 0 ? 2 : 3);
  }
  return (3 * h / 8) * sum;
}

// --- Exacto (integración analítica aproximada con muchos puntos) ---
function exacto(a, b, fn) {
  return simpson13(a, b, 1000, fn);
}

// --- CALCULAR ---
function calcular() {
  const p0      = parseFloat(document.getElementById('p0').value)      || 35;
  const tasa    = parseFloat(document.getElementById('tasa').value)     || 2.5;
  const dias    = parseInt(document.getElementById('dias').value)       || 30;
  const ingreso = parseFloat(document.getElementById('ingreso').value)  || 2500;
  const nSub    = parseInt(document.getElementById('nSub').value)       || 30;
  const tipo    = document.getElementById('tipoCurva').value;

  const fn = t => precio(t, p0, tasa, dias, tipo);
  const a = 0, b = dias;

  // Puntos de la curva para graficar
  const nPts = Math.max(nSub, 60);
  const h    = (b - a) / nPts;
  const xs   = Array.from({length: nPts+1}, (_, i) => a + i * h);
  const ys   = xs.map(fn);

  // Calcular con cada método
  const resTrap  = trapecio(xs, ys);
  const resS13   = simpson13(a, b, nSub, fn);
  let   resS38n  = nSub;
  if (resS38n % 3 !== 0) resS38n = resS38n + (3 - resS38n % 3);
  const resS38   = simpson38(a, b, resS38n, fn);
  const resExact = exacto(a, b, fn);

  // Método activo
  let costoActivo;
  if (currentMethod === 'trapecio')     costoActivo = resTrap;
  else if (currentMethod === 'simpson13') costoActivo = resS13;
  else if (currentMethod === 'simpson38') costoActivo = resS38;
  else costoActivo = resExact;

  const perdida    = Math.max(0, costoActivo - ingreso);
  const pctIngreso = ((costoActivo / ingreso) * 100).toFixed(1);
  const precioFin  = fn(dias).toFixed(2);

  document.getElementById('resultsPanel').style.display = '';
  document.getElementById('methodBadge').textContent =
    currentMethod === 'todos' ? 'COMPARACIÓN' : currentMethod.toUpperCase();

  document.getElementById('resultGrid').innerHTML = `
    <div class="result-item">
      <span class="result-value">${costoActivo.toFixed(2)}</span>
      <span class="result-label">Costo acumulado<br/><small>Bs / mes</small></span>
    </div>
    <div class="result-item">
      <span class="result-value" style="color:${perdida>0?'var(--accent-e)':'var(--accent-d)'}">${perdida.toFixed(2)}</span>
      <span class="result-label">Déficit familiar<br/><small>Bs</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">${pctIngreso}%</span>
      <span class="result-label">Del ingreso mensual<br/><small>destinado a canasta</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">${precioFin}</span>
      <span class="result-label">Precio día ${dias}<br/><small>Bs</small></span>
    </div>
  `;

  // Tabla comparativa
  const errTrap = Math.abs((resTrap - resExact) / resExact * 100).toFixed(4);
  const errS13  = Math.abs((resS13  - resExact) / resExact * 100).toFixed(4);
  const errS38  = Math.abs((resS38  - resExact) / resExact * 100).toFixed(4);
  document.getElementById('compBody').innerHTML = `
    <tr><td>Trapecio</td><td>${resTrap.toFixed(4)}</td><td>${errTrap}%</td></tr>
    <tr><td>Simpson 1/3</td><td>${resS13.toFixed(4)}</td><td>${errS13}%</td></tr>
    <tr><td>Simpson 3/8</td><td>${resS38.toFixed(4)}</td><td>${errS38}%</td></tr>
    <tr style="color:var(--accent-d)"><td>Exacto (ref.)</td><td>${resExact.toFixed(4)}</td><td>0.0000%</td></tr>
  `;

  // Tabla detalle por día (muestra enteros)
  let acum = 0;
  const filas = [];
  for (let d = 1; d <= dias; d++) {
    const prev = fn(d-1), curr = fn(d);
    acum += (prev + curr) / 2; // trapecio simple día a día
    filas.push({ d, precio: curr.toFixed(2), acum: acum.toFixed(2), pct: ((acum/ingreso)*100).toFixed(1) });
  }
  document.getElementById('tableBody').innerHTML = filas.map(f => `
    <tr>
      <td>${f.d}</td>
      <td>${f.precio}</td>
      <td style="color:${parseFloat(f.acum)>ingreso?'var(--accent-e)':'inherit'}">${f.acum}</td>
      <td>${f.pct}%</td>
    </tr>`).join('');

  renderChart(xs, ys, fn, a, b, nSub);
}

function renderChart(xs, ys, fn, a, b, n) {
  const ctx = document.getElementById('chartD').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  // Área acumulada diaria
  const diasLabels = xs.map(x => x.toFixed(1));
  let acumArr = [0];
  for (let i = 1; i < xs.length; i++) {
    acumArr.push(acumArr[i-1] + (xs[i]-xs[i-1]) * (ys[i-1]+ys[i]) / 2);
  }

  chartInstance = new Chart(ctx, {
    data: {
      labels: diasLabels,
      datasets: [
        {
          type: 'line',
          label: 'Precio diario P(t) (Bs)',
          data: ys,
          borderColor: '#06d6a0',
          backgroundColor: 'rgba(6,214,160,0.08)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          type: 'line',
          label: 'Costo acumulado (Bs)',
          data: acumArr,
          borderColor: '#ffd166',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 0,
          borderDash: [4,2],
          tension: 0.3,
          yAxisID: 'y2',
        }
      ]
    },
    options: {
      responsive: true,
      animation: { duration: 600 },
      plugins: {
        legend: { labels: { color: '#e8e8f0', font: { family: 'Space Mono', size: 10 } } },
        title: { display: true, text: 'Curva de precios y costo acumulado mensual',
          color: '#6b6b80', font: { family: 'Syne', size: 12 } }
      },
      scales: {
        x: { ticks: { color: '#6b6b80', maxTicksLimit: 12 }, grid: { color: '#2a2a3a' },
             title: { display: true, text: 'Días', color: '#6b6b80' } },
        y: { ticks: { color: '#6b6b80' }, grid: { color: '#2a2a3a' },
             title: { display: true, text: 'Precio (Bs)', color: '#6b6b80' } },
        y2: { position: 'right', ticks: { color: '#ffd166' }, grid: { drawOnChartArea: false },
              title: { display: true, text: 'Acumulado (Bs)', color: '#ffd166' } }
      }
    }
  });
}