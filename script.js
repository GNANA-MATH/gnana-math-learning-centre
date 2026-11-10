const menuButton = document.querySelector('.menu-toggle');
const primaryNav = document.querySelector('#primary-nav');
const navDropdowns = [...document.querySelectorAll('.nav-dropdown')];

const closeDropdown = (dropdown, { returnFocus = false } = {}) => {
  const toggle = dropdown?.querySelector('.nav-dropdown-toggle');
  const submenu = dropdown?.querySelector('.nav-submenu');
  toggle?.setAttribute('aria-expanded', 'false');
  if (submenu) submenu.hidden = true;
  if (returnFocus) toggle?.focus();
};

const closeAllDropdowns = ({ returnFocusTo = null } = {}) => {
  navDropdowns.forEach((dropdown) => closeDropdown(dropdown, {
    returnFocus: dropdown === returnFocusTo,
  }));
};

navDropdowns.forEach((dropdown) => {
  const toggle = dropdown.querySelector('.nav-dropdown-toggle');
  const submenu = dropdown.querySelector('.nav-submenu');
  toggle?.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    closeAllDropdowns();
    toggle.setAttribute('aria-expanded', String(!isOpen));
    if (submenu) submenu.hidden = isOpen;
  });
  dropdown.addEventListener('focusout', (event) => {
    if (!dropdown.contains(event.relatedTarget)) closeDropdown(dropdown);
  });
});

menuButton?.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  if (isOpen) closeAllDropdowns();
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  primaryNav?.classList.toggle('open', !isOpen);
});

primaryNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    closeAllDropdowns();
    menuButton?.setAttribute('aria-expanded', 'false');
    primaryNav.classList.remove('open');
  });
});

document.addEventListener('keydown', (event) => {
  const openDropdown = navDropdowns.find((dropdown) => dropdown.querySelector('.nav-dropdown-toggle')?.getAttribute('aria-expanded') === 'true');
  if (event.key === 'Escape' && openDropdown) {
    closeAllDropdowns({ returnFocusTo: openDropdown });
  } else if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
    menuButton.setAttribute('aria-expanded', 'false');
    primaryNav?.classList.remove('open');
    menuButton.focus();
  }
});

document.addEventListener('click', (event) => {
  if (!event.target.closest?.('.nav-dropdown')) closeAllDropdowns();
});

const navAnchorTargets = [...(primaryNav?.querySelectorAll('a[href^="#"]') ?? [])]
  .map((link) => ({ link, target: document.getElementById(decodeURIComponent(link.hash.slice(1))) }))
  .filter(({ target }) => target);

const updateActiveNavigation = () => {
  if (!navAnchorTargets.length) return;
  const headerBottom = document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0;
  const visibleTargets = navAnchorTargets
    .map((item) => ({ ...item, top: item.target.getBoundingClientRect().top, bottom: item.target.getBoundingClientRect().bottom }))
    .filter(({ bottom }) => bottom > headerBottom + 8)
    .sort((a, b) => {
      const aHasPassed = a.top <= headerBottom + 24;
      const bHasPassed = b.top <= headerBottom + 24;
      if (aHasPassed !== bHasPassed) return aHasPassed ? -1 : 1;
      return aHasPassed ? b.top - a.top : a.top - b.top;
    });
  const current = visibleTargets[0]?.link;
  navAnchorTargets.forEach(({ link }) => {
    if (link === current) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
    const dropdown = link.closest('.nav-dropdown');
    if (dropdown) dropdown.querySelector('.nav-dropdown-toggle')?.classList.toggle('is-active', [...dropdown.querySelectorAll('a')].some((item) => item === current));
  });
};

let navUpdatePending = false;
const scheduleNavigationUpdate = () => {
  if (navUpdatePending) return;
  navUpdatePending = true;
  window.requestAnimationFrame(() => {
    navUpdatePending = false;
    updateActiveNavigation();
  });
};
window.addEventListener('scroll', scheduleNavigationUpdate, { passive: true });
window.addEventListener('resize', scheduleNavigationUpdate);
window.addEventListener('hashchange', scheduleNavigationUpdate);
scheduleNavigationUpdate();

const templeCalculatorInputs = {
  mass: document.querySelector('#temple-mass'),
  height: document.querySelector('#temple-ramp-height'),
  length: document.querySelector('#temple-ramp-length'),
  friction: document.querySelector('#temple-friction'),
};
const templeCalculatorError = document.querySelector('#temple-calculator-error');
const templeNumberFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

function updateTempleCalculator() {
  if (Object.values(templeCalculatorInputs).some((input) => !input)) return;

  const values = Object.fromEntries(Object.entries(templeCalculatorInputs).map(([name, input]) => [name, Number(input.value)]));
  let message = '';
  if (!Object.values(values).every(Number.isFinite)) {
    message = 'Enter finite numeric values for all four inputs.';
  } else if (values.mass <= 0) {
    message = 'Stone mass must be greater than zero.';
  } else if (values.height <= 0 || values.length <= 0) {
    message = 'Ramp height and ramp length must both be greater than zero.';
  } else if (values.height > values.length) {
    message = 'Ramp height must not exceed ramp length.';
  } else if (values.friction < 0) {
    message = 'The friction coefficient must be zero or greater.';
  }

  Object.entries(templeCalculatorInputs).forEach(([name, input]) => {
    const value = values[name];
    const invalid = !Number.isFinite(value)
      || (name === 'mass' && value <= 0)
      || ((name === 'height' || name === 'length') && value <= 0)
      || (name === 'friction' && value < 0)
      || (name === 'height' && Number.isFinite(values.length) && value > values.length);
    input.setAttribute('aria-invalid', String(invalid));
  });

  if (templeCalculatorError) templeCalculatorError.textContent = message;
  const outputIds = ['temple-weight-output', 'temple-angle-output', 'temple-ideal-output', 'temple-friction-output', 'temple-tonne-output'];
  const outputs = outputIds.map((id) => document.getElementById(id));
  if (message) {
    outputs.forEach((output) => { if (output) output.textContent = '—'; });
    return;
  }

  const g = 9.80665;
  const theta = Math.asin(values.height / values.length);
  const weight = values.mass * g;
  const idealForce = weight * Math.sin(theta);
  const frictionForce = values.friction * weight * Math.cos(theta);
  const uphillPull = idealForce + frictionForce;
  const formatForce = (force) => `${templeNumberFormat.format(force)} N`;
  const results = [
    formatForce(weight),
    `${templeNumberFormat.format(theta * 180 / Math.PI)}°`,
    formatForce(idealForce),
    formatForce(uphillPull),
    `${templeNumberFormat.format(uphillPull / (1000 * g))} tonnes-force`,
  ];
  outputs.forEach((output, index) => { if (output) output.textContent = results[index]; });
}

Object.values(templeCalculatorInputs).forEach((input) => input?.addEventListener('input', updateTempleCalculator));
updateTempleCalculator();

const quickReferenceTopics = {
  calculus: 'Calculus',
  'differential-equations': 'Differential Equations',
  'linear-algebra': 'Linear Algebra',
  transforms: 'Transforms',
  'probability-statistics': 'Probability & Statistics',
  'numerical-methods': 'Numerical Methods',
  'mathematical-modelling': 'Mathematical Modelling',
};

const quickReferenceResources = [
  {
    title: 'Laplace Transformation',
    filename: 'GNANA_MATH_Laplace_Transformation_Quick_Reference.pdf',
    path: 'resources/quick-reference/GNANA_MATH_Laplace_Transformation_Quick_Reference.pdf',
    topics: ['differential-equations', 'transforms'],
    category: 'Differential Equations · Transforms',
    description: 'Transform pairs, operational rules, inverse methods, and a structured workflow for linear ODE initial-value problems.',
  },
  {
    title: 'Eigenvalues and Eigenvectors',
    filename: 'GNANA_MATH_Eigenvalues_Eigenvectors_Quick_Reference.pdf',
    path: 'resources/quick-reference/GNANA_MATH_Eigenvalues_Eigenvectors_Quick_Reference.pdf',
    topics: ['linear-algebra'],
    category: 'Linear Algebra',
    description: 'Definitions, characteristic equations, matrix properties, Cayley–Hamilton, computation methods, and diagonalization.',
  },
  {
    title: 'Higher-Order Differential Equations',
    filename: 'GNANA_MATH_Higher_Order_Differential_Equations_Unified_Quick_Reference (1).pdf',
    path: 'resources/quick-reference/GNANA_MATH_Higher_Order_Differential_Equations_Unified_Quick_Reference (1).pdf',
    topics: ['differential-equations'],
    category: 'Differential Equations',
    description: 'Complementary functions, particular integrals, resonance, Cauchy–Euler equations, and solution-method selection.',
  },
  {
    title: 'Fourier Series and Fourier Transform',
    filename: 'GNANA_MATH_Fourier_Series_Transform_Visual_Quick_Reference_V2.pdf',
    path: 'resources/quick-reference/GNANA_MATH_Fourier_Series_Transform_Visual_Quick_Reference_V2.pdf',
    topics: ['transforms'],
    category: 'Transforms · Primary Fourier reference',
    badge: 'Primary Fourier reference',
    description: 'A visual comparison of periodic Fourier series and continuous Fourier transforms, including core formulas, properties, and applications.',
  },
  {
    title: 'Numerical Integration',
    filename: 'GNANA_MATH_Numerical_Integration_Cheatsheet.pdf',
    path: 'resources/quick-reference/GNANA_MATH_Numerical_Integration_Cheatsheet.pdf',
    topics: ['numerical-methods'],
    category: 'Numerical Methods',
    description: 'Composite trapezoidal and Simpson rules, midpoint methods, Romberg extrapolation, quadrature, errors, and worked examples.',
  },
  {
    title: 'Probability Distributions',
    filename: 'GNANA_MATH_Probability_Distributions_Quick_Reference.pdf',
    path: 'resources/quick-reference/GNANA_MATH_Probability_Distributions_Quick_Reference.pdf',
    topics: ['probability-statistics'],
    category: 'Probability & Statistics · Cheatsheet 09',
    description: 'Probability concepts, random variables, common distributions, expectation, variance, and engineering applications.',
  },
  {
    title: 'Vector Calculus',
    filename: 'GNANA_MATH_Vector_Calculus_Unified_Quick_Reference.pdf',
    path: 'resources/quick-reference/GNANA_MATH_Vector_Calculus_Unified_Quick_Reference.pdf',
    topics: ['calculus'],
    category: 'Calculus',
    description: 'Vector fields, gradient, divergence, curl, line and surface integrals, and the Green, Gauss, and Stokes theorems.',
  },
  {
    title: 'Z-Transform',
    filename: 'GNANA_MATH_Z_Transform_Visual_Quick_Reference_CHEATSHEET_08.pdf',
    path: 'resources/quick-reference/GNANA_MATH_Z_Transform_Visual_Quick_Reference_CHEATSHEET_08.pdf',
    topics: ['transforms'],
    category: 'Transforms · Cheatsheet 08',
    description: 'Unilateral and bilateral transforms, transform pairs, properties, regions of convergence, inverse methods, and applications.',
  },
  {
    title: 'Fourier Series and PDE Applications',
    filename: 'GNANA_MATH_Fourier_Series_PDE_Applications_Quick_Reference.pdf',
    path: 'resources/quick-reference/GNANA_MATH_Fourier_Series_PDE_Applications_Quick_Reference.pdf',
    topics: ['differential-equations'],
    category: 'Differential Equations · Supplementary',
    badge: 'Supplementary PDE reference',
    description: 'The existing supplementary sheet connects Fourier series with boundary-value problems, separation of variables, and heat, wave, and Laplace equations.',
  },
  {
    title: 'Fourier Transform',
    filename: 'GNANA_MATH_Fourier_Transform_Quick_Reference.pdf',
    path: 'resources/quick-reference/GNANA_MATH_Fourier_Transform_Quick_Reference.pdf',
    topics: ['transforms'],
    category: 'Transforms · Existing supplementary sheet',
    badge: 'Existing supplementary sheet',
    description: 'The existing detailed sheet covers transform pairs, properties, solution methods, worked examples, and signal-analysis applications.',
  },
];

const quickReferenceFilterButtons = [...document.querySelectorAll('.quick-reference-topic-button')];
const quickReferenceResults = document.querySelector('#quick-reference-results');
const quickReferenceEmpty = document.querySelector('#quick-reference-empty');
const quickReferenceViewer = document.querySelector('#quick-reference-viewer');
const quickReferenceViewerTitle = document.querySelector('#quick-reference-viewer-title');
const quickReferenceViewerTopic = document.querySelector('#quick-reference-viewer-topic');
const quickReferenceFrame = document.querySelector('#quick-reference-frame');
const quickReferenceOpen = document.querySelector('#quick-reference-open');
const quickReferenceDownload = document.querySelector('#quick-reference-download');
const quickReferenceBack = document.querySelector('#quick-reference-back');
let selectedQuickReferenceTopic = 'all';

function makeQuickReferenceElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function showQuickReference(resource) {
  if (!quickReferenceViewer || !quickReferenceFrame) return;
  quickReferenceResults.hidden = true;
  quickReferenceEmpty.hidden = true;
  quickReferenceViewer.hidden = false;
  quickReferenceViewerTitle.textContent = resource.title;
  quickReferenceViewerTopic.textContent = resource.topics.map((topic) => quickReferenceTopics[topic]).join(' · ');
  quickReferenceFrame.title = `${resource.title} PDF preview`;
  quickReferenceFrame.src = encodeURI(resource.path);
  quickReferenceOpen.href = encodeURI(resource.path);
  quickReferenceDownload.href = encodeURI(resource.path);
  quickReferenceDownload.download = resource.filename;
  quickReferenceViewerTitle.focus();
}

function addQuickReferenceCard(resource) {
  const card = makeQuickReferenceElement('article', 'resource-feature quick-reference-card');
  card.setAttribute('role', 'listitem');
  card.append(makeQuickReferenceElement('span', 'quick-reference-category', resource.category));
  if (resource.badge) card.append(makeQuickReferenceElement('span', 'quick-reference-card-badge', resource.badge));
  card.append(makeQuickReferenceElement('h4', '', resource.title));
  card.append(makeQuickReferenceElement('p', '', resource.description));

  const actions = makeQuickReferenceElement('div', 'quick-reference-card-actions');
  const viewButton = makeQuickReferenceElement('button', 'resource-action quick-reference-view-button', 'View PDF');
  viewButton.type = 'button';
  viewButton.setAttribute('aria-label', `View PDF: ${resource.title}`);
  viewButton.addEventListener('click', () => showQuickReference(resource));
  const downloadLink = makeQuickReferenceElement('a', 'quick-reference-download', 'Download PDF');
  downloadLink.href = encodeURI(resource.path);
  downloadLink.download = resource.filename;
  actions.append(viewButton, downloadLink);
  card.append(actions);
  return card;
}

function renderQuickReferenceTopic(topic) {
  if (!quickReferenceResults || !quickReferenceEmpty || !quickReferenceViewer) return;
  selectedQuickReferenceTopic = topic;
  quickReferenceViewer.hidden = true;
  quickReferenceFrame.src = 'about:blank';
  quickReferenceResults.hidden = false;
  quickReferenceResults.replaceChildren();
  quickReferenceFilterButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.topic === topic));
  });

  const visibleResources = topic === 'all'
    ? quickReferenceResources
    : quickReferenceResources.filter((resource) => resource.topics.includes(topic));
  visibleResources.forEach((resource) => quickReferenceResults.append(addQuickReferenceCard(resource)));
  quickReferenceResults.hidden = visibleResources.length === 0;
  quickReferenceEmpty.hidden = visibleResources.length > 0;
}

quickReferenceFilterButtons.forEach((button) => {
  button.addEventListener('click', () => renderQuickReferenceTopic(button.dataset.topic));
});

quickReferenceBack?.addEventListener('click', () => {
  quickReferenceViewer.hidden = true;
  quickReferenceFrame.src = 'about:blank';
  quickReferenceResults.hidden = false;
  const selectedButton = quickReferenceFilterButtons.find((button) => button.dataset.topic === selectedQuickReferenceTopic);
  selectedButton?.focus();
});

renderQuickReferenceTopic('all');

const calculusImageDialog = document.querySelector('#calculus-image-dialog');
const calculusDialogImage = document.querySelector('#calculus-dialog-image');
const calculusDialogCaption = document.querySelector('#calculus-dialog-caption');
const calculusDialogOriginal = document.querySelector('#calculus-dialog-original');
const calculusDialogClose = document.querySelector('#calculus-dialog-close');

document.querySelectorAll('.calculus-image-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (!calculusImageDialog || !calculusDialogImage || !calculusDialogCaption || !calculusDialogOriginal) return;
    const source = trigger.dataset.imageSrc;
    if (!source) return;

    const image = trigger.querySelector('img');
    const caption = trigger.closest('figure')?.querySelector('figcaption')?.textContent.trim() || 'Calculus visual learning resource';
    calculusDialogImage.src = source;
    calculusDialogImage.alt = trigger.dataset.imageAlt || image?.alt || caption;
    calculusDialogCaption.textContent = caption;
    calculusDialogOriginal.href = source;
    if (typeof calculusImageDialog.showModal === 'function') calculusImageDialog.showModal();
    else window.open(source, '_blank', 'noopener,noreferrer');
  });
});

calculusDialogClose?.addEventListener('click', () => calculusImageDialog?.close());
calculusImageDialog?.addEventListener('click', (event) => {
  if (event.target === calculusImageDialog) calculusImageDialog.close();
});
