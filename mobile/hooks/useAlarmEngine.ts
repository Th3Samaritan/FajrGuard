import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { useAlarmStore } from '../store/alarmStore';
import { useUserStore } from '../store/userStore';

const ESCALATION_SCHEDULE = [
  { seconds: 0,   volumeMultiplier: 0.4 },
  { seconds: 15,  volumeMultiplier: 0.65 },
  { seconds: 30,  volumeMultiplier: 0.85 },
  { seconds: 60,  volumeMultiplier: 1.0 },
  { seconds: 120, volumeMultiplier: 1.0 },
];

export function useAlarmEngine() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const escalationTimer = useRef<NodeJS.Timeout | null>(null);
  const { isAlarming, currentPrayer, escalationLevel, wuduVerified } = useAlarmStore();
  const { setEscalationLevel } = useAlarmStore();
  const { wuduThreshold } = useUserStore();

  const stopAudio = useCallback(async () => {
    if (escalationTimer.current) {
      clearInterval(escalationTimer.current);
      escalationTimer.current = null;
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {}
      soundRef.current = null;
    }
  }, []);

  const startEscalation = useCallback(async () => {
    await stopAudio();

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });
    } catch {}

    try {
      const audioFile = currentPrayer === 'fajr'
        ? require('../assets/audio/adhan_fajr.wav')
        : require('../assets/audio/adhan.wav');

      const { sound } = await Audio.Sound.createAsync(audioFile, {
        isLooping: true,
        volume: 0.4,
        shouldPlay: true,
      });
      soundRef.current = sound;

      const startTime = Date.now();
      escalationTimer.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        let level = 0;
        for (let i = ESCALATION_SCHEDULE.length - 1; i >= 0; i--) {
          if (elapsed >= ESCALATION_SCHEDULE[i].seconds) {
            level = i;
            break;
          }
        }
        setEscalationLevel(level);

        const config = ESCALATION_SCHEDULE[level];
        if (soundRef.current) {
          soundRef.current.setVolumeAsync(config.volumeMultiplier).catch(() => {});
        }
      }, 1000);
    } catch (err) {
      console.warn('Failed to start alarm audio:', err);
    }
  }, [currentPrayer, stopAudio, setEscalationLevel]);

  const stopAlarm = useCallback(async () => {
    await stopAudio();
    useAlarmStore.getState().stopAlarm();
  }, [stopAudio]);

  useEffect(() => {
    if (wuduVerified && isAlarming) {
      stopAlarm();
    }
  }, [wuduVerified, isAlarming, stopAlarm]);

  useEffect(() => {
    if (isAlarming) {
      startEscalation();
    }
    return () => {
      if (!isAlarming) {
        stopAudio();
      }
    };
  }, [isAlarming, startEscalation, stopAudio]);

  return {
    isAlarming,
    currentPrayer,
    escalationLevel,
    wuduThreshold,
    stopAlarm,
  };
}
