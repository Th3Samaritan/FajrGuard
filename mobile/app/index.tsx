import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';

export default function IndexScreen() {
  const isRegistered = useUserStore((s) => s.isRegistered);
  if (isRegistered) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/(auth)/onboarding" />;
}
