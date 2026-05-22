import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors } from '../constants/theme';
import { PRAYER_ARABIC, PRAYER_NAMES } from '../constants/prayers';

interface AlarmOverlayProps {
  prayerId: string;
  escalationLevel: number;
  onWuduPress: () => void;
}

const HADITH_MESSAGES = [
  "The most burdensome prayers for the hypocrites are Isha and Fajr.",
  "Prayer is better than sleep - الصلاة خير من النوم",
  "Whoever prays Fajr is under the protection of Allah.",
  "The two sunnah rak'ahs of Fajr are better than the world and all it contains.",
  "Establish prayer at the decline of the sun until the darkness of the night.",
];

export function AlarmOverlay({ prayerId, escalationLevel, onWuduPress }: AlarmOverlayProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hadithIndex = useRef(0);

  useEffect(() => {
    const speed = Math.max(400, 1500 - escalationLevel * 300);
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: speed / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: speed / 2,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [escalationLevel, pulseAnim]);

  useEffect(() => {
    const id = setInterval(() => {
      hadithIndex.current = (hadithIndex.current + 1) % HADITH_MESSAGES.length;
    }, 20000);
    return () => clearInterval(id);
  }, []);

  const bgColor = escalationLevel >= 3 ? '#EF4444' : escalationLevel >= 2 ? '#C9A227' : '#050C16';
  const scale = 1 + escalationLevel * 0.03;

  return (
    <Animated.View
      className="absolute inset-0 items-center justify-center z-50"
      style={[styles.container, { backgroundColor: bgColor, transform: [{ scale: pulseAnim }] }] as any}
    >
      <Text className="text-white text-2xl mb-2" style={{ fontFamily: 'NotoNaskhArabic' }}>
        {PRAYER_ARABIC[prayerId]}
      </Text>
      <Text className="text-white text-4xl mb-6" style={{ fontFamily: 'CormorantGaramond' }}>
        {PRAYER_NAMES[prayerId]} Prayer
      </Text>
      <Text className="text-[rgba(255,255,255,0.6)] text-sm text-center px-8 mb-8">
        {HADITH_MESSAGES[hadithIndex.current]}
      </Text>
      <View
        className="bg-[#2DD4BF] px-10 py-4 rounded-full active:opacity-80"
        onTouchEnd={onWuduPress}
      >
        <Text className="text-[#050C16] text-lg font-bold">
          I've Made Wudu
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
