import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useAlarmEngine } from '../hooks/useAlarmEngine';
import { AlarmOverlay } from '../components/AlarmOverlay';
import { useAlarmStore } from '../store/alarmStore';

export default function AlarmScreen() {
  const router = useRouter();
  useKeepAwake('fajrguard-alarm');
  const { isAlarming, currentPrayer, escalationLevel } = useAlarmEngine();

  useEffect(() => {
    if (!isAlarming) {
      router.back();
    }
  }, [isAlarming, router]);

  if (!isAlarming || !currentPrayer) {
    return null;
  }

  const handleWuduPress = () => {
    router.push('/verify');
  };

  return (
    <View style={styles.container}>
      <AlarmOverlay
        prayerId={currentPrayer}
        escalationLevel={escalationLevel}
        onWuduPress={handleWuduPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050C16',
  },
});
