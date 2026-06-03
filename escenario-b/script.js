 
// ===== ESCENARIO B: EDO - Vaciado de Reservas =====
// R'(t) = entrada(t) - consumo(t)
// Métodos: Euler, Heun, Runge-Kutta 4

let currentMethod = 'euler';
let chartInstance = null;

document.querySelectorAll('.method-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMethod = btn.dataset.method;
  });
});

// --- Función de la EDO: dR/dt ---
function dRdt(t, R, params) {
  const { entradaBase, consumoBase, panico, diaBloqueo, reduccion } = params;

  // Consumo aumenta con factor pánico
  let consumo = consumoBase * panico;

  // Si hay bloqueo, la entrada se reduce
  let entrada = entradaBase;
  if (t >= diaBloqueo) {
    entrada = entradaBase * (1 - reduccion / 100);
    consumo = consumoBase * panico * 1.2; // pánico adicional por bloqueo
  }

  // Si reserva cae mucho, consumo baja (racionamiento)
  if (R < 1000) consumo *= 0.7;
  if (R <= 0) return 0;

  return entrada - consumo;
}

// --- EULER ---
function euler(R0, h, nPasos, params) {
  const puntos = [{ t: 0, R: R0 }];
  let R = R0;
  for (let i = 1; i <= nPasos; i++) {
    const t = (i - 1) * h;
    const k = dRdt(t, R, params);
    R = Math.max(0, R + h * k);
    puntos.push({ t: i * h, R: +R.toFixed(2) });
  }
  return puntos;
}

// --- HEUN (Euler mejorado) ---
function heun(R0, h, nPasos, params) {
  const puntos = [{ t: 0, R: R0 }];
  let R = R0;
  for (let i = 1; i <= nPasos; i++) {
    const t = (i - 1) * h;
    const k1 = dRdt(t, R, params);
    const Rp  = Math.max(0, R + h * k1);
    const k2  = dRdt(t + h, Rp, params);
    R = Math.max(0, R + h * (k1 + k2) / 2);
    puntos.push({ t: i * h, R: +R.toFixed(2) });
  }
  return puntos;
}

// --- RUNGE-KUTTA 4 ---
function rk4(R0, h, nPasos, params) {
  const puntos = [{ t: 0, R: R0 }];
  let R = R0;
  for (let i = 1; i <= nPasos; i++) {
    const t  = (i - 1) * h;
    const k1 = dRdt(t,         R,               params);
    const k2 = dRdt(t + h/2,   R + h*k1/2,      params);
    const k3 = dRdt(t + h/2,   R + h*k2/2,      params);
    const k4 = dRdt(t + h,     R + h*k3,         params);
    R = Math.max(0, R + (h/6) * (k1 + 2*k2 + 2*k3 + k4));
    puntos.push({ t: i * h, R: +R.toFixed(2) });
  }
  return puntos;
}

// --- SIMULAR ---
function simular() {
  const R0          = parseFloat(document.getElementById('r0').value)          || 5000;
  const entradaBase = parseFloat(document.getElementById('entrada').value)      || 300;
  const consumoBase = parseFloat(document.getElementById('consumoBase').value)  || 400;
  const panico      = parseFloat(document.getElementById('panico').value)       || 1.0;
  const critico     = parseFloat(document.getElementById('critico').value)      || 500;
  const dias        = parseInt(document.getElementById('dias').value)           || 30;
  const h           = parseFloat(document.getElementById('paso').value)         || 0.5;
  const diaBloqueo  = parseFloat(document.getElementById('diaBloqueo').value)   || 999;
  const reduccion   = parseFloat(document.getElementById('reduccion').value)    || 80;

  const nPasos = Math.round(dias / h);
  const params = { entradaBase, consumoBase, panico, diaBloqueo, reduccion };

  let puntos;
  if (currentMethod === 'euler') {
    puntos = euler(R0, h, nPasos, params);
  } else if (currentMethod === 'heun') {
    puntos = heun(R0, h, nPasos, params);
  } else {
    puntos = rk4(R0, h, nPasos, params);
  }

  // Encontrar día crítico
  const diaCritico = puntos.find(p => p.R <= critico);
  const reservaFinal = puntos[puntos.length - 1].R;
  const reservaMin   = Math.min(...puntos.map(p => p.R));

  document.getElementById('resultsPanel').style.display = '';
  document.getElementById('methodBadge').textContent = currentMethod.toUpperCase();

  // Métricas
  document.getElementById('resultGrid').innerHTML = `
    <div class="result-item">
      <span class="result-value">${diaCritico ? diaCritico.t.toFixed(1) : '>'+dias}</span>
      <span class="result-label">Día crítico<br/><small>(≤ ${critico} ton)</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">${reservaFinal.toFixed(0)}</span>
      <span class="result-label">Reserva día ${dias}<br/><small>ton</small></span>
    </div>
    <div class="result-item">
      <span class="result-value">${reservaMin.toFixed(0)}</span>
      <span class="result-label">Reserva mínima<br/><small>ton</small></span>
    </div>
  `;

  // Gráfico
  renderChart(puntos, critico, diaBloqueo);

  // Tabla (cada 5 pasos)
  const tbody = document.getElementById('tableBody');
  const paso5 = Math.max(1, Math.round(5 / h));
  const muestras = puntos.filter((_, i) => i % paso5 === 0 || i === puntos.length - 1);
  tbody.innerHTML = muestras.map(p => {
    const cons = consumoBase * panico * (p.t >= diaBloqueo ? 1.2 : 1) * (p.R < 1000 ? 0.7 : 1);
    const ent  = entradaBase * (p.t >= diaBloqueo ? (1 - reduccion/100) : 1);
    return `<tr>
      <td>${p.t.toFixed(1)}</td>
      <td style="color:${p.R<=critico?'var(--accent-b)':'inherit'}">${p.R.toFixed(1)}</td>
      <td>${cons.toFixed(1)}</td>
      <td>${ent.toFixed(1)}</td>
    </tr>`;
  }).join('');
}

function renderChart(puntos, critico, diaBloqueo) {
  const ctx = document.getElementById('chartB').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const labels = puntos.map(p => p.t.toFixed(1));
  const data   = puntos.map(p => p.R);

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Reserva (ton)',
          data,
          borderColor: '#00d4aa',
          backgroundColor: 'rgba(0,212,170,0.08)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: true,
        },
        {
          label: `Nivel crítico (${critico} ton)`,
          data: labels.map(() => critico),
          borderColor: '#ff6b35',
          borderDash: [6, 3],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
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
          text: 'Evolución de la reserva de carburante en el tiempo',
          color: '#6b6b80', font: { family: 'Syne', size: 12 }
        },
        annotation: {}
      },
      scales: {
        x: {
          ticks: { color: '#6b6b80', maxTicksLimit: 12 },
          grid: { color: '#2a2a3a' },
          title: { display: true, text: 'Días', color: '#6b6b80' }
        },
        y: {
          ticks: { color: '#6b6b80' },
          grid: { color: '#2a2a3a' },
          title: { display: true, text: 'Reserva (ton)', color: '#6b6b80' }
        }
      }
    }
  });
}