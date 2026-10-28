const formatDay = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const formatMonth = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const formatSnapshot = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const DAY = 86400000;
const services = { github: { name: 'GitHub', unit: 'contributions' }, leetcode: { name: 'LeetCode', unit: 'submissions' } };

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

let described;
function hideTooltip() {
  document.querySelector('#heatmap-tooltip').hidden = true;
  described?.removeAttribute('aria-describedby');
  described = null;
}

function showTooltip(button) {
  const tooltip = document.querySelector('#heatmap-tooltip');
  described?.removeAttribute('aria-describedby');
  described = button;
  tooltip.textContent = button.getAttribute('aria-label');
  tooltip.hidden = false;
  button.setAttribute('aria-describedby', tooltip.id);
  const bounds = button.getBoundingClientRect();
  const left = Math.max(10, Math.min(window.innerWidth - tooltip.offsetWidth - 10, bounds.left + bounds.width / 2 - tooltip.offsetWidth / 2));
  let top = bounds.top - tooltip.offsetHeight - 12;
  if (top < 90) top = bounds.bottom + 10;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function unavailable(card, service) {
  card.querySelector('.activity-loading')?.remove();
  card.append(element('p', 'activity-unavailable', `${service.name} activity is temporarily unavailable. You can still visit the profile above.`));
}

function renderCalendar(card, provider, service, snapshot) {
  card.querySelector('.activity-loading')?.remove();
  const year = snapshot.year;
  card.querySelector('.heatmap-year').textContent = String(year);
  const dates = new Map(provider.days.map(day => [day.date, day.count]));
  const max = Math.max(1, ...provider.days.map(day => day.count));
  const thresholds = [...new Set(provider.days.filter(day => day.count > 0).map(day => day.count))].sort((a, b) => a - b);
  const level = (count) => count === 0 ? 0 : 1 + Math.min(3, Math.floor(thresholds.indexOf(count) / Math.max(thresholds.length, 1) * 4));

  const stats = element('div', 'heatmap-stats');
  for (const [value, label] of [[provider.total, service.unit], [provider.activeDays, 'active days'], [provider.longestStreak, 'day longest streak']]) {
    const stat = element('p');
    stat.append(element('strong', null, value.toLocaleString()), element('span', null, label.toUpperCase()));
    stats.append(stat);
  }
  card.append(stats);

  const scroll = element('div', 'heatmap-scroll');
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', `${service.name} ${year} activity calendar; scroll horizontally on small screens`);
  const table = element('table', 'heatmap-table');
  const caption = element('caption', 'sr-only', `${service.name} ${service.unit} by day in ${year}. Arrow keys move between dates, Home and End jump to the first and last available date.`);
  table.append(caption);
  const yearStart = Date.UTC(year, 0, 1);
  const calendarStart = yearStart - new Date(yearStart).getUTCDay() * DAY;
  const yearEnd = Date.UTC(year, 11, 31);
  const weekCount = Math.ceil((yearEnd - calendarStart + DAY) / DAY / 7);
  const head = element('thead');
  const monthRow = element('tr');
  const spacer = element('th');
  spacer.setAttribute('aria-label', 'Weekday');
  monthRow.append(spacer);
  let monthCell;
  let previousMonth = -1;
  for (let week = 0; week < weekCount; week += 1) {
    const date = new Date(Math.max(yearStart, calendarStart + week * 7 * DAY));
    const month = date.getUTCMonth();
    if (month !== previousMonth) {
      monthCell = element('th', 'heatmap-month', formatMonth.format(date));
      monthCell.colSpan = 1;
      monthCell.scope = 'colgroup';
      monthRow.append(monthCell);
      previousMonth = month;
    } else monthCell.colSpan += 1;
  }
  head.append(monthRow);
  table.append(head);
  const body = element('tbody');
  const buttonsByDate = new Map();
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let row = 0; row < 7; row += 1) {
    const tr = element('tr');
    const label = element('th', 'heatmap-weekday');
    label.scope = 'row';
    label.append(element('span', row % 2 === 0 ? 'sr-only' : null, labels[row]));
    tr.append(label);
    for (let week = 0; week < weekCount; week += 1) {
      const timestamp = calendarStart + (week * 7 + row) * DAY;
      const date = new Date(timestamp).toISOString().slice(0, 10);
      const td = element('td');
      if (timestamp < yearStart || timestamp > yearEnd) { td.className = 'heatmap-padding'; tr.append(td); continue; }
      if (date > snapshot.through || !dates.has(date)) {
        td.append(element('span', 'heatmap-cell is-unknown'));
        td.setAttribute('aria-label', `${formatDay.format(timestamp)}: after snapshot date or no data collected`);
      } else {
        const count = dates.get(date);
        const button = element('button', `heatmap-cell heat-${level(count)}`);
        button.type = 'button';
        button.tabIndex = -1;
        button.dataset.date = date;
        button.dataset.count = String(count);
        button.setAttribute('aria-label', `${count} ${count === 1 ? service.unit.slice(0, -1) : service.unit} on ${formatDay.format(timestamp)}`);
        button.addEventListener('pointerenter', () => showTooltip(button));
        button.addEventListener('pointerleave', hideTooltip);
        button.addEventListener('focus', () => showTooltip(button));
        button.addEventListener('blur', hideTooltip);
        button.addEventListener('click', () => { activate(button); showTooltip(button); });
        buttonsByDate.set(date, button);
        td.append(button);
      }
      tr.append(td);
    }
    body.append(tr);
  }
  table.append(body);
  scroll.append(table);
  card.append(scroll);

  const buttons = [...buttonsByDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, button]) => button);
  let activeButton = buttons.at(-1);
  if (activeButton) activeButton.tabIndex = 0;
  function activate(button) {
    if (activeButton) activeButton.tabIndex = -1;
    activeButton = button;
    button.tabIndex = 0;
  }
  table.addEventListener('keydown', (event) => {
    const button = event.target.closest('button.heatmap-cell');
    if (!button) return;
    const index = buttons.indexOf(button);
    let next = index;
    if (event.key === 'ArrowLeft') next -= 7;
    else if (event.key === 'ArrowRight') next += 7;
    else if (event.key === 'ArrowUp') next -= 1;
    else if (event.key === 'ArrowDown') next += 1;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else if (event.key === 'Escape') { hideTooltip(); return; }
    else return;
    event.preventDefault();
    next = Math.max(0, Math.min(buttons.length - 1, next));
    activate(buttons[next]);
    buttons[next].focus({ preventScroll: true });
    buttons[next].scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    showTooltip(buttons[next]);
  });
  scroll.addEventListener('scroll', hideTooltip, { passive: true });

  const footer = element('div', 'heatmap-footer');
  const status = provider.status === 'stale' ? 'LAST AVAILABLE SNAPSHOT' : 'SNAPSHOT';
  footer.append(element('span', 'heatmap-stamp', `${status} / ${formatSnapshot.format(new Date(provider.fetchedAt)).toUpperCase()}`));
  const legend = element('div', 'heatmap-legend');
  legend.setAttribute('aria-label', `Daily activity intensity: zero through ${max} ${service.unit}`);
  legend.append(element('span', null, 'LESS'));
  for (let i = 0; i < 5; i += 1) {
    const swatch = element('i', `heat-${i}`);
    swatch.setAttribute('aria-hidden', 'true');
    legend.append(swatch);
  }
  legend.append(element('span', null, 'MORE'));
  footer.append(legend);
  card.append(footer);
}

export async function initActivity() {
  try {
    const response = await fetch('/activity.json');
    if (!response.ok) throw new Error('Activity snapshot is unavailable');
    const snapshot = await response.json();
    if (!Number.isInteger(snapshot.year) || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.through)) throw new Error('Invalid activity snapshot');
    document.querySelector('#activity-updated').textContent = `PUBLIC ACTIVITY / ${snapshot.year}`;
    for (const [name, service] of Object.entries(services)) {
      const card = document.querySelector(`[data-provider="${name}"]`);
      const provider = snapshot.providers?.[name];
      const valid = provider && ['ok', 'stale'].includes(provider.status) && Array.isArray(provider.days) && provider.days.length > 0 && provider.days.every(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && Number.isSafeInteger(day.count) && day.count >= 0);
      if (valid) renderCalendar(card, provider, service, snapshot);
      else unavailable(card, service);
    }
    window.dispatchEvent(new Event('portfolio:layout'));
  } catch {
    for (const [name, service] of Object.entries(services)) unavailable(document.querySelector(`[data-provider="${name}"]`), service);
  }
  window.addEventListener('scroll', hideTooltip, { passive: true });
  window.addEventListener('resize', hideTooltip, { passive: true });
}
