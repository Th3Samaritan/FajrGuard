import React from 'react';
import { View, Text } from 'react-native';

interface WuduCameraProps {
  confidence: number;
  stage: 'identity' | 'wetness' | 'done';
  modelState?: 'loading' | 'ready' | 'fallback';
  lowLight?: boolean;
}

function getStatusMessage(confidence: number, stage: string, modelState?: string, lowLight?: boolean): string {
  if (modelState === 'loading') return 'Loading AI model\u2026';
  if (lowLight && stage === 'wetness') return 'Too dark \u2014 please turn on the light';
  if (stage === 'identity') {
    if (confidence >= 0.8) return 'Identity confirmed \u2014 proceed to wudu';
    return 'Verifying your identity\u2026';
  }
  if (confidence >= 1.0) return '\u2705 Wudu Confirmed \u2014 Allahu Akbar!';
  if (confidence >= 0.80) return 'Almost there\u2026';
  if (confidence >= 0.50) return 'Moisture confirmed \u2014 hold still';
  if (confidence >= 0.20) return 'Detecting moisture on skin\u2026';
  return 'Wet your face, then look into the camera';
}

function getGuideColor(confidence: number, stage: string): string {
  if (stage === 'identity') {
    return confidence >= 0.6 ? '#C9A227' : 'rgba(255,255,255,0.3)';
  }
  if (confidence >= 0.82) return '#22C55E';
  if (confidence >= 0.40) return '#C9A227';
  return 'rgba(255,255,255,0.3)';
}

export function WuduCamera({ confidence, stage, modelState, lowLight }: WuduCameraProps) {
  const barColor = getGuideColor(confidence, stage);
  const message = getStatusMessage(confidence, stage, modelState, lowLight);
  const progress = Math.min(Math.max(confidence * 100, 0), 100);

  return (
    <View className="flex-1">
      <View className="absolute inset-0 items-center justify-center">
        <View
          className="w-64 h-80 rounded-full border-2"
          style={{ borderColor: barColor }}
        />
      </View>

      <View className="absolute bottom-32 left-0 right-0 items-center px-4">
        <Text className="text-white text-base text-center mb-3">
          {message}
        </Text>

        <View className="w-full h-3 bg-[rgba(255,255,255,0.1)] rounded-full overflow-hidden">
          <View
            className="h-full rounded-full"
            style={{ width: `${progress}%`, backgroundColor: barColor }}
          />
        </View>
        <Text className="text-[rgba(255,255,255,0.6)] text-xs mt-1">
          {progress.toFixed(0)}% {stage === 'identity' ? 'Identity' : 'Wudu Confidence'}
        </Text>
      </View>

      <View className="absolute top-4 right-4">
        <Text className="text-[rgba(255,255,255,0.4)] text-xs">
          {stage === 'identity'
            ? 'Stage 1/2: Identity Check'
            : stage === 'wetness'
            ? 'Stage 2/2: Wudu Detection'
            : 'Verified'}
        </Text>
      </View>

      <View className="absolute top-4 left-0 right-0 items-center">
        <View className="flex-row gap-2">
          <View
            className={`w-2 h-2 rounded-full ${
              stage === 'identity' || stage === 'wetness' || stage === 'done'
                ? 'bg-[#C9A227]'
                : 'bg-[rgba(255,255,255,0.2)]'
            }`}
          />
          <View
            className={`w-6 h-2 rounded-full ${
              stage === 'wetness' || stage === 'done'
                ? 'bg-[#C9A227]'
                : 'bg-[rgba(255,255,255,0.2)]'
            }`}
          />
        </View>
      </View>
    </View>
  );
}
