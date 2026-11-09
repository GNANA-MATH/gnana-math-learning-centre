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
