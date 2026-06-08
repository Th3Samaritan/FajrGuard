import { useEffect, useRef, useCallback } from 'react';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
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
  const playerRef = useRef<AudioPlayer | null>(null);
  const escalationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isAlarming, currentPrayer, escalationLevel, wuduVerified } = useAlarmStore();
  const { setEscalationLevel } = useAlarmStore();
  const { wuduThreshold } = useUserStore();

  const stopAudio = useCallback(async () => {
    if (escalationTimer.current) {
      clearInterval(escalationTimer.current);
      escalationTimer.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.remove();
      } catch {}
      playerRef.current = null;
    }
  }, []);

  const startEscalation = useCallback(async () => {
    await stopAudio();

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'duckOthers',
      });
    } catch (err) {
      console.warn('[useAlarmEngine] setAudioModeAsync failed:', err);
    }

    try {
      const audioSource = currentPrayer === 'fajr'
        ? require('../assets/audio/adhan_fajr.wav')
        : require('../assets/audio/adhan.wav');

      const player = createAudioPlayer(audioSource);
      player.loop = true;
      player.volume = 0.4;
      player.play();
      playerRef.current = player;

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
        if (playerRef.current) {
          try { playerRef.current.volume = config.volumeMultiplier; } catch {}
        }
      }, 1000);
    } catch (err) {
      console.warn('[useAlarmEngine] failed to start alarm audio:', err);
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
    } else {
      stopAudio();
    }
    return () => {
      stopAudio();
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
