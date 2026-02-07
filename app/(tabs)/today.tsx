// app/(tabs)/today.tsx
import { useLocalSearchParams } from 'expo-router';
import UnifiedLogScreen from '@/components/logging/UnifiedLogScreen';

type Mode = 'moment' | 'daily';

export default function TodayTab() {
  const params = useLocalSearchParams<{ mode?: string }>();

  const initialMode: Mode = params.mode === 'moment' ? 'moment' : 'daily';

  // key forces a clean remount when mode changes via navigation
  return <UnifiedLogScreen key={initialMode} initialMode={initialMode} showHeader={false} />;
}