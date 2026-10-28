import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';

const output = new URL('../public/activity.json', import.meta.url);
const now = new Date();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
const year = Number(today.slice(0, 4));
const fetchedAt = now.toISOString();
const headers = { 'User-Agent': 'KushalPortfolio/1.0 (public activity calendar)' };

async function request(url, options = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20000), headers: { ...headers, ...options.headers } });
      if (!response.ok) throw new Error(`Public activity source returned ${response.status}`);
      return response;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
    }
  }
}

function summary(days) {
  let total = 0;
  let activeDays = 0;
  let longestStreak = 0;
  let streak = 0;
  for (const day of days) {
    total += day.count;
    if (day.count > 0) { activeDays += 1; streak += 1; longestStreak = Math.max(longestStreak, streak); }
    else streak = 0;
  }
  return { total, activeDays, longestStreak };
}

async function github() {
  const username = 'ksu-gitreaper807';
  const url = `https://github.com/users/${username}/contributions?from=${year}-01-01&to=${year}-12-31`;
  const html = await (await request(url)).text();
  const counts = new Map();
  for (const match of html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)) {
    const id = match[1].match(/\bfor="([^"]+)"/)?.[1];
    const count = match[2].replace(/<[^>]*>/g, '').match(/\b(No|[\d,]+) contributions?\b/i)?.[1];
    if (id && count !== undefined) counts.set(id, count.toLowerCase() === 'no' ? 0 : Number(count.replaceAll(',', '')));
  }
  const days = [];
  for (const match of html.matchAll(/<td\b([^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*)>/g)) {
    const date = match[2];
    if (!date.startsWith(`${year}-`) || date > today) continue;
    const id = match[1].match(/\bid="([^"]+)"/)?.[1];
    const count = counts.get(id);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error(`Missing GitHub count for ${date}`);
    days.push({ date, count });
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  const expected = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  if (days.length !== expected || new Set(days.map(day => day.date)).size !== expected) throw new Error('Incomplete GitHub contribution calendar');
  return { status: 'ok', username, profile: `https://github.com/${username}`, source: url, fetchedAt, unit: 'contributions', days, ...summary(days) };
}

async function leetcode() {
  const username = 'SuedForAdultery';
  const query = 'query calendar($username: String!, $year: Int) { matchedUser(username: $username) { username userCalendar(year: $year) { submissionCalendar } } }';
  const response = await (await request('https://leetcode.com/graphql/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: `https://leetcode.com/u/${username}/`, 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query, variables: { username, year } })
  })).json();
  const calendar = response.data?.matchedUser?.userCalendar?.submissionCalendar;
  if (response.errors?.length || typeof calendar !== 'string') throw new Error('LeetCode public calendar is unavailable');
  const submissions = JSON.parse(calendar);
  if (typeof submissions !== 'object' || !submissions || Array.isArray(submissions)) throw new Error('Invalid LeetCode calendar');
  const byDate = new Map();
  for (const [timestamp, count] of Object.entries(submissions)) {
    if (!/^\d+$/.test(timestamp) || !Number.isSafeInteger(count) || count < 0) throw new Error('Invalid LeetCode submission count');
    const date = new Date(Number(timestamp) * 1000).toISOString().slice(0, 10);
    if (date.startsWith(`${year}-`) && date <= today) byDate.set(date, (byDate.get(date) || 0) + count);
  }
  const days = [];
  for (let date = Date.UTC(year, 0, 1); date <= Date.parse(`${today}T00:00:00Z`); date += 86400000) {
    const key = new Date(date).toISOString().slice(0, 10);
    days.push({ date: key, count: byDate.get(key) || 0 });
  }
  return { status: 'ok', username, profile: `https://leetcode.com/u/${username}/`, source: 'https://leetcode.com/graphql/', fetchedAt, unit: 'submissions', days, ...summary(days) };
}

let previous;
try { previous = JSON.parse(await readFile(output, 'utf8')); } catch {}
const data = { year, through: today, fetchedAt, providers: {} };
const results = await Promise.allSettled([github(), leetcode()]);
for (const [index, name] of ['github', 'leetcode'].entries()) {
  const result = results[index];
  if (result.status === 'fulfilled') {
    data.providers[name] = result.value;
    console.log(`${name}: ${result.value.total} ${result.value.unit}, ${result.value.activeDays} active days (${year})`);
  } else {
    console.warn(`${name}: ${result.reason.message}`);
    const retained = previous?.year === year ? previous.providers?.[name] : null;
    data.providers[name] = retained?.days?.length ? { ...retained, status: 'stale' } : { status: 'unavailable', days: [] };
  }
}
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
const temporary = new URL('../public/activity.json.tmp', import.meta.url);
await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`);
await rename(temporary, output);
if (results.every(result => result.status === 'rejected')) process.exitCode = 1;
