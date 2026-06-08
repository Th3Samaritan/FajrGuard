import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { saveFaceEmbedding, computePerUserThreshold } from '../../services/faceEmbedding';
import { extractFaceNetEmbedding } from '../../services/faceNetModel';
import { detectFaces } from '../../services/faceDetector';
import { useUserStore } from '../../store/userStore';

export default function RegisterScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  React.useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);

    const embeddings: number[][] = [];

    for (let i = 0; i < 3; i++) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });

      if (photo?.uri) {
        const faceBounds = await detectFaces(photo.uri);
        if (!faceBounds) {
          Alert.alert(
            'No Face Detected',
            'Please ensure your face is clearly visible and centered in the frame.'
          );
          setCapturing(false);
          return;
        }

        const embedding = await extractFaceNetEmbedding(photo.uri, photo.width, photo.height, faceBounds);
        if (!embedding) {
          Alert.alert(
            'Face Model Not Available',
            'The on-device face recognition model could not be loaded. Face verification will not work.'
          );
          setCapturing(false);
          return;
        }
        embeddings.push(embedding);
      }
    }

    const averagedEmbedding = embeddings[0].map((_, idx) => {
      const sum = embeddings.reduce((acc, emb) => acc + emb[idx], 0);
      return sum / embeddings.length;
    });

    const threshold = computePerUserThreshold(embeddings);
    console.log(`[register] per-user threshold computed: ${threshold.toFixed(3)}`);
    await saveFaceEmbedding(averagedEmbedding, threshold);
    useUserStore.getState().setRegistered(averagedEmbedding);

    setCaptured(true);
    setCapturing(false);

    Alert.alert(
      'Face Saved',
      'Your face has been enrolled. This data never leaves your device.',
      [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]
    );
  }, [capturing, router]);

  return (
    <View className="flex-1 bg-[#050C16]">
      {!captured && permission?.granted && (
        <CameraView
          ref={cameraRef}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          facing="front"
          mode="picture"
        />
      )}

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-72 h-72 rounded-full border-2 border-[#C9A227] items-center justify-center mb-8 relative">
          {!captured && (
            <View className="w-64 h-80 rounded-full border border-[rgba(201,162,39,0.3)] absolute" />
          )}
          <Text className="text-[rgba(240,230,211,0.4)] text-center px-4">
            {!permission?.granted
              ? 'Camera permission needed'
              : captured
              ? '\u2713 Face Enrolled'
              : 'Position your face within the oval'}
          </Text>
        </View>

        <Text className="text-[#F0E6D3] text-xl text-center mb-2" style={{ fontFamily: 'CormorantGaramond' }}>
          Face Enrollment
        </Text>
        <Text className="text-[rgba(240,230,211,0.5)] text-sm text-center mb-8 px-4">
          Your face embedding is stored ONLY on your device. We never send your biometric data anywhere.
        </Text>

        {capturing ? (
          <View className="py-4 px-10 rounded-xl items-center bg-[rgba(201,162,39,0.6)]">
            <Text className="text-[#050C16] text-lg font-bold">Processing...</Text>
          </View>
        ) : permission?.granted ? (
          <View
            className={`py-4 px-10 rounded-xl items-center active:opacity-80 ${captured ? 'bg-[#22C55E]' : 'bg-[#C9A227]'}`}
            onTouchEnd={captured ? undefined : handleCapture}
          >
            <Text className="text-[#050C16] text-lg font-bold">
              {captured ? 'Face Enrolled \u2713' : 'Capture Face'}
            </Text>
          </View>
        ) : (
          <View
            className="py-4 px-10 rounded-xl items-center active:opacity-80 bg-[#C9A227]"
            onTouchEnd={requestPermission}
          >
            <Text className="text-[#050C16] text-lg font-bold">Grant Camera Access</Text>
          </View>
        )}
      </View>
    </View>
  );
}
