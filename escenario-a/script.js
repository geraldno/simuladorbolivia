 
// ===== ESCENARIO A: Sistemas de Ecuaciones Lineales =====
// Métodos: Jacobi, Gauss-Seidel, SOR, Descomposición LU

let currentMethod = 'jacobi';
let chartInstance = null;

// --- Manejo de tabs ---
document.querySelectorAll('.method-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentMethod = btn.dataset.method;
    // Mostrar filas de parámetros según método
    const isIter = ['jacobi','gaussseidel'].includes(currentMethod);
    const isSOR  = currentMethod === 'sor';
    const isLU   = currentMethod === 'lu';
    document.getElementById('iterRow').style.display = isIter ? '' : 'none';
    document.getElementById('sorRow').style.display  = isSOR  ? '' : 'none';
    if (isLU) {
      document.getElementById('iterRow').style.display = 'none';
      document.getElementById('sorRow').style.display  = 'none';
    }
  });
});

// Mostrar iterRow por defecto (Jacobi)
document.getElementById('iterRow').style.display = '';
document.getElementById('sorRow').style.display  = 'none';

// --- Construcción del sistema Ax = b ---
// 9 variables: x1..x9 (fila i, columna j = cantidad enviada)
// Restricciones de oferta (cada planta no puede enviar más de su capacidad)
// Restricciones de demanda (cada zona debe recibir exactamente su demanda)
// Sistema 6x6 simplificado: balance por planta (3 ec) + balance por zona (3 ec)
// Para hacer iterativo: planteamos sistema cuadrado 3x3 de distribución óptima.

function buildSystem(dN, dC, dS, c1, c2, c3) {
  // Simplificación: distribuir proporcionalmente dentro de capacidades
  // Sistema 3x3: x = [x_norte, x_centro, x_sur] = totales por zona
  // Restricciones: x_norte = dN, x_centro = dC, x_sur = dS
  // Planteamos como sistema iterativo con pesos:
  // 3*x1 - 0.5*x2 - 0.5*x3 = dN + (c1-c2)*0.1
  // -0.5*x1 + 3*x2 - 0.5*x3 = dC + (c2-c3)*0.1
  // -0.5*x1 - 0.5*x2 + 3*x3 = dS + (c3-c1)*0.1
  const A = [
    [3,   -0.5, -0.5],
    [-0.5,  3,  -0.5],
    [-0.5, -0.5,  3 ]
  ];
  const b = [
    dN + (c1 - c2) * 0.1,
    dC + (c2 - c3) * 0.1,
    dS + (c3 - c1) * 0.1
  ];
  return { A, b };
}

// --- JACOBI ---
function jacobi(A, b, tol, maxIter) {
  const n = A.length;
  let x = new Array(n).fill(0);
  let iters = 0;
  const history = [];
  for (let k = 0; k < maxIter; k++) {
    const xNew = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) {
        if (j !== i) sum -= A[i][j] * x[j];
      }
      xNew[i] = sum / A[i][i];
    }
    const err = Math.max(...xNew.map((v, i) => Math.abs(v - x[i])));
    history.push({ iter: k+1, x: [...xNew], err });
    iters = k + 1;
    x = xNew;
    if (err < tol) break;
  }
  return { x, iters, history };
}

// --- GAUSS-SEIDEL ---
function gaussSeidel(A, b, tol, maxIter) {
  const n = A.length;
  let x = new Array(n).fill(0);
  const history = [];
  let iters = 0;
  for (let k = 0; k < maxIter; k++) {
    const xOld = [...x];
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) {
        if (j !== i) sum -= A[i][j] * x[j];
      }
      x[i] = sum / A[i][i];
    }
    const err = Math.max(...x.map((v, i) => Math.abs(v - xOld[i])));
    history.push({ iter: k+1, x: [...x], err });
    iters = k + 1;
    if (err < tol) break;
  }
  return { x, iters, history };
}

// --- SOR ---
function sor(A, b, omega, tol, maxIter) {
  const n = A.length;
  let x = new Array(n).fill(0);
  const history = [];
  let iters = 0;
  for (let k = 0; k < maxIter; k++) {
    const xOld = [...x];
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let j = 0; j < n; j++) {
        if (j !== i) sum -= A[i][j] * x[j];
      }
      x[i] = (1 - omega) * x[i] + omega * (sum / A[i][i]);
    }
    const err = Math.max(...x.map((v, i) => Math.abs(v - xOld[i])));
    history.push({ iter: k+1, x: [...x], err });
    iters = k + 1;
    if (err < tol) break;
  }
  return { x, iters, history };
}

// --- DESCOMPOSICIÓN LU (Doolittle) ---
function luDecomp(A, b) {
  const n = A.length;
  const L = Array.from({length:n}, (_,i) => Array.from({length:n}, (_,j) => i===j?1:0));
  const U = A.map(row => [...row]);

  for (let k = 0; k < n; k++) {
    for (let i = k+1; i < n; i++) {
      L[i][k] = U[i][k] / U[k][k];
      for (let j = k; j < n; j++) {
        U[i][j] -= L[i][k] * U[k][j];
      }
    }
  }
  // Sustitución hacia adelante: Ly = b
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = b[i];
    for (let j = 0; j < i; j++) sum -= L[i][j] * y[j];
    y[i] = sum;
  }
  // Sustitución hacia atrás: Ux = y
  const x = new Array(n).fill(0);
  for (let i = n-1; i >= 0; i--) {
    let sum = y[i];
    for (let j = i+1; j < n; j++) sum -= U[i][j] * x[j];
    x[i] = sum / U[i][i];
  }
  return { x, L, U };
}

// --- Distribuir por plantas (proporcionalmente) ---
function distribuir(x, c1, c2, c3) {
  const total = c1 + c2 + c3;
  const ratios = [c1/total, c2/total, c3/total];
  // Cada planta aporta proporcional a su capacidad en cada zona
  const mat = ratios.map(r => x.map(v => +(v * r).toFixed(2)));
  return mat;
}

// --- RESOLVER (botón) ---
function resolver() {
  const dN   = parseFloat(document.getElementById('dNorte').value)  || 150;
  const dC   = parseFloat(document.getElementById('dCentro').value) || 200;
  const dS   = parseFloat(document.getElementById('dSur').value)    || 180;
  const c1   = parseFloat(document.getElementById('cap1').value)    || 200;
  const c2   = parseFloat(document.getElementById('cap2').value)    || 180;
  const c3   = parseFloat(document.getElementById('cap3').value)    || 150;
  const tol  = parseFloat(document.getElementById('tolIter')?.value) || 0.0001;
  const maxI = parseInt(document.getElementById('maxIterIter')?.value) || 100;
  const omega= parseFloat(document.getElementById('omega')?.value)  || 1.2;
  const tolS = parseFloat(document.getElementById('tol')?.value)    || 0.0001;
  const maxIS= parseInt(document.getElementById('maxIter')?.value)  || 100;

  const { A, b } = buildSystem(dN, dC, dS, c1, c2, c3);

  let result, infoText = '';

  if (currentMethod === 'jacobi') {
    result = jacobi(A, b, tol, maxI);
    infoText = `Convergió en <strong>${result.iters}</strong> iteraciones · Jacobi`;
  } else if (currentMethod === 'gaussseidel') {
    result = gaussSeidel(A, b, tol, maxI);
    infoText = `Convergió en <strong>${result.iters}</strong> iteraciones · Gauss-Seidel`;
  } else if (currentMethod === 'sor') {
    result = sor(A, b, omega, tolS, maxIS);
    infoText = `Convergió en <strong>${result.iters}</strong> iteraciones · SOR (ω=${omega})`;
    result.history = result.history;
  } else {
    result = luDecomp(A, b);
    infoText = `Solución exacta (sin iteraciones) · Descomposición LU`;
    result.iters = 1; result.history = [];
  }

  const x = result.x.map(v => Math.max(0, +v.toFixed(2)));
  const mat = distribuir(x, c1, c2, c3);

  // Mostrar resultados
  document.getElementById('resultsPanel').style.display = '';
  document.getElementById('methodBadge').textContent = currentMethod.toUpperCase();
  document.getElementById('iterInfo').innerHTML = infoText;

  // Métricas
  const grid = document.getElementById('resultGrid');
  const labels = ['Zona Norte', 'Zona Centro', 'Zona Sur'];
  grid.innerHTML = x.map((v, i) => `
    <div class="result-item">
      <span class="result-value">${v}</span>
      <span class="result-label">${labels[i]}<br/><small>ton totales</small></span>
    </div>`).join('');

  // Tabla
  const tbody = document.getElementById('tableBody');
  const plantas = ['Planta 1', 'Planta 2', 'Planta 3'];
  tbody.innerHTML = mat.map((row, i) => `
    <tr>
      <td>${plantas[i]}</td>
      <td>${row[0]}</td>
      <td>${row[1]}</td>
      <td>${row[2]}</td>
    </tr>`).join('');

  // Gráfico
  renderChart(mat, labels, plantas);

  // Mostrar iteraciones si aplica
  if (result.history && result.history.length > 0) {
    const errs = result.history.map(h => h.err.toFixed(6));
    document.getElementById('iterInfo').innerHTML +=
      `<br/>Errores por iteración: ${errs.slice(0,8).join(' → ')}${errs.length>8?'…':''}`;
  }
}

function renderChart(mat, zonas, plantas) {
  const ctx = document.getElementById('chartA').getContext('2d');
  if (chartInstance) chartInstance.destroy();

  const colors = ['#ff6b35','#ffd166','#ff9f1c'];

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: zonas,
      datasets: plantas.map((p, i) => ({
        label: p,
        data: mat[i],
        backgroundColor: colors[i] + 'cc',
        borderColor: colors[i],
        borderWidth: 1,
        borderRadius: 3,
      }))
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#e8e8f0', font: { family: 'Space Mono', size: 10 } } },
        title: { display: true, text: 'Distribución de carga por zona y planta (ton)',
          color: '#6b6b80', font: { family: 'Syne', size: 12 } }
      },
      scales: {
        x: { stacked: true, ticks: { color: '#6b6b80' }, grid: { color: '#2a2a3a' } },
        y: { stacked: true, ticks: { color: '#6b6b80' }, grid: { color: '#2a2a3a' } }
      }
    }
  });
}