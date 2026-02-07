// app/(tabs)/history.tsx
import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';

function startOfWeek(d: Date) {
  // US-style week: Sunday start
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ✅ Smart date formatting:
// Today → Today
// Yesterday → Yesterday
// This week → Tuesday
// Older → Jan 21
// Different year → Jan 21, 2025
function formatDateSmart(dateStr: string): string {
  // dateStr is "YYYY-MM-DD" from DB
  const date = new Date(`${dateStr}T00:00:00`);
  const now = new Date();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Normalize `date` to midnight local too (for clean day comparisons)
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  if (isSameDay(d, today)) return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';

  // ✅ rolling "within last 7 days" (not calendar week)
  const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays >= 0 && diffDays < 7) {
    return d.toLocaleDateString('en-US', { weekday: 'long' }); // Tuesday
  }

  const sameYear = d.getFullYear() === today.getFullYear();

  if (sameYear) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // Jan 21
  }

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric', // Jan 21, 2025
  });
}

type CombinedCheckIn = {
  id: string;
  date: string;
  type: 'daily' | 'quick';
  overall_severity: number | null;
  timeIso: string; // ✅ unified sortable time
};

export default function HistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<CombinedCheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  const userId = user?.id;

  useFocusEffect(
    useCallback(() => {
      if (!userId) return () => {};

      let alive = true;

      (async () => {
        setLoading(true);
        try {
          const { data: dailyLogs, error: dErr } = await supabase
            .from('daily_logs')
            .select('id, date, overall_severity, created_at')
            .eq('user_id', userId)
            .order('date', { ascending: false });
          if (dErr) throw dErr;

          const { data: momentLogs, error: mErr } = await supabase
            .from('moment_logs')
            .select('id, date, overall_severity, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
          if (mErr) throw mErr;

          const combined: CombinedCheckIn[] = [
            ...(dailyLogs || []).map((log: any) => ({
              id: log.id,
              date: log.date,
              type: 'daily' as const,
              overall_severity: log.overall_severity ?? null,
              timeIso: log.created_at ?? `${log.date}T00:00:00`,
            })),
            ...(momentLogs || []).map((log: any) => ({
              id: log.id,
              date: log.date,
              type: 'quick' as const, // ✅ renamed from "moment"
              overall_severity: log.overall_severity ?? null,
              timeIso: log.created_at ?? `${log.date}T00:00:00`,
            })),
          ].sort((a, b) => new Date(b.timeIso).getTime() - new Date(a.timeIso).getTime());

          if (alive) setCheckIns(combined);
        } catch (err) {
          console.error('[History] load failed', err);
        } finally {
          if (alive) setLoading(false);
        }
      })();

      return () => {
        alive = false;
      };
    }, [userId])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.purple} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{checkIns.length} total check-ins</Text>
      </View>

      {checkIns.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No check-ins yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Start a check-in from the Dashboard
          </Text>
        </View>
      ) : (
        checkIns.map((checkIn) => {
          const getSeverityColor = (severity: number | null) => {
            if (severity === null || severity === undefined) return colors.neutral.gray300;
            if (severity >= 7) return colors.accent.red;
            if (severity >= 4) return colors.accent.orange;
            return colors.accent.green;
          };

          return (
            <TouchableOpacity
              key={`${checkIn.type}-${checkIn.id}`}
              style={styles.checkInCard}
              onPress={() => router.push(`/log-detail?id=${checkIn.id}&type=${checkIn.type}`)}
            >
              <Text style={styles.checkInDate}>{formatDateSmart(checkIn.date)}</Text>

              <View
                style={[
                  styles.severityBadge,
                  { backgroundColor: getSeverityColor(checkIn.overall_severity) },
                ]}
              >
                <Text style={styles.severityText}>
                  {checkIn.overall_severity !== null && checkIn.overall_severity !== undefined
                    ? `Severity: ${checkIn.overall_severity}`
                    : 'Severity: -'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 80 : spacing.lg,
    backgroundColor: colors.primary.cream,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.cream,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.hero,
    color: colors.neutral.gray900,
  },
  subtitle: {
    ...typography.caption,
    color: colors.neutral.gray600,
    marginTop: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    ...typography.title3,
    color: colors.neutral.gray600,
  },
  emptyStateSubtext: {
    ...typography.caption,
    color: colors.neutral.gray500,
    marginTop: spacing.sm,
  },
  checkInCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  checkInDate: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
  },
  severityBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  severityText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.neutral.white,
  },
});