import { db } from '../db';
import { prayers, settings, streakLog } from '../db/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export interface PrayerLog {
  prayerId: string;
  scheduledAt: number;
  completedAt?: number;
  alarmDuration?: number;
  wuduConfidence?: number;
  skipped?: number;
}

export async function logPrayer(data: PrayerLog): Promise<void> {
  await db.insert(prayers).values({
    prayerId: data.prayerId,
    scheduledAt: data.scheduledAt,
    completedAt: data.completedAt ?? null,
    alarmDuration: data.alarmDuration ?? null,
    wuduConfidence: data.wuduConfidence ?? null,
    skipped: data.skipped ?? 0,
    createdAt: Date.now(),
  });
}

export async function getTodaysPrayers(date: string): Promise<typeof prayers.$inferSelect[]> {
  const start = new Date(date).getTime();
  const end = start + 86400000;
  return db.select().from(prayers)
    .where(and(gte(prayers.scheduledAt, start), lte(prayers.scheduledAt, end)))
    .orderBy(prayers.scheduledAt);
}

export async function getStreakData(limit = 365): Promise<typeof streakLog.$inferSelect[]> {
  return db.select().from(streakLog)
    .orderBy(desc(streakLog.date))
    .limit(limit);
}

export async function getSetting(key: string): Promise<string | null> {
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.insert(settings).values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function updateStreakLog(
  date: string, completedCount: number, streakDay: number
): Promise<void> {
  await db.insert(streakLog).values({
    date, completedCount, totalCount: 5, streakDay,
  }).onConflictDoUpdate({
    target: streakLog.date,
    set: { completedCount, streakDay },
  });
}
