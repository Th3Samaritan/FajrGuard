import React from 'react';
import { View } from 'react-native';

export function IslamicPattern() {
  return (
    <View className="absolute inset-0 opacity-[0.03]" pointerEvents="none">
      <View className="flex-1 flex-row flex-wrap">
        {Array.from({ length: 80 }).map((_, i) => (
          <View
            key={i}
            className="w-1/5 aspect-square border border-[#C9A227] items-center justify-center"
            style={{ borderWidth: 0.5 }}
          >
            <View
              className="w-3/4 h-3/4 rotate-45 border border-[#C9A227]"
              style={{ borderWidth: 0.5 }}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
