// app/log-detail.tsx
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Pencil } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function LogDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const logId = params.id as string;
  const logType = params.type as 'daily' | 'moment';

  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState<any>(null);
  const [conditions, setConditions] = useState<any[]>([]);
  const [triggers, setTriggers] = useState<any[]>([]);

  useEffect(() => {
    if (user && logId) loadLogDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, logId, logType]);

  const loadLogDetails = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (logType === 'daily') {
        const { data: logData, error: logErr } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('id', logId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (logErr) throw logErr;

        if (logData) {
          setLog(logData);

          const { data: conditionsData, error: condErr } = await supabase
            .from('daily_log_conditions')
            .select('*, user_condition:user_conditions(*, condition:conditions(*))')
            .eq('daily_log_id', logId);

          if (condErr) throw condErr;
          setConditions(conditionsData ?? []);

          const { data: triggersData, error: trigErr } = await supabase
            .from('daily_log_triggers')
            .select('*, trigger:triggers(*)')
            .eq('daily_log_id', logId);

          if (trigErr) throw trigErr;
          setTriggers(triggersData ?? []);
        }
      } else {
        const { data: logData, error: logErr } = await supabase
          .from('moment_logs')
          .select('*')
          .eq('id', logId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (logErr) throw logErr;

        if (logData) {
          setLog(logData);

          const { data: conditionsData, error: condErr } = await supabase
            .from('moment_log_conditions')
            .select('*, user_condition:user_conditions(*, condition:conditions(*))')
            .eq('moment_log_id', logId);

          if (condErr) throw condErr;
          setConditions(conditionsData ?? []);

          const { data: triggersData, error: trigErr } = await supabase
            .from('moment_log_triggers')
            .select('*, trigger:triggers(*)')
            .eq('moment_log_id', logId);

          if (trigErr) throw trigErr;
          setTriggers(triggersData ?? []);
        }
      }
    } catch (error) {
      console.error('Error loading log details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent.purple} />
      </View>
    );
  }

  if (!log) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Log not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ChevronLeft size={24} color={colors.neutral.gray900} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={styles.title}>Log Details</Text>

        {logType === 'moment' ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/moment-log',
                params: { editId: logId },
              })
            }
            style={styles.iconButton}
          >
            <Pencil size={20} color={colors.neutral.gray900} strokeWidth={2} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.dateText}>{formatDate(log.date)}</Text>
          {logType === 'moment' && log.timestamp && (
            <Text style={styles.timeText}>
              {new Date(log.timestamp).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>

        {log.mood_tag && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mood</Text>
            <Text style={styles.valueText}>{log.mood_tag}</Text>
          </View>
        )}

        {log.overall_severity !== null && log.overall_severity !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overall Severity</Text>
            <View
              style={[
                styles.severityBadge,
                log.overall_severity >= 7 && styles.severityBadgeHigh,
                log.overall_severity >= 4 && log.overall_severity < 7 && styles.severityBadgeMedium,
                log.overall_severity < 4 && styles.severityBadgeLow,
              ]}
            >
              <Text style={styles.severityText}>{log.overall_severity}/10</Text>
            </View>
          </View>
        )}

        {conditions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conditions</Text>
            {conditions.map((c: any) => (
              <View key={c.id} style={styles.conditionItem}>
                <Text style={styles.conditionName}>
                  {c.user_condition?.condition?.name || c.user_condition?.custom_label}
                </Text>
                {c.severity !== null && (
                  <Text style={styles.conditionSeverity}>Severity: {c.severity}/10</Text>
                )}
                {c.notes && <Text style={styles.conditionNotes}>{c.notes}</Text>}
              </View>
            ))}
          </View>
        )}

        {triggers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Triggers</Text>
            {triggers.map((t: any) => (
              <View key={t.id} style={styles.triggerItem}>
                <Text style={styles.triggerLabel}>{t.trigger?.label}</Text>
                {t.value_text ? (
                  <Text style={styles.triggerValue}>{t.value_text}</Text>
                ) : t.value !== null ? (
                  <Text style={styles.triggerValue}>{t.value}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {log.activity && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity</Text>
            <Text style={styles.valueText}>{log.activity}</Text>
          </View>
        )}

        {log.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.valueText}>{log.notes}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 60,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary.cream,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  title: {
    ...typography.title2,
    color: colors.neutral.gray900,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  section: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  dateText: {
    ...typography.title3,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  timeText: {
    ...typography.body,
    color: colors.neutral.gray600,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: spacing.sm,
  },
  valueText: {
    ...typography.body,
    color: colors.neutral.gray700,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral.gray200,
  },
  severityBadgeLow: {
    backgroundColor: `${colors.accent.green}20`,
  },
  severityBadgeMedium: {
    backgroundColor: `${colors.accent.orange}20`,
  },
  severityBadgeHigh: {
    backgroundColor: `${colors.accent.red}20`,
  },
  severityText: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
  },
  conditionItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  conditionName: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  conditionSeverity: {
    ...typography.small,
    color: colors.neutral.gray600,
    marginBottom: spacing.xs,
  },
  conditionNotes: {
    ...typography.small,
    color: colors.neutral.gray700,
    fontStyle: 'italic',
  },
  triggerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  triggerLabel: {
    ...typography.body,
    color: colors.neutral.gray900,
  },
  triggerValue: {
    ...typography.bodyBold,
    color: colors.accent.purple,
  },
  errorText: {
    ...typography.body,
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});