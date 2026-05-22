import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../constants/theme';
import { PRAYER_ARABIC } from '../constants/prayers';

interface PrayerCardProps {
  prayerId: string;
  time: string;
  isCompleted: boolean;
  isNext: boolean;
  countdown?: string;
}

export function PrayerCard({ prayerId, time, isCompleted, isNext, countdown }: PrayerCardProps) {
  const arabicName = PRAYER_ARABIC[prayerId] || prayerId;
  const displayName = prayerId.charAt(0).toUpperCase() + prayerId.slice(1);

  return (
    <View className={`flex-row items-center justify-between px-4 py-3 rounded-xl mb-2 border ${
      isNext ? 'border-[#C9A227]' : 'border-[rgba(201,162,39,0.12)]'
    } ${isCompleted ? 'opacity-40' : 'opacity-100'}`}
    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
    >
      <View className="flex-row items-center gap-3">
        <View className={`w-3 h-3 rounded-full ${
          isCompleted ? 'bg-[#22C55E]' : isNext ? 'bg-[#C9A227]' : 'bg-[rgba(255,255,255,0.1)]'
        }`} />
        <View>
          <Text className="text-[#F0E6D3] text-base" style={{ fontFamily: 'CormorantGaramond' }}>
            {displayName}
          </Text>
          <Text className="text-[rgba(240,230,211,0.4)] text-xs">
            {arabicName}
          </Text>
        </View>
      </View>
      <View className="items-end">
        <Text className="text-[#F0E6D3] text-lg" style={{ fontFamily: 'JetBrainsMono' }}>
          {time}
        </Text>
        {countdown && isNext && (
          <Text className="text-[#C9A227] text-xs" style={{ fontFamily: 'JetBrainsMono' }}>
            {countdown}
          </Text>
        )}
      </View>
    </View>
  );
}
