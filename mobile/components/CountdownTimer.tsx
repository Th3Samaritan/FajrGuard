import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';

interface CountdownTimerProps {
  targetTimestamp: number;
  prayerName: string;
  arabicName: string;
}

export function CountdownTimer({ targetTimestamp, prayerName, arabicName }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = Math.max(0, targetTimestamp - Date.now());
      if (diff <= 0) {
        setRemaining('Now');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTimestamp]);

  return (
    <View className="items-center py-6">
      <Text className="text-[#F0E6D3] text-3xl mb-1" style={{ fontFamily: 'CormorantGaramond' }}>
        {prayerName}
      </Text>
      <Text className="text-[rgba(240,230,211,0.4)] text-lg mb-4">
        {arabicName}
      </Text>
      <Text className="text-[#C9A227] text-5xl mb-2" style={{ fontFamily: 'JetBrainsMono' }}>
        {remaining}
      </Text>
      <Text className="text-[rgba(240,230,211,0.3)] text-sm">
        until next prayer
      </Text>
    </View>
  );
}
