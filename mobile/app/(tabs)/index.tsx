import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { usePrayerTimes } from '../../hooks/usePrayerTimes';
import { usePrayerStore } from '../../store/prayerStore';
import { CountdownTimer } from '../../components/CountdownTimer';
import { PrayerCard } from '../../components/PrayerCard';
import { IslamicPattern } from '../../components/IslamicPattern';
import { PRAYER_ARABIC } from '../../constants/prayers';

export default function DashboardScreen() {
  const { prayerTimes, getNextPrayer } = usePrayerTimes();
  const { completedPrayers, isCompleted } = usePrayerStore();
  const nextPrayer = getNextPrayer();

  return (
    <ScrollView className="flex-1 bg-[#050C16]" contentContainerStyle={{ paddingBottom: 20 }}>
      <IslamicPattern />

      <View className="pt-16 px-4 pb-6">
        <Text className="text-[#F0E6D3] text-3xl text-center" style={{ fontFamily: 'CormorantGaramond' }}>
          FajrGuard
        </Text>
        <Text className="text-[rgba(240,230,211,0.3)] text-sm text-center mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
      </View>

      {nextPrayer && (
        <CountdownTimer
          targetTimestamp={nextPrayer.timestamp}
          prayerName={nextPrayer.prayerId.charAt(0).toUpperCase() + nextPrayer.prayerId.slice(1)}
          arabicName={PRAYER_ARABIC[nextPrayer.prayerId]}
        />
      )}

      <View className="px-4 mt-4">
        <Text className="text-[rgba(240,230,211,0.5)] text-sm mb-3 ml-1">Today's Prayers</Text>
        {prayerTimes.map((pt) => (
          <PrayerCard
            key={pt.prayerId}
            prayerId={pt.prayerId}
            time={pt.time}
            isCompleted={isCompleted(pt.prayerId)}
            isNext={nextPrayer?.prayerId === pt.prayerId}
          />
        ))}
        {prayerTimes.length === 0 && (
          <Text className="text-[rgba(240,230,211,0.4)] text-center mt-8">
            Loading prayer times...
          </Text>
        )}
      </View>
    </ScrollView>
  );
}
