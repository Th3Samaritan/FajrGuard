import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useStreak } from '../../hooks/useStreak';
import { StreakCalendar } from '../../components/StreakCalendar';
import { IslamicPattern } from '../../components/IslamicPattern';

export default function StreakScreen() {
  const { streakDays, longestStreak, prayerCalendar } = useStreak();

  return (
    <ScrollView className="flex-1 bg-[#050C16]" contentContainerStyle={{ paddingBottom: 30 }}>
      <IslamicPattern />
      <View className="pt-16 px-4 pb-6">
        <Text className="text-[#F0E6D3] text-3xl text-center" style={{ fontFamily: 'CormorantGaramond' }}>
          Your Streak
        </Text>
        <Text className="text-[rgba(240,230,211,0.4)] text-sm text-center mt-1">
          Every prayer counts
        </Text>
      </View>

      <StreakCalendar
        calendar={prayerCalendar}
        streakDays={streakDays}
        longestStreak={longestStreak}
      />

      <View className="px-4 mt-6">
        {streakDays >= 30 && (
          <View className="bg-[rgba(201,162,39,0.1)] border border-[rgba(201,162,39,0.3)] rounded-xl p-4 items-center">
            <Text className="text-[#F0D060] text-lg" style={{ fontFamily: 'CormorantGaramond' }}>
              Amazing! 30+ day streak
            </Text>
            <Text className="text-[rgba(240,230,211,0.5)] text-sm text-center mt-1">
              You've been consistent for a month. May Allah accept your prayers.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
