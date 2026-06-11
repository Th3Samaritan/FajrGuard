import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Brightness from 'expo-brightness';
import { useWuduDetector } from '../hooks/useWuduDetector';
import { useFaceVerification } from '../hooks/useFaceVerification';
import { useAlarmStore } from '../store/alarmStore';
import { useUserStore } from '../store/userStore';
import { usePrayerStore } from '../store/prayerStore';
import { logPrayer } from '../services/storage';
import { extractFaceNetEmbedding } from '../services/faceNetModel';
import { detectFaces, getLastFaceBounds } from '../services/faceDetector';
import { loadFacePacket } from '../services/faceEmbedding';
import { WuduCamera } from '../components/WuduCamera';

export default function VerifyScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const wuduThreshold = useUserStore((s) => s.wuduThreshold);
  const { confidence, processFrame, setFaceBounds, setDryBaseline, reset, modelState, lowLight } = useWuduDetector(wuduThreshold);
  const { init, verify, reset: resetFace } = useFaceVerification();
  const { setWuduVerified, currentPrayer } = useAlarmStore();
  const [stage, setStage] = useState<'identity' | 'wetness' | 'done'>('identity');
  const [identityProgress, setIdentityProgress] = useState(0);
  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inflightRef = useRef(false);
  const identityFrameCount = useRef(0);
  const identityMatchCount = useRef(0);

  useEffect(() => {
    init();
    loadFacePacket().then((packet) => setDryBaseline(packet?.dryBaseline));
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission, init, setDryBaseline]);

  // Screen flash: max brightness while verifying so the white surround
  // illuminates the face in a dark bathroom; restored on exit.
  useEffect(() => {
    let previous: number | null = null;
    (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      } catch {}
    })();
    return () => {
      if (previous !== null) {
        Brightness.setBrightnessAsync(previous).catch(() => {});
      }
    };
  }, []);

  const processSnapshot = useCallback(async () => {
    if (!cameraRef.current || inflightRef.current) return;
    inflightRef.current = true;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      });
      if (!photo?.uri) return;

      if (stage === 'identity') {
        const faceBounds = await detectFaces(photo.uri);
        if (!faceBounds) return;

        const embedding = await extractFaceNetEmbedding(photo.uri, photo.width, photo.height, faceBounds);
        if (!embedding) return;

        const matched = await verify(embedding);
        identityFrameCount.current++;
        setIdentityProgress(Math.min(1, identityFrameCount.current / 5));

        if (matched) {
          identityMatchCount.current++;
        } else {
          identityMatchCount.current = Math.max(0, identityMatchCount.current - 1);
        }

        if (identityMatchCount.current >= 3) {
          const wuduBounds = getLastFaceBounds();
          if (wuduBounds) setFaceBounds(wuduBounds);
          setStage('wetness');
        }
        return;
      }

      const faceBounds = await detectFaces(photo.uri);
      if (faceBounds) setFaceBounds(faceBounds);

      const result = await processFrame(photo.uri, photo.width, photo.height);

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
          usePrayerStore.getState().markCompleted(currentPrayer);
        }
      }
    } catch {
      // silently skip failed captures
    } finally {
      inflightRef.current = false;
    }
  }, [processFrame, setWuduVerified, currentPrayer, stage, verify, setFaceBounds]);

  useEffect(() => {
    intervalRef.current = setInterval(processSnapshot, 400);
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
          style={styles.cameraInset}
          facing="front"
          mode="picture"
        />
      ) : (
        <View className="absolute inset-0 items-center justify-center">
          <Text className="text-black text-base">Camera permission required</Text>
        </View>
      )}

      <WuduCamera
        confidence={stage === 'wetness' || stage === 'done' ? confidence : identityProgress}
        stage={stage}
        modelState={modelState}
        lowLight={lowLight}
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
    // white surround at max brightness doubles as a front flash
    backgroundColor: '#FFFFFF',
  },
  cameraInset: {
    position: 'absolute',
    top: '9%',
    left: '9%',
    right: '9%',
    bottom: '9%',
    borderRadius: 24,
    overflow: 'hidden',
  },
});
