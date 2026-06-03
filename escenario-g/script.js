// ===== ESCENARIO G: Difusión de Opinión y Descontento Social =====
// Sistema de EDOs:
//   N'(t) = -α·N·M + b·D      (neutrales)
//   M'(t) =  α·N·M - c·M·D    (manifestantes)
//   D'(t) =  k·M   - r·D      (mediadores)
// Métodos: Heun, Runge-Kutta 4

let currentMethod = 'heun';
let chartInstance = null;

// --- Tabs de método ---
document.querySelectorAll('.method-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMethod = btn.dataset.method;
  });
});

// --- Definición del sistema de EDOs ---
// state = [N, M, D]
function sistema(t, state, p) {
  const [N, M, D] = state;
  const dN = -p.alfa * N * M + p.b * D;
  const dM =  p.alfa * N * M - p.c * M * D;
  const dD =  p.k * M - p.r * D;
  return [dN, dM, dD];
}

// --- HEUN (Euler mejorado / Runge-Kutta 2) ---
function heun(state0, h, pasos, p) {
  const resultado = [{ t: 0, N: state0[0], M: state0[1], D: state0[2] }];
  let s = [...state0];
  for (let i = 1; i <= pasos; i++) {
    const t = (i - 1) * h;
    const k1 = sistema(t, s, p);
    const sP = s.map((v, j) => Math.max(0, v + h * k1[j]));
    const k2 = sistema(t + h, sP, p);
    s = s.map((v, j) => Math.max(0, v + h * (k1[j] + k2[j]) / 2));
    resultado.push({ t: +(i * h).toFixed(4), N: +s[0].toFixed(2), M: +s[1].toFixed(2), D: +s[2].toFixed(2) });
  }
  return resultado;
}

// --- RUNGE-KUTTA 4 ---
function rk4(state0, h, pasos, p) {
  const resultado = [{ t: 0, N: state0[0], M: state0[1], D: state0[2] }];
  let s = [...state0];
  for (let i = 1; i <= pasos; i++) {
    const t = (i - 1) * h;
    const k1 = sistema(t,         s,                            p);
    const k2 = sistema(t + h/2,   s.map((v,j) => v + h/2*k1[j]), p);
    const k3 = sistema(t + h/2,   s.map((v,j) => v + h/2*k2[j]), p);
    const k4 = sistema(t + h,     s.map((v,j) => v + h*k3[j]),    p);
    s = s.map((v, j) => Math.max(0, v + (h/6)*(k1[j] + 2*k2[j] + 2*k3[j] + k4[j])));
    resultado.push({ t: +(i * h).toFixed(4), N: +s[0].toFixed(2), M: +s[1].toFixed(2), D: +s[2].toFixed(2) });
  }
  return resultado;
}

// --- Escenarios predefinidos ---
function cargarEscenario() {
  const sel = document.getElementById('escenPre').value;
  const preset = {
    escalada:      { N0:900, M0:80,  D0:5,  alfa:0.0005, b:0.01, c:0.001, k:0.05, r:0.08, dias:90 },
    dialogo:       { N0:850, M0:100, D0:50, alfa:0.0003, b:0.08, c:0.005, k:0.20, r:0.03, dias:60 },
    sinmediadores: { N0:900, M0:80,  D0:0,  alfa:0.0004, b:0.02, c:0.000, k:0.00, r:0.10, dias:60 },
    masificacion:  { N0:950, M0:40,  D0:10, alfa:0.0008, b:0.01, c:0.001, k:0.05, r:0.05, dias:45 },
  };
  if (sel === 'custom') return;
  const p = preset[sel];
  document.getElementById('N0').value    = p.N0;
  document.getElementById('M0').value    = p.M0;
  document.getElementById('D0').value    = p.D0;
  document.getElementById('alfa').value  = p.alfa;
  document.getElementById('bParam').value = p.b;
  document.getElementById('cParam').value = p.c;
  document.getElementById('kParam').value = p.k;
  document.getElementById('rParam').value = p.r;
  document.getElementById('dias').value  = p.dias;
}

// --- Función principal de simulación ---
function simular() {
  // Leer parámetros
  const N0   = parseFloat(document.getElementById('N0').value)   || 900;
  const M0   = parseFloat(document.getElementById('M0').value)   || 80;
  const D0   = parseFloat(document.getElementById('D0').value)   || 20;
  const alfa = parseFloat(document.getElementById('alfa').value) || 0.0003;
  const b    = parseFloat(document.getElementById('bParam').value) || 0.05;
  const c    = parseFloat(document.getElementById('cParam').value) || 0.002;
  const k    = parseFloat(document.getElementById('kParam').value) || 0.1;
  const r    = parseFloat(document.getElementById('rParam').value) || 0.05;
  const dias = parseFloat(document.getElementById('dias').value)  || 60;
  const h    = parseFloat(document.getElementById('paso').value)  || 0.1;

  const params = { alfa, b, c, k, r };
  const state0 = [N0, M0, D0];
  const pasos  = Math.round(dias / h);

  // Ejecutar método seleccionado
  let datos;
  if (currentMethod === 'rk4') {
    datos = rk4(state0, h, pasos, params);
  } else {
    datos = heun(state0, h, pasos, params);
  }

  // --- Métricas finales ---
  const ultimo = datos[datos.length - 1];
  const maxM   = Math.max(...datos.map(d => d.M));
  const diaMaxM = datos.find(d => d.M === maxM)?.t ?? 0;
  const poblTotal = N0 + M0 + D0;
  const tension = +(M0 / poblTotal * 100).toFixed(1);
  const tensionFinal = +(ultimo.M / (ultimo.N + ultimo.M + ultimo.D) * 100).toFixed(1);

  // Mostrar panel
  document.getElementById('resultsPanel').style.display = '';
  document.getElementById('methodBadge').textContent = currentMethod === 'rk4' ? 'Runge-Kutta 4' : 'Heun';

  // Cuadro de métricas
  const accent = '#b4ff64';
  document.getElementById('resultGrid').innerHTML = `
    <div class="result-item">
      <span class="result-value" style="color:${accent}">${ultimo.N.toFixed(0)}</span>
      <span class="result-label">Neutrales finales (miles)</span>
    </div>
    <div class="result-item">
      <span class="result-value" style="color:#ff6b35">${ultimo.M.toFixed(0)}</span>
      <span class="result-label">Manifestantes finales (miles)</span>
    </div>
    <div class="result-item">
      <span class="result-value" style="color:#00d4aa">${ultimo.D.toFixed(0)}</span>
      <span class="result-label">Mediadores finales (miles)</span>
    </div>
    <div class="result-item">
      <span class="result-value" style="color:#ffd166">${maxM.toFixed(0)}</span>
      <span class="result-label">Pico manifestantes (día ${diaMaxM.toFixed(1)})</span>
    </div>
    <div class="result-item">
      <span class="result-value" style="color:${tensionFinal > tension ? '#ff6b35' : '#00d4aa'}">${tensionFinal}%</span>
      <span class="result-label">Tensión social final</span>
    </div>
    <div class="result-item">
      <span class="result-value" style="color:#6b6b80">${tension}%</span>
      <span class="result-label">Tensión social inicial</span>
    </div>
  `;

  // --- Gráfico ---
  // Submuestrear para no saturar el canvas (max 300 puntos)
  const step = Math.max(1, Math.floor(datos.length / 300));
  const muestra = datos.filter((_, i) => i % step === 0);

  const labels = muestra.map(d => d.t.toFixed(1));
  const dataN = muestra.map(d => d.N);
  const dataM = muestra.map(d => d.M);
  const dataD = muestra.map(d => d.D);

  if (chartInstance) chartInstance.destroy();
  const ctx = document.getElementById('chartG').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'N – Neutrales',
          data: dataN,
          borderColor: '#b4ff64',
          backgroundColor: 'rgba(180,255,100,0.07)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
        },
        {
          label: 'M – Manifestantes',
          data: dataM,
          borderColor: '#ff6b35',
          backgroundColor: 'rgba(255,107,53,0.09)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
        },
        {
          label: 'D – Mediadores',
          data: dataD,
          borderColor: '#00d4aa',
          backgroundColor: 'rgba(0,212,170,0.07)',
          borderWidth: 2,
          pointRadius: 0,
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#e8e8f0', font: { family: 'Space Mono', size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${(+ctx.raw).toFixed(1)}k`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: 'Tiempo (días)', color: '#6b6b80' },
          ticks: { color: '#6b6b80', maxTicksLimit: 12 },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          title: { display: true, text: 'Población (miles)', color: '#6b6b80' },
          ticks: { color: '#6b6b80' },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
    },
  });

  // --- Tabla: cada 5 días ---
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  const intervalo = Math.round(5 / h);
  for (let i = 0; i <= pasos; i += intervalo) {
    const d = datos[Math.min(i, datos.length - 1)];
    const pop = d.N + d.M + d.D;
    const tens = pop > 0 ? (d.M / pop * 100).toFixed(1) : '0.0';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${d.t.toFixed(0)}</td>
      <td>${d.N.toFixed(1)}</td>
      <td style="color:#ff6b35">${d.M.toFixed(1)}</td>
      <td style="color:#00d4aa">${d.D.toFixed(1)}</td>
      <td>${tens}%</td>
    `;
    tbody.appendChild(tr);
  }

  // Último día si no quedó incluido
  const lastD = datos[datos.length - 1];
  const lastPop = lastD.N + lastD.M + lastD.D;
  if (+lastD.t.toFixed(0) % 5 !== 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${lastD.t.toFixed(0)} ★</td>
      <td>${lastD.N.toFixed(1)}</td>
      <td style="color:#ff6b35">${lastD.M.toFixed(1)}</td>
      <td style="color:#00d4aa">${lastD.D.toFixed(1)}</td>
      <td>${(lastPop > 0 ? lastD.M / lastPop * 100 : 0).toFixed(1)}%</td>
    `;
    tbody.appendChild(tr);
  }

  // Scroll suave a resultados
  document.getElementById('resultsPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}