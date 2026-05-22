import React, { useState } from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { Link } from 'expo-router';
import { IslamicPattern } from '../../components/IslamicPattern';

const { width } = Dimensions.get('window');

const CARDS = [
  {
    title: 'Never Miss Fajr Again',
    arabic: 'الصلاة خير من النوم',
    desc: 'FajrGuard wakes you for all 5 daily prayers with an escalating alarm that grows until you respond.',
  },
  {
    title: 'Wudu Verification',
    arabic: 'الطهور شطر الإيمان',
    desc: 'The only way to stop the alarm is to perform wudu (ablution). Our on-device AI verifies moisture on your face.',
  },
  {
    title: '100% Private',
    arabic: 'لا تخزين للبيانات',
    desc: 'All face analysis happens on your device. No images, no videos, no biometric data ever leaves your phone.',
  },
];

export default function OnboardingScreen() {
  const [page, setPage] = useState(0);

  return (
    <View className="flex-1 bg-[#050C16]">
      <IslamicPattern />
      <View className="flex-1 items-center justify-center px-6 pt-20">
        <Text className="text-[#C9A227] text-3xl mb-4" style={{ fontFamily: 'NotoNaskhArabic' }}>
          {CARDS[page].arabic}
        </Text>
        <Text className="text-[#F0E6D3] text-2xl text-center mb-4" style={{ fontFamily: 'CormorantGaramond' }}>
          {CARDS[page].title}
        </Text>
        <Text className="text-[rgba(240,230,211,0.6)] text-base text-center leading-6">
          {CARDS[page].desc}
        </Text>
      </View>

      <View className="flex-row justify-center gap-2 mb-4">
        {CARDS.map((_, i) => (
          <View
            key={i}
            className={`w-2 h-2 rounded-full ${i === page ? 'bg-[#C9A227] w-6' : 'bg-[rgba(255,255,255,0.2)]'}`}
          />
        ))}
      </View>

      <View className="px-8 pb-12 gap-3">
        {page < CARDS.length - 1 ? (
          <View
            className="bg-[#C9A227] py-4 rounded-xl items-center active:opacity-80"
            onTouchEnd={() => setPage(page + 1)}
          >
            <Text className="text-[#050C16] text-lg font-bold">Next</Text>
          </View>
        ) : (
          <Link href="/(auth)/register" asChild>
            <View className="bg-[#2DD4BF] py-4 rounded-xl items-center active:opacity-80">
              <Text className="text-[#050C16] text-lg font-bold">Begin Setup</Text>
            </View>
          </Link>
        )}
      </View>
    </View>
  );
}
