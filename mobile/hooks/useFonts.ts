import { useFonts } from 'expo-font';

export function useFajrGuardFonts() {
  const [loaded, error] = useFonts({
    CormorantGaramond: require('../assets/fonts/CormorantGaramond-Regular.ttf'),
    NotoNaskhArabic: require('../assets/fonts/NotoNaskhArabic-Regular.ttf'),
    JetBrainsMono: require('../assets/fonts/JetBrainsMono-Regular.ttf'),
  });

  return { fontsLoaded: loaded, fontError: error };
}
