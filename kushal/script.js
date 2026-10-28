import { projects } from './projects.js';
import { initActivity } from './activity.js';

initActivity();

const $ = (selector) => document.querySelector(selector);
const filters = [...document.querySelectorAll('[data-filter]')];
const cards = [...document.querySelectorAll('.project-card')];
const search = $('#project-search');
let category = 'all';

function signalLayout() {
  window.dispatchEvent(new Event('portfolio:layout'));
}

function applyFilters() {
  const query = search.value.toLocaleLowerCase().trim();
  let count = 0;
  for (const card of cards) {
    const show = (category === 'all' || card.dataset.category === category) && card.dataset.search.includes(query);
    card.hidden = !show;
    if (show) count += 1;
  }
  for (const button of filters) {
    const active = button.dataset.filter === category;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  $('#no-results').hidden = count > 0;
  $('#result-count').textContent = `${String(count).padStart(2, '0')} ${count === 1 ? 'PROJECT' : 'PROJECTS'} / ${category === 'all' ? 'ALL DISCIPLINES' : filters.find((button) => button.dataset.filter === category).textContent.trim()}`;
  signalLayout();
}

for (const button of filters) button.addEventListener('click', () => {
  category = button.dataset.filter;
  applyFilters();
});
search.addEventListener('input', applyFilters);
$('#clear-filters').addEventListener('click', () => {
  category = 'all';
  search.value = '';
  applyFilters();
  search.focus({ preventScroll: true });
});

const navigation = $('#navigation');
const menuButton = $('#menu-toggle');
function setMenu(open) {
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('is-open', open);
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
navigation.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
document.addEventListener('click', (event) => { if (!event.target.closest('.site-header')) setMenu(false); });
window.matchMedia('(min-width: 761px)').addEventListener('change', () => setMenu(false));

const dialog = $('#project-dialog');
for (const button of document.querySelectorAll('[data-project]')) button.addEventListener('click', () => {
  const project = projects[button.dataset.project];
  $('#dialog-title').textContent = project.name;
  $('#dialog-category').textContent = project.category;
  $('#dialog-description').textContent = project.description;
  $('#dialog-details').replaceChildren(...project.details.map((detail) => {
    const item = document.createElement('li');
    item.textContent = detail;
    return item;
  }));
  $('#dialog-tags').replaceChildren(...project.tags.map((tag) => {
    const item = document.createElement('span');
    item.textContent = tag;
    return item;
  }));
  $('#dialog-note').hidden = !project.note;
  $('#dialog-note').textContent = project.note || '';
  $('#dialog-link').href = project.url;
  dialog.showModal();
  document.body.classList.add('modal-open');
  dialog.scrollTop = 0;
  signalLayout();
});
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  signalLayout();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setMenu(false);
  if (event.key === '/' && !dialog.open && !event.target.closest('input, textarea, select, [contenteditable]')) {
    event.preventDefault();
    search.focus();
    search.scrollIntoView({ block: 'center', behavior: 'auto' });
  }
});

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').classList.add('is-visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('is-visible'), 3500);
}
$('#copy-email').addEventListener('click', async () => {
  const email = 'kushalgowda57365@gmail.com';
  try {
    await navigator.clipboard.writeText(email);
    toast('EMAIL COPIED. LET’S MAKE SOMETHING.');
  } catch {
    toast(email);
  }
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let motion = !reducedMotion.matches;
try {
  const saved = localStorage.getItem('kushal-motion');
  if (saved !== null && !reducedMotion.matches) motion = saved === 'on';
} catch { /* Storage can be unavailable in a private browsing context. */ }

function setMotion(enabled, save = false) {
  motion = enabled;
  document.body.dataset.motion = motion ? 'on' : 'off';
  $('#motion-toggle').setAttribute('aria-pressed', String(motion));
  $('#motion-toggle').title = motion ? 'Pause scene motion' : 'Play scene motion';
  $('#motion-label').textContent = motion ? 'MOTION ON' : 'MOTION OFF';
  if (save) {
    try { localStorage.setItem('kushal-motion', motion ? 'on' : 'off'); } catch { /* Keep the current session preference. */ }
  }
  window.dispatchEvent(new CustomEvent('portfolio:motion', { detail: motion }));
}
setMotion(motion);
$('#motion-toggle').addEventListener('click', () => setMotion(!motion, true));
reducedMotion.addEventListener('change', (event) => setMotion(!event.matches));
$('#reset-scene').addEventListener('click', () => window.dispatchEvent(new Event('portfolio:reset')));

const timeFormatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
function updateTime() { $('#local-time').textContent = timeFormatter.format(new Date()); }
updateTime();
setInterval(updateTime, 30000);
$('#year').textContent = new Date().getFullYear();

let scrollFrame = 0;
function updateProgress() {
  scrollFrame = 0;
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  $('#progress').style.transform = `scaleX(${distance > 0 ? window.scrollY / distance : 0})`;
}
window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateProgress); }, { passive: true });
window.addEventListener('resize', updateProgress, { passive: true });
updateProgress();

if ('IntersectionObserver' in window) {
  const sectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of navigation.querySelectorAll('a')) {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  }, { rootMargin: '-20% 0px -55% 0px' });
  for (const section of document.querySelectorAll('main > section')) sectionObserver.observe(section);
}

import('./scene.js').then(({ createPortfolioScenes }) => createPortfolioScenes()).catch((error) => {
  document.documentElement.dataset.webgl = 'fallback';
  $('#scene-caption').textContent = 'CURIOUS BY DEFAULT. ALWAYS BUILDING.';
  $('#reset-scene').hidden = true;
  console.warn('The 3D scene is unavailable. Showing the static design.', error);
});
