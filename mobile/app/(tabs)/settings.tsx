import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, Modal, Pressable } from 'react-native';
import { useUserStore } from '../../store/userStore';
import { clearFaceEmbedding } from '../../services/faceEmbedding';
import { IslamicPattern } from '../../components/IslamicPattern';

const CALCULATION_METHODS = [
  { value: 0, label: 'Shia Ithna-Ansari' },
  { value: 1, label: 'University of Islamic Sciences, Karachi' },
  { value: 2, label: 'ISNA (Islamic Society of North America)' },
  { value: 3, label: 'MWL (Muslim World League)' },
  { value: 4, label: 'Umm Al-Qura, Makkah' },
  { value: 5, label: 'Egyptian General Authority' },
  { value: 7, label: 'Institute of Geophysics, Tehran' },
  { value: 8, label: 'Gulf Region' },
];

const LEAD_TIME_OPTIONS = [5, 10, 15, 20, 30];

function getMethodLabel(value: number): string {
  const method = CALCULATION_METHODS.find((m) => m.value === value);
  return method ? method.label : 'ISNA';
}

export default function SettingsScreen() {
  const {
    wuduThreshold, setWuduThreshold,
    calculationMethod, setCalculationMethod,
    cityOverride, setCityOverride,
    alarmLeadMinutes, setAlarmLeadMinutes,
    isRegistered, reset,
  } = useUserStore();

  const [showMethodPicker, setShowMethodPicker] = useState(false);
  const [showLeadPicker, setShowLeadPicker] = useState(false);

  const handleReenroll = async () => {
    await clearFaceEmbedding();
    reset();
    Alert.alert('Face Data Cleared', 'Your face enrollment has been removed.');
  };

  const handleThresholdChange = (dir: number) => {
    const newVal = Math.round((wuduThreshold + dir * 0.05) * 100) / 100;
    setWuduThreshold(Math.max(0.70, Math.min(0.95, newVal)));
  };

  return (
    <ScrollView className="flex-1 bg-[#050C16]" contentContainerStyle={{ paddingBottom: 30 }}>
      <IslamicPattern />
      <View className="pt-16 px-4 pb-6">
        <Text className="text-[#F0E6D3] text-3xl text-center" style={{ fontFamily: 'CormorantGaramond' }}>
          Settings
        </Text>
      </View>

      <View className="px-4 gap-3">
        <View className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.06)]">
          <Text className="text-[#F0E6D3] text-base mb-2" style={{ fontFamily: 'CormorantGaramond' }}>
            Wudu Sensitivity
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="bg-[rgba(255,255,255,0.06)] px-3 py-1 rounded-lg active:opacity-60" onTouchEnd={() => handleThresholdChange(-1)}>
              <Text className="text-[#F0E6D3]">-</Text>
            </View>
            <Text className="text-[#C9A227] text-lg" style={{ fontFamily: 'JetBrainsMono' }}>
              {wuduThreshold.toFixed(2)}
            </Text>
            <View className="bg-[rgba(255,255,255,0.06)] px-3 py-1 rounded-lg active:opacity-60" onTouchEnd={() => handleThresholdChange(1)}>
              <Text className="text-[#F0E6D3]">+</Text>
            </View>
          </View>
          <Text className="text-[rgba(240,230,211,0.3)] text-xs mt-2">
            Higher = stricter detection (0.70 - 0.95)
          </Text>
        </View>

        <View className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.06)]">
          <Text className="text-[#F0E6D3] text-base mb-2" style={{ fontFamily: 'CormorantGaramond' }}>
            Calculation Method
          </Text>
          <Pressable
            className="bg-[rgba(255,255,255,0.06)] rounded-lg p-3 active:opacity-60"
            onPress={() => setShowMethodPicker(true)}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-[rgba(240,230,211,0.4)] text-sm flex-1">
                {getMethodLabel(calculationMethod)}
              </Text>
              <Text className="text-[#C9A227] text-sm">Change</Text>
            </View>
          </Pressable>
        </View>

        <View className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.06)]">
          <Text className="text-[#F0E6D3] text-base mb-2" style={{ fontFamily: 'CormorantGaramond' }}>
            Notification Lead Time
          </Text>
          <Pressable
            className="bg-[rgba(255,255,255,0.06)] rounded-lg p-3 active:opacity-60"
            onPress={() => setShowLeadPicker(true)}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-[rgba(240,230,211,0.4)] text-sm">
                {alarmLeadMinutes} minutes before prayer
              </Text>
              <Text className="text-[#C9A227] text-sm">Change</Text>
            </View>
          </Pressable>
        </View>

        <View className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.06)]">
          <Text className="text-[#F0E6D3] text-base mb-2" style={{ fontFamily: 'CormorantGaramond' }}>
            City Override
          </Text>
          <Pressable
            className="bg-[rgba(255,255,255,0.06)] rounded-lg p-3 active:opacity-60"
            onPress={() => {
              Alert.prompt
                ? Alert.prompt(
                    'City Override',
                    'Enter city, country (e.g. "London, UK")',
                    (text) => setCityOverride(text || null),
                    'plain-text',
                    cityOverride || ''
                  )
                : Alert.alert(
                    'City Override',
                    'Set via edit button. Current: ' + (cityOverride || 'None (GPS)')
                  );
            }}
          >
            <View className="flex-row justify-between items-center">
              <Text className="text-[rgba(240,230,211,0.4)] text-sm">
                {cityOverride || 'Use GPS location'}
              </Text>
              <Text className="text-[#C9A227] text-sm">
                {cityOverride ? 'Clear' : 'Edit'}
              </Text>
            </View>
          </Pressable>
          {cityOverride && (
            <View
              className="mt-2 active:opacity-60"
              onTouchEnd={() => setCityOverride(null)}
            >
              <Text className="text-[rgba(239,68,68,0.6)] text-xs text-center">
                Tap to clear override
              </Text>
            </View>
          )}
        </View>

        {isRegistered && (
          <View
            className="bg-[rgba(239,68,68,0.1)] rounded-xl p-4 border border-[rgba(239,68,68,0.3)] active:opacity-80"
            onTouchEnd={handleReenroll}
          >
            <Text className="text-[#EF4444] text-base text-center" style={{ fontFamily: 'CormorantGaramond' }}>
              Clear Face Data
            </Text>
            <Text className="text-[rgba(239,68,68,0.6)] text-xs text-center mt-1">
              Removes stored face embedding. You must re-enroll to use wudu verification.
            </Text>
          </View>
        )}
      </View>

      <Modal visible={showMethodPicker} transparent animationType="fade">
        <View className="flex-1 bg-[rgba(0,0,0,0.7)] justify-center items-center px-6">
          <View className="bg-[#0C1A2E] rounded-xl w-full max-h-96 border border-[rgba(201,162,39,0.18)]">
            <Text className="text-[#F0E6D3] text-lg text-center py-4 border-b border-[rgba(255,255,255,0.06)]" style={{ fontFamily: 'CormorantGaramond' }}>
              Calculation Method
            </Text>
            <ScrollView>
              {CALCULATION_METHODS.map((method) => (
                <Pressable
                  key={method.value}
                  className={`px-4 py-3 border-b border-[rgba(255,255,255,0.03)] active:opacity-60 ${
                    calculationMethod === method.value ? 'bg-[rgba(201,162,39,0.15)]' : ''
                  }`}
                  onPress={() => {
                    setCalculationMethod(method.value);
                    setShowMethodPicker(false);
                  }}
                >
                  <Text
                    className={`text-sm ${
                      calculationMethod === method.value ? 'text-[#C9A227]' : 'text-[rgba(240,230,211,0.7)]'
                    }`}
                  >
                    {method.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              className="py-3 border-t border-[rgba(255,255,255,0.06)] active:opacity-60"
              onPress={() => setShowMethodPicker(false)}
            >
              <Text className="text-[rgba(240,230,211,0.5)] text-center text-sm">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showLeadPicker} transparent animationType="fade">
        <View className="flex-1 bg-[rgba(0,0,0,0.7)] justify-center items-center px-6">
          <View className="bg-[#0C1A2E] rounded-xl w-full border border-[rgba(201,162,39,0.18)]">
            <Text className="text-[#F0E6D3] text-lg text-center py-4 border-b border-[rgba(255,255,255,0.06)]" style={{ fontFamily: 'CormorantGaramond' }}>
              Notification Lead Time
            </Text>
            {LEAD_TIME_OPTIONS.map((minutes) => (
              <Pressable
                key={minutes}
                className={`px-4 py-3 border-b border-[rgba(255,255,255,0.03)] active:opacity-60 ${
                  alarmLeadMinutes === minutes ? 'bg-[rgba(201,162,39,0.15)]' : ''
                }`}
                onPress={() => {
                  setAlarmLeadMinutes(minutes);
                  setShowLeadPicker(false);
                }}
              >
                <Text
                  className={`text-sm ${
                    alarmLeadMinutes === minutes ? 'text-[#C9A227]' : 'text-[rgba(240,230,211,0.7)]'
                  }`}
                >
                  {minutes} minutes before prayer
                </Text>
              </Pressable>
            ))}
            <Pressable
              className="py-3 border-t border-[rgba(255,255,255,0.06)] active:opacity-60"
              onPress={() => setShowLeadPicker(false)}
            >
              <Text className="text-[rgba(240,230,211,0.5)] text-center text-sm">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
