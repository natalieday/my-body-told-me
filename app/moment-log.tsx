// app/moment-log.tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { updateStreak } from '@/lib/streak';
import { UserCondition } from '@/lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';
import { TriggerInput } from '@/components/TriggerInput';
import { Trigger } from '@/lib/trigger-types';

function SimpleSlider({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.buttonRow}>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => (
          <TouchableOpacity
            key={v}
            style={[sliderStyles.button, value === v && sliderStyles.buttonActive]}
            onPress={() => onChange(v)}
          >
            <Text style={[sliderStyles.buttonText, value === v && sliderStyles.buttonTextActive]}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  container: { marginVertical: spacing.sm },
  buttonRow: { flexDirection: 'row', columnGap: 2 },
  button: {
    paddingHorizontal: 2,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral.gray100,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  buttonActive: { backgroundColor: colors.accent.purple },
  buttonText: { fontSize: 11, fontWeight: '600', color: colors.neutral.gray700 },
  buttonTextActive: { color: colors.neutral.white },
});

type TriggerValueMap = Record<string, { value: number | null; valueText?: string | null }>;

export default function MomentLogScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  const params = useLocalSearchParams();
  const preselectedCondition = params.preselectedCondition as string | undefined;
  const editId = params.editId as string | undefined;
  const isEdit = !!editId;

  const [loading, setLoading] = useState(false);

  const [conditions, setConditions] = useState<UserCondition[]>([]);
  const [conditionData, setConditionData] = useState<
    Record<string, { active: boolean; severity: number | null; notes: string }>
  >({});

  const [enabledTriggers, setEnabledTriggers] = useState<Trigger[]>([]);
  const [triggerValues, setTriggerValues] = useState<TriggerValueMap>({});
  const [triggersLoading, setTriggersLoading] = useState(false);

  const [formData, setFormData] = useState({
    overall_severity: null as number | null,
    activity: '',
    notes: '',
  });

  // ---- Trigger helpers (optional conditional UI like your other screen)
  const onPeriodTrigger = useMemo(
    () => enabledTriggers.find((t: any) => t.key === 'on_period'),
    [enabledTriggers]
  );
  const showPeriodPain = onPeriodTrigger && triggerValues[onPeriodTrigger.id]?.value === 1;

  const filteredTriggers = useMemo(() => {
    return enabledTriggers.filter((t: any) => {
      if (t.key === 'period_pain') return !!showPeriodPain;
      return true;
    });
  }, [enabledTriggers, showPeriodPain]);

  // ---- Load enabled triggers
  const loadEnabledTriggers = useCallback(async (uid: string) => {
    setTriggersLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_triggers')
        .select('*, trigger:triggers(*)')
        .eq('user_id', uid)
        .eq('enabled', true)
        .order('sort_order');

      if (error) throw error;

      const triggers = (data ?? []).map((ut: any) => ut.trigger as any);

      // filter out group triggers (UI-only)
      const leafTriggers = triggers.filter((t: any) => t.input_type !== 'group');

      setEnabledTriggers(leafTriggers);

      // keep any existing values for triggers still enabled
      setTriggerValues((prev) => {
        const next: TriggerValueMap = {};
        for (const t of leafTriggers) if (prev[t.id]) next[t.id] = prev[t.id];
        return next;
      });
    } catch (error) {
      console.error('Error loading enabled triggers:', error);
    } finally {
      setTriggersLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      loadEnabledTriggers(userId);
    }, [userId, loadEnabledTriggers])
  );

  // ---- Load conditions + (if edit) hydrate from existing moment log
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const hydrate = async () => {
      setLoading(true);
      try {
        // 1) load all user conditions first (build base conditionData map)
        const { data, error } = await supabase
          .from('user_conditions')
          .select('*, condition:conditions(*)')
          .eq('user_id', userId);

        if (error) throw error;

        if (cancelled) return;

        setConditions((data ?? []) as any);

        const baseMap: Record<string, { active: boolean; severity: number | null; notes: string }> =
          {};
        for (const c of data ?? []) {
          baseMap[c.id] = {
            active: c.id === preselectedCondition, // only matters for create flow
            severity: null,
            notes: '',
          };
        }
        setConditionData(baseMap);

        // 2) if edit mode, hydrate values from DB *after* baseMap exists
        if (editId) {
          // parent row
          const { data: logRow, error: logErr } = await supabase
            .from('moment_logs')
            .select('id, overall_severity, activity, notes')
            .eq('id', editId)
            .eq('user_id', userId)
            .single();

          if (logErr) throw logErr;

          if (cancelled) return;

          setFormData({
            overall_severity: logRow.overall_severity ?? null,
            activity: logRow.activity ?? '',
            notes: logRow.notes ?? '',
          });

          // children: conditions
          const { data: condRows, error: condErr } = await supabase
            .from('moment_log_conditions')
            .select('user_condition_id, severity, notes')
            .eq('moment_log_id', editId);

          if (condErr) throw condErr;

          // children: triggers
          const { data: trigRows, error: trigErr } = await supabase
            .from('moment_log_triggers')
            .select('trigger_id, value, value_text')
            .eq('moment_log_id', editId);

          if (trigErr) throw trigErr;

          if (cancelled) return;

          // apply conditions to baseMap
          setConditionData((prev) => {
            const next = { ...prev };

            // turn everything off first
            for (const k of Object.keys(next)) {
              next[k] = { ...next[k], active: false, severity: null, notes: '' };
            }

            for (const row of condRows ?? []) {
              next[row.user_condition_id] = {
                active: true,
                severity: row.severity ?? null,
                notes: row.notes ?? '',
              };
            }

            return next;
          });

          // apply triggers
          const tv: TriggerValueMap = {};
          for (const row of trigRows ?? []) {
            tv[row.trigger_id] = { value: row.value ?? null, valueText: row.value_text ?? null };
          }
          setTriggerValues(tv);
        }
      } catch (e) {
        console.error('[MomentLogScreen] hydrate failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [userId, preselectedCondition, editId]);

  const updateConditionField = (
    condId: string,
    field: keyof (typeof conditionData)[string],
    value: any
  ) => {
    setConditionData((prev) => ({
      ...prev,
      [condId]: {
        ...prev[condId],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];

      let momentLogId: string;

      if (isEdit) {
        // Update parent row
        const { error: updErr } = await supabase
          .from('moment_logs')
          .update({
            overall_severity: formData.overall_severity,
            activity: formData.activity || null,
            notes: formData.notes || null,
            // updated_at: now.toISOString(), // only if you have this column
          })
          .eq('id', editId!)
          .eq('user_id', userId);

        if (updErr) throw updErr;
        momentLogId = editId!;
      } else {
        // Insert parent row
        const { data: created, error: createErr } = await supabase
          .from('moment_logs')
          .insert({
            user_id: userId,
            timestamp: now.toISOString(),
            date: dateStr,
            overall_severity: formData.overall_severity,
            activity: formData.activity || null,
            notes: formData.notes || null,
          })
          .select('id')
          .single();

        if (createErr) throw createErr;
        momentLogId = created!.id;
      }

      // Replace children: conditions
      const { error: delC } = await supabase
        .from('moment_log_conditions')
        .delete()
        .eq('moment_log_id', momentLogId);
      if (delC) throw delC;

      const activeConditions = Object.entries(conditionData)
        .filter(([_, data]) => data.active)
        .map(([conditionId, data]) => ({
          moment_log_id: momentLogId,
          user_condition_id: conditionId,
          severity: data.severity,
          notes: data.notes || null,
        }));

      if (activeConditions.length > 0) {
        const { error: insC } = await supabase.from('moment_log_conditions').insert(activeConditions);
        if (insC) throw insC;
      }

      // Replace children: triggers
      const { error: delT } = await supabase
        .from('moment_log_triggers')
        .delete()
        .eq('moment_log_id', momentLogId);
      if (delT) throw delT;

      const triggerEntries = Object.entries(triggerValues)
        .filter(([_, data]) => data.value !== null)
        .map(([triggerId, data]) => ({
          moment_log_id: momentLogId,
          trigger_id: triggerId,
          value: data.value!,
          value_text: data.valueText || null,
        }));

      if (triggerEntries.length > 0) {
        const { error: insT } = await supabase.from('moment_log_triggers').insert(triggerEntries);
        if (insT) throw insT;
      }

      await updateStreak(userId);

      router.back();
    } catch (error) {
      console.error('Error saving moment log:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color={colors.neutral.gray900} />
        </TouchableOpacity>

        <Text style={styles.title}>{isEdit ? 'Edit moment' : 'Log this moment'}</Text>

        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overall Severity</Text>
            <Text style={styles.sliderValue}>{formData.overall_severity ?? '-'}</Text>
          </View>
          <SimpleSlider
            min={0}
            max={10}
            value={formData.overall_severity}
            onChange={(value) => setFormData({ ...formData, overall_severity: value })}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions / Symptoms</Text>
          <Text style={styles.sectionSubtitle}>
            Select which conditions you're experiencing right now
          </Text>

          {conditions.map((condition) => (
            <View key={condition.id} style={styles.conditionBlock}>
              <View style={styles.conditionHeader}>
                <Text style={styles.conditionLabel}>
                  {condition.condition?.name || condition.custom_label || 'Unnamed'}
                </Text>

                <Switch
                  value={conditionData[condition.id]?.active || false}
                  onValueChange={(value) => updateConditionField(condition.id, 'active', value)}
                  trackColor={{ false: '#d1d5db', true: '#a5b4fc' }}
                  thumbColor={conditionData[condition.id]?.active ? '#6366f1' : '#f3f4f6'}
                />
              </View>

              {conditionData[condition.id]?.active && (
                <View style={styles.conditionDetails}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.label}>Severity</Text>
                    <Text style={styles.sliderValue}>
                      {conditionData[condition.id]?.severity ?? '-'}
                    </Text>
                  </View>

                  <SimpleSlider
                    min={0}
                    max={10}
                    value={conditionData[condition.id]?.severity ?? null}
                    onChange={(value) => updateConditionField(condition.id, 'severity', value)}
                  />

                  <TextInput
                    style={styles.notesInput}
                    placeholder="Notes about this condition..."
                    value={conditionData[condition.id]?.notes || ''}
                    onChangeText={(text) => updateConditionField(condition.id, 'notes', text)}
                    multiline
                    numberOfLines={2}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What are you doing?</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., standing, lying down, walking..."
            value={formData.activity}
            onChangeText={(text) => setFormData({ ...formData, activity: text })}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Triggers</Text>

          {triggersLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.accent.purple} />
            </View>
          ) : filteredTriggers.length === 0 ? (
            <Text style={styles.emptyText}>
              No triggers enabled. Enable them in Settings → Tracking → Triggers.
            </Text>
          ) : (
            <View style={styles.triggersContainer}>
              {filteredTriggers.map((trigger) => (
                <TriggerInput
                  key={trigger.id}
                  trigger={trigger}
                  value={triggerValues[trigger.id]?.value ?? null}
                  onValueChange={(value, valueText) => {
                    setTriggerValues((prev) => ({
                      ...prev,
                      [trigger.id]: { value, valueText },
                    }));
                  }}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, { minHeight: 80 }]}
            placeholder="Any additional notes..."
            value={formData.notes}
            onChangeText={(text) => setFormData({ ...formData, notes: text })}
            multiline
            numberOfLines={4}
          />
          <Text style={styles.privateDisclosure}>🔒 Private to you</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>{isEdit ? 'Save Changes' : 'Save Moment'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.title3,
    color: colors.neutral.gray900,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.lg,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.neutral.gray600,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.neutral.gray600,
  },
  sliderValue: {
    ...typography.title3,
    color: colors.accent.purple,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.neutral.gray900,
    backgroundColor: colors.neutral.white,
  },
  conditionBlock: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.neutral.gray50,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  conditionLabel: {
    ...typography.captionBold,
    color: colors.neutral.gray900,
    flex: 1,
  },
  conditionDetails: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.caption,
    color: colors.neutral.gray900,
    backgroundColor: colors.neutral.white,
    minHeight: 60,
  },
  privateDisclosure: {
    ...typography.caption,
    color: colors.neutral.gray600,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray200,
  },
  saveButton: {
    backgroundColor: colors.neutral.gray900,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.bodyBold,
    color: colors.neutral.white,
  },
  loadingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.caption,
    color: colors.neutral.gray600,
    fontStyle: 'italic',
  },
  triggersContainer: {
    gap: spacing.sm,
  },
});