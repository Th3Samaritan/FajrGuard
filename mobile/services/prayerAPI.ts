import { PrayerTime } from '../store/prayerStore';

const BASE_URL = 'https://api.aladhan.com/v1/timings';

interface AladhanResponse {
  code: number;
  data: {
    timings: Record<string, string>;
    date: { readable: string; timestamp: string };
    meta: { timezone: string };
  };
}

const PRAYER_MAP: Record<string, string> = {
  Fajr: 'fajr', Dhuhr: 'dhuhr', Asr: 'asr', Maghrib: 'maghrib', Isha: 'isha',
};

function parseTimeOfDay(raw: string): string | null {
  const m = raw.match(/^\s*(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const hh = m[1].padStart(2, '0');
  const mm = m[2];
  return `${hh}:${mm}`;
}

function buildTimestamp(dateStr: string, time: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1, hour, minute, 0, 0);
  return d.getTime();
}

function timingsToPrayers(timings: Record<string, string>, dateStr: string): PrayerTime[] {
  const results: PrayerTime[] = [];
  for (const [name, raw] of Object.entries(timings)) {
    const prayerId = PRAYER_MAP[name];
    if (!prayerId) continue;
    const time = parseTimeOfDay(raw);
    if (!time) continue;
    const timestamp = buildTimestamp(dateStr, time);
    if (!Number.isFinite(timestamp)) continue;
    results.push({ prayerId, time, timestamp });
  }
  return results.sort((a, b) => a.timestamp - b.timestamp);
}

function toAladhanDateParam(date?: string): string {
  if (!date) {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [y, m, d] = date.split('-');
    return `${d}-${m}-${y}`;
  }
  return date;
}

function todayLocalIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function fetchPrayerTimes(
  lat: number, lng: number, date?: string, method = 2,
): Promise<PrayerTime[]> {
  const isoDate = date || todayLocalIso();
  const url = `${BASE_URL}/${toAladhanDateParam(isoDate)}?latitude=${lat}&longitude=${lng}&method=${method}`;
  const response = await fetch(url);
  const json: AladhanResponse = await response.json();
  if (json.code !== 200) throw new Error(`Aladhan API error: ${json.code}`);
  return timingsToPrayers(json.data.timings, isoDate);
}

export async function fetchPrayerTimesByCity(
  city: string, country: string, date?: string, method = 2,
): Promise<PrayerTime[]> {
  const isoDate = date || todayLocalIso();
  const url = `${BASE_URL}/${toAladhanDateParam(isoDate)}ByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
  const response = await fetch(url);
  const json: AladhanResponse = await response.json();
  if (json.code !== 200) throw new Error(`Aladhan API error: ${json.code}`);
  return timingsToPrayers(json.data.timings, isoDate);
}
