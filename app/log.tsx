// app/log.tsx
import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import UnifiedLogScreen from '@/components/logging/UnifiedLogScreen';

type Mode = 'moment' | 'daily';

export default function LogRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const mode = useMemo<Mode>(() => {
    const m = (params.mode as string) || 'moment';
    return m === 'daily' ? 'daily' : 'moment';
  }, [params.mode]);

  return (
    <UnifiedLogScreen
      initialMode={mode}
      onClose={() => router.back()}
      onDone={() => router.push('/(tabs)/dashboard')}
    />
  );
}