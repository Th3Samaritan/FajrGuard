import React from 'react';
import { View, Text } from 'react-native';

interface StreakCalendarProps {
  calendar: Record<string, number>;
  streakDays: number;
  longestStreak: number;
}

export function StreakCalendar({ calendar, streakDays, longestStreak }: StreakCalendarProps) {
  const today = new Date();
  const days: { date: string; count: number }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({ date: dateStr, count: calendar[dateStr] || 0 });
  }

  const getColor = (count: number): string => {
    if (count >= 5) return '#22C55E';
    if (count >= 3) return '#C9A227';
    if (count >= 1) return 'rgba(201,162,39,0.4)';
    return 'rgba(255,255,255,0.06)';
  };

  return (
    <View className="px-4 py-3">
      <View className="flex-row justify-between mb-4">
        <View className="items-center">
          <Text className="text-[#F0D060] text-3xl" style={{ fontFamily: 'CormorantGaramond' }}>
            {streakDays}
          </Text>
          <Text className="text-[rgba(240,230,211,0.4)] text-xs">Current Streak</Text>
        </View>
        <View className="items-center">
          <Text className="text-[#F0E6D3] text-3xl" style={{ fontFamily: 'CormorantGaramond' }}>
            {longestStreak}
          </Text>
          <Text className="text-[rgba(240,230,211,0.4)] text-xs">Longest Streak</Text>
        </View>
      </View>
      <View className="flex-row flex-wrap justify-center gap-1.5">
        {days.map((day) => (
          <View
            key={day.date}
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: getColor(day.count) }}
          >
            {day.count > 0 && (
              <Text className="text-[10px] text-white font-bold">{day.count}</Text>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}
