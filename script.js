const menuButton = document.querySelector('.menu-toggle');
const primaryNav = document.querySelector('#primary-nav');

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  primaryNav?.classList.toggle('open', !isOpen);
});

primaryNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    menuButton?.setAttribute('aria-expanded', 'false');
    primaryNav.classList.remove('open');
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
    menuButton.setAttribute('aria-expanded', 'false');
    primaryNav?.classList.remove('open');
    menuButton.focus();
  }
});

const svgNode = (name, attributes = {}) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
};

const functionSelect = document.querySelector('#function-select');
const functionPath = document.querySelector('#function-path');
const functionPoint = document.querySelector('#function-point');
const functionPlot = document.querySelector('#function-plot');
const functionEquation = document.querySelector('#function-equation');

function updateFunctionPlot() {
  if (!functionSelect || !functionPath) return;
  const key = functionSelect.value;
  const functions = {
    sin: { fn: Math.sin, equation: 'y = sin(x)' },
    cos: { fn: Math.cos, equation: 'y = cos(x)' },
    parabola: { fn: (x) => x * x - 1, equation: 'y = x² − 1' },
  };
  const selected = functions[key] ?? functions.sin;
  const xMin = -8;
  const xMax = 8;
  const yMin = -2.2;
  const yMax = 2.2;
  const px = (x) => 20 + ((x - xMin) / (xMax - xMin)) * 480;
  const py = (y) => 12 + ((yMax - y) / (yMax - yMin)) * 256;
  const points = [];
  for (let i = 0; i <= 320; i += 1) {
    const x = xMin + (i / 320) * (xMax - xMin);
    const y = selected.fn(x);
    points.push(`${i ? 'L' : 'M'}${px(x).toFixed(2)} ${py(y).toFixed(2)}`);
  }
  functionPath.setAttribute('d', points.join(' '));
  functionPath.setAttribute('stroke', key === 'parabola' ? '#c58a32' : '#263b80');
  if (functionPoint) {
    const sampleX = 1.25;
    functionPoint.setAttribute('cx', px(sampleX));
    functionPoint.setAttribute('cy', py(selected.fn(sampleX)));
    functionPoint.setAttribute('fill', key === 'parabola' ? '#c58a32' : '#263b80');
  }
  functionPlot?.setAttribute('aria-label', `Graph of ${selected.equation}`);
  if (functionEquation) functionEquation.textContent = selected.equation;
}

function updateNewtonPlot() {
  const slider = document.querySelector('#newton-start');
  const path = document.querySelector('#newton-function');
  const stepsGroup = document.querySelector('#newton-steps');
  const valueOutput = document.querySelector('#newton-start-value');
  const result = document.querySelector('#newton-result');
  if (!slider || !path || !stepsGroup) return;

  let x = Number(slider.value);
  if (valueOutput) valueOutput.value = x.toFixed(2);
  const xMin = -2.6;
  const xMax = 2.6;
  const yMin = -2.5;
  const yMax = 5;
  const px = (value) => 20 + ((value - xMin) / (xMax - xMin)) * 480;
  const py = (value) => 12 + ((yMax - value) / (yMax - yMin)) * 256;
  const graphPoints = [];
  for (let i = 0; i <= 240; i += 1) {
    const current = xMin + (i / 240) * (xMax - xMin);
    graphPoints.push(`${i ? 'L' : 'M'}${px(current).toFixed(2)} ${py(current * current - 2).toFixed(2)}`);
  }
  path.setAttribute('d', graphPoints.join(' '));
  stepsGroup.replaceChildren();
  for (let i = 0; i < 5; i += 1) {
    const fx = x * x - 2;
    const next = x - fx / (2 * x);
    const tangent = svgNode('line', {
      x1: px(x), y1: py(fx), x2: px(next), y2: py(0),
      class: 'newton-tangent',
    });
    const point = svgNode('circle', { cx: px(x), cy: py(fx), r: 4, class: 'newton-step-point' });
    stepsGroup.append(tangent, point);
    x = next;
  }
  stepsGroup.append(svgNode('circle', { cx: px(x), cy: py(0), r: 5, class: 'newton-root-point' }));
  if (result) result.textContent = `Five iterations give x ≈ ${x.toFixed(8)}. The positive root is √2 ≈ ${Math.sqrt(2).toFixed(8)}.`;
}

const numberFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
const formatN = (value) => `${numberFormat.format(value)} N`;

function updateRampCalculator() {
  const mass = Number(document.querySelector('#stone-mass')?.value);
  const height = Number(document.querySelector('#ramp-height')?.value);
  const length = Number(document.querySelector('#ramp-length')?.value);
  const friction = Number(document.querySelector('#friction')?.value);
  const error = document.querySelector('#ramp-error');
  const outputIds = ['weight-output', 'angle-output', 'ideal-output', 'friction-output', 'tonne-output'];
  const outputs = Object.fromEntries(outputIds.map((id) => [id, document.getElementById(id)]));

  let message = '';
  if (![mass, height, length, friction].every(Number.isFinite) || mass <= 0 || height <= 0 || length <= 0 || friction < 0) {
    message = 'Enter positive mass, height and ramp length values, and a non-negative friction coefficient.';
  } else if (height > length) {
    message = 'The height must not exceed the ramp length.';
  }

  if (error) error.textContent = message;
  if (message) {
    Object.values(outputs).forEach((output) => { if (output) output.textContent = '—'; });
    return;
  }

  const g = 9.80665;
  const theta = Math.asin(height / length);
  const weight = mass * g;
  const idealForce = weight * Math.sin(theta);
  const frictionForce = weight * (Math.sin(theta) + friction * Math.cos(theta));
  if (outputs['weight-output']) outputs['weight-output'].textContent = formatN(weight);
  if (outputs['angle-output']) outputs['angle-output'].textContent = `${(theta * 180 / Math.PI).toFixed(2)}°`;
  if (outputs['ideal-output']) outputs['ideal-output'].textContent = formatN(idealForce);
  if (outputs['friction-output']) outputs['friction-output'].textContent = formatN(frictionForce);
  if (outputs['tonne-output']) outputs['tonne-output'].textContent = `${(frictionForce / 9806.65).toFixed(3)} tonnes-force`;
}

functionSelect?.addEventListener('change', updateFunctionPlot);
document.querySelector('#newton-start')?.addEventListener('input', updateNewtonPlot);
['stone-mass', 'ramp-height', 'ramp-length', 'friction'].forEach((id) => {
  document.querySelector(`#${id}`)?.addEventListener('input', updateRampCalculator);
});

updateFunctionPlot();
updateNewtonPlot();
updateRampCalculator();
