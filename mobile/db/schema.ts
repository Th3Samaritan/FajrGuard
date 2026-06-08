import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const prayers = sqliteTable('prayers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prayerId: text('prayer_id').notNull(),
  scheduledAt: integer('scheduled_at').notNull(),
  completedAt: integer('completed_at'),
  alarmDuration: integer('alarm_duration'),
  wuduConfidence: real('wudu_confidence'),
  skipped: integer('skipped').default(0),
  createdAt: integer('created_at').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const streakLog = sqliteTable('streak_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull(),
  completedCount: integer('completed_count').notNull().default(0),
  totalCount: integer('total_count').notNull().default(5),
  streakDay: integer('streak_day').default(0),
}, (table) => ({
  dateUnique: uniqueIndex('streak_log_date_unique').on(table.date),
}));
