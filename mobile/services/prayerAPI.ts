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

export async function fetchPrayerTimes(
  lat: number, lng: number, date?: string, method = 2
): Promise<PrayerTime[]> {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const url = `${BASE_URL}/${dateStr}?latitude=${lat}&longitude=${lng}&method=${method}`;
  
  const response = await fetch(url);
  const json: AladhanResponse = await response.json();
  
  if (json.code !== 200) {
    throw new Error(`Aladhan API error: ${json.code}`);
  }

  const timings = json.data.timings;
  const prayerMap: Record<string, string> = {
    Fajr: 'fajr', Dhuhr: 'dhuhr', Asr: 'asr', Maghrib: 'maghrib', Isha: 'isha',
  };

  const results: PrayerTime[] = [];
  for (const [name, time] of Object.entries(timings)) {
    const prayerId = prayerMap[name];
    if (!prayerId) continue;
    const [h, m] = time.split(':').map(Number);
    const timestamp = new Date(`${dateStr}T${time}:00`).getTime();
    results.push({ prayerId, time, timestamp });
  }

  return results.sort((a, b) => a.timestamp - b.timestamp);
}

export async function fetchPrayerTimesByCity(
  city: string, country: string, date?: string, method = 2
): Promise<PrayerTime[]> {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const url = `${BASE_URL}/${dateStr}ByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}`;
  
  const response = await fetch(url);
  const json: AladhanResponse = await response.json();
  
  if (json.code !== 200) {
    throw new Error(`Aladhan API error: ${json.code}`);
  }

  const timings = json.data.timings;
  const prayerMap: Record<string, string> = {
    Fajr: 'fajr', Dhuhr: 'dhuhr', Asr: 'asr', Maghrib: 'maghrib', Isha: 'isha',
  };

  const results: PrayerTime[] = [];
  for (const [name, time] of Object.entries(timings)) {
    const prayerId = prayerMap[name];
    if (!prayerId) continue;
    const timestamp = new Date(`${dateStr}T${time}:00`).getTime();
    results.push({ prayerId, time, timestamp });
  }

  return results.sort((a, b) => a.timestamp - b.timestamp);
}
