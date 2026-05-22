import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useWuduDetector } from '../hooks/useWuduDetector';
import { useFaceVerification } from '../hooks/useFaceVerification';
import { useAlarmStore } from '../store/alarmStore';
import { logPrayer } from '../services/storage';
import { extractFaceNetEmbedding } from '../services/faceNetModel';
import { WuduCamera } from '../components/WuduCamera';

export default function VerifyScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { confidence, processFrame, reset, modelState } = useWuduDetector();
  const { init, verify, reset: resetFace } = useFaceVerification();
  const { setWuduVerified, currentPrayer } = useAlarmStore();
  const [stage, setStage] = useState<'identity' | 'wetness' | 'done'>('identity');
  const [identityProgress, setIdentityProgress] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const identityFrameCount = useRef(0);

  useEffect(() => {
    init();
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission, init]);

  const processSnapshot = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.3,
        skipProcessing: true,
      });

      if (!photo?.base64) return;

      const binary = atob(photo.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      if (stage === 'identity') {
        const embedding = await extractFaceNetEmbedding(bytes, photo.width, photo.height);
        const matched = await verify(embedding);
        identityFrameCount.current++;
        setIdentityProgress(Math.min(1, identityFrameCount.current / 5));

        if (matched || identityFrameCount.current >= 10) {
          setStage('wetness');
        }
        return;
      }

      const result = processFrame(bytes, photo.width, photo.height);

      if (result.stage === 'done') {
        setStage('done');
        setWuduVerified(true);

        if (currentPrayer) {
          logPrayer({
            prayerId: currentPrayer,
            scheduledAt: Date.now() - 60000,
            completedAt: Date.now(),
            wuduConfidence: result.confidence,
          }).catch(console.warn);
        }
      }
    } catch (e) {
      // silently skip failed captures
    }
  }, [processFrame, setWuduVerified, currentPrayer, stage, verify]);

  useEffect(() => {
    intervalRef.current = setInterval(processSnapshot, 200);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [processSnapshot]);

  useEffect(() => {
    if (stage === 'done') {
      const timeout = setTimeout(() => {
        reset();
        resetFace();
        router.back();
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [stage, router, reset, resetFace]);

  const handleBack = useCallback(() => {
    reset();
    resetFace();
    if (intervalRef.current) clearInterval(intervalRef.current);
    router.back();
  }, [reset, resetFace, router]);

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing="front"
          mode="picture"
        />
      ) : (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-white text-base">Camera permission required</Text>
        </View>
      )}

      <WuduCamera
        confidence={stage === 'wetness' || stage === 'done' ? confidence : identityProgress}
        stage={stage}
        modelState={modelState}
      />

      <View
        className="absolute top-12 left-4 bg-[rgba(0,0,0,0.4)] px-4 py-2 rounded-full active:opacity-60 z-10"
        onTouchEnd={handleBack}
      >
        <Text className="text-white text-sm">Back</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
