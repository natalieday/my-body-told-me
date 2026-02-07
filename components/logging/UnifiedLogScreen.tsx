// components/logging/UnifiedLogScreen.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Settings, Check, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { updateStreak } from '@/lib/streak';
import { UserCondition } from '@/lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';
import { TriggerInput } from '@/components/TriggerInput';
import { Trigger } from '@/lib/trigger-types';

type Mode = 'moment' | 'daily';

function getLocalISODate(d = new Date()) {
  // convert "now" to local date, then format as YYYY-MM-DD
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 10);
}

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
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 2 },
  button: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral.gray100,
    minWidth: 28,
    alignItems: 'center',
    flex: 1,
  },
  buttonActive: { backgroundColor: colors.accent.purple },
  buttonText: { fontSize: 11, fontWeight: '600', color: colors.neutral.gray700 },
  buttonTextActive: { color: colors.neutral.white },
});

type Draft = {
  mode: Mode;
  overallSeverity: number | null;
  selectedConditions: string[];
  conditionSeverities: Record<string, number>;
  whatDoing?: string;
  notes: string;
  triggerValues: Record<string, { value: number | null; valueText?: string | null }>;
  updatedAt: string;
};

export default function UnifiedLogScreen({
  initialMode = 'daily',
  showHeader = false, // if you ever want an in-screen header; for tabs leave false
}: {
  initialMode?: Mode;
  showHeader?: boolean;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;

  const [mode, setMode] = useState<Mode>(initialMode);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Shared core fields
  const [overallSeverity, setOverallSeverity] = useState<number | null>(null);
  const [conditions, setConditions] = useState<UserCondition[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [conditionSeverities, setConditionSeverities] = useState<Record<string, number>>({});

  // Moment-only
  const [whatDoing, setWhatDoing] = useState('');

  // Triggers (shared)
  const [enabledTriggers, setEnabledTriggers] = useState<Trigger[]>([]);
  const [triggerValues, setTriggerValues] = useState<
    Record<string, { value: number | null; valueText?: string | null }>
  >({});
  const [triggersLoading, setTriggersLoading] = useState(false);

  // Notes (shared)
  const [notes, setNotes] = useState('');

  // Draft hydration guards
  const [hydrated, setHydrated] = useState(false);

  const today = useMemo(() => getLocalISODate(), []);

  const draftKey = useMemo(() => {
    // per-user, per-day, per-mode
    return `unifiedLogDraft:${userId ?? 'anon'}:${today}:${mode}`;
  }, [userId, today, mode]);

  const saveDraft = useCallback(async () => {
    if (!userId) return;

    const draft: Draft = {
      mode,
      overallSeverity,
      selectedConditions,
      conditionSeverities,
      notes,
      triggerValues,
      updatedAt: new Date().toISOString(),
      ...(mode === 'moment' ? { whatDoing } : {}), // ✅ only for moment
    };

    await AsyncStorage.setItem(draftKey, JSON.stringify(draft));
  }, [
    userId,
    draftKey,
    mode,
    overallSeverity,
    selectedConditions,
    conditionSeverities,
    whatDoing,
    notes,
    triggerValues,
  ]);

  const loadDraft = useCallback(async (): Promise<Draft | null> => {
    if (!userId) return null;

    const raw = await AsyncStorage.getItem(draftKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as Draft;
    } catch {
      return null;
    }
  }, [userId, draftKey]);

  const clearDraft = useCallback(async () => {
    if (!userId) return;
    await AsyncStorage.removeItem(draftKey);
  }, [userId, draftKey]);

  const loadConditions = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('user_conditions')
      .select('*, condition:conditions(*)')
      .eq('user_id', uid);

    if (error) {
      console.error('[loadConditions] error', error);
      return;
    }
    setConditions((data ?? []) as any);
  }, []);

  const loadEnabledTriggers = useCallback(async () => {
    if (!userId) return;

    setTriggersLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_triggers')
        .select('*, trigger:triggers(*)')
        .eq('user_id', userId)
        .eq('enabled', true)
        .order('sort_order');

      if (error) throw error;

      const triggers = (data ?? []).map((ut: any) => ut.trigger as any);

      // parent/group triggers are UI-only: don’t render or log them
      const leafTriggers = triggers.filter((t: any) => t.input_type !== 'group');

      setEnabledTriggers(leafTriggers);

      // keep existing values for triggers still enabled
      setTriggerValues((prev) => {
        const next: typeof prev = {};
        for (const t of leafTriggers) if (prev[t.id]) next[t.id] = prev[t.id];
        return next;
      });
    } catch (e) {
      console.error('Error loading enabled triggers:', e);
    } finally {
      setTriggersLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    loadConditions(userId);
    loadEnabledTriggers();
  }, [userId, loadConditions, loadEnabledTriggers]);

  const toggleCondition = (conditionId: string) => {
    if (selectedConditions.includes(conditionId)) {
      setSelectedConditions(selectedConditions.filter((id) => id !== conditionId));
      setConditionSeverities((prev) => {
        const next = { ...prev };
        delete next[conditionId];
        return next;
      });
    } else {
      setSelectedConditions([...selectedConditions, conditionId]);
    }
  };

  // conditional trigger behavior
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

  const resetForm = useCallback(() => {
    setOverallSeverity(null);
    setSelectedConditions([]);
    setConditionSeverities({});
    setWhatDoing('');
    setNotes('');
    setTriggerValues({});
  }, []);

  // HYDRATE: Draft wins; if no draft and mode === daily, autofill from today's DB log.
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      if (!userId) return;
      setHydrated(false);
      resetForm();

      // 1) draft wins
      const draft = await loadDraft();
      if (!cancelled && draft) {
        setOverallSeverity(draft.overallSeverity);
        setSelectedConditions(draft.selectedConditions);
        setConditionSeverities(draft.conditionSeverities);
        setWhatDoing(draft.mode === 'moment' ? (draft.whatDoing ?? '') : '');
        setNotes(draft.notes);
        setTriggerValues(draft.triggerValues);
        setHydrated(true);
        return;
      }

      // 2) if no draft and daily mode => autofill from DB if already logged today
      if (mode === 'daily') {
        setWhatDoing('');
        try {
          const { data: daily, error: dailyErr } = await supabase
            .from('daily_logs')
            .select('id, overall_severity, notes')
            .eq('user_id', userId)
            .eq('date', today)
            .maybeSingle();

          if (dailyErr) throw dailyErr;

          if (!cancelled && daily?.id) {
            setOverallSeverity(daily.overall_severity ?? null);
            setNotes(daily.notes ?? '');

            const { data: dc, error: dcErr } = await supabase
              .from('daily_log_conditions')
              .select('user_condition_id, severity')
              .eq('daily_log_id', daily.id);

            if (dcErr) throw dcErr;

            const selected = (dc ?? []).map((x: any) => x.user_condition_id);
            const severities: Record<string, number> = {};
            for (const row of dc ?? []) {
              if (row.severity !== null && row.severity !== undefined) {
                severities[row.user_condition_id] = row.severity;
              }
            }

            setSelectedConditions(selected);
            setConditionSeverities(severities);

            const { data: dt, error: dtErr } = await supabase
              .from('daily_log_triggers')
              .select('trigger_id, value, value_text')
              .eq('daily_log_id', daily.id);

            if (dtErr) throw dtErr;

            const nextTV: Record<string, { value: number | null; valueText?: string | null }> = {};
            for (const row of dt ?? []) {
              nextTV[row.trigger_id] = { value: row.value, valueText: row.value_text };
            }
            setTriggerValues(nextTV);
          }
        } catch (e) {
          console.error('[UnifiedLogScreen] hydrate daily from DB failed', e);
        }
      }

      if (!cancelled) setHydrated(true);
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [userId, mode, today, loadDraft, resetForm]);

  // Autosave draft when user edits (after hydration)
  useEffect(() => {
    if (!userId) return;
    if (!hydrated) return;
    if (saved) return;

    saveDraft().catch((e) => console.error('[UnifiedLogScreen] saveDraft failed', e));
  }, [
    userId,
    hydrated,
    saved,
    mode,
    overallSeverity,
    selectedConditions,
    conditionSeverities,
    whatDoing,
    notes,
    triggerValues,
    saveDraft,
  ]);

  const handleCancel = useCallback(async () => {
    try {
      await saveDraft(); // keep what they typed
    } finally {
      router.replace('/(tabs)/dashboard');
    }
  }, [saveDraft, router]);

  const handleSave = useCallback(async () => {
    if (!userId) return;

    console.log('🟣 [UnifiedLogScreen] SAVE pressed', { mode, userId });

    setLoading(true);
    try {
      const nowIso = new Date().toISOString();

      // average across selected condition severities (optional fallback)
      const avgConditionSeverity =
        selectedConditions.length > 0
          ? Math.round(
              selectedConditions.reduce((sum, id) => sum + (conditionSeverities[id] || 0), 0) /
                selectedConditions.length
            )
          : null;

      const finalOverallSeverity = overallSeverity ?? avgConditionSeverity;

      const triggerEntries = Object.entries(triggerValues)
        .filter(([_, data]) => data.value !== null)
        .map(([triggerId, data]) => ({
          trigger_id: triggerId,
          value: data.value!,
          value_text: data.valueText || null,
        }));

      if (mode === 'daily') {
        const { data: existing, error: exErr } = await supabase
          .from('daily_logs')
          .select('id')
          .eq('user_id', userId)
          .eq('date', today)
          .maybeSingle();
        if (exErr) throw exErr;

        let dailyLogId: string;

        if (existing) {
          const { error: updErr } = await supabase
            .from('daily_logs')
            .update({
              overall_severity: finalOverallSeverity,
              notes: notes || null,
              updated_at: nowIso,
            })
            .eq('id', existing.id);
          if (updErr) throw updErr;

          dailyLogId = existing.id;

          const { error: delC } = await supabase
            .from('daily_log_conditions')
            .delete()
            .eq('daily_log_id', dailyLogId);
          if (delC) throw delC;

          const { error: delT } = await supabase
            .from('daily_log_triggers')
            .delete()
            .eq('daily_log_id', dailyLogId);
          if (delT) throw delT;
        } else {
          const { data: created, error: createErr } = await supabase
            .from('daily_logs')
            .insert({
              user_id: userId,
              date: today,
              overall_severity: finalOverallSeverity,
              notes: notes || null,
            })
            .select()
            .single();
          if (createErr) throw createErr;

          dailyLogId = created!.id;
        }

        if (selectedConditions.length > 0) {
          const { error: insC } = await supabase.from('daily_log_conditions').insert(
            selectedConditions.map((user_condition_id) => ({
              daily_log_id: dailyLogId,
              user_condition_id,
              severity: conditionSeverities[user_condition_id] ?? null,
            }))
          );
          if (insC) throw insC;
        }

        if (triggerEntries.length > 0) {
          const { error: insT } = await supabase.from('daily_log_triggers').insert(
            triggerEntries.map((t) => ({
              daily_log_id: dailyLogId,
              ...t,
            }))
          );
          if (insT) throw insT;
        }

        await updateStreak(userId);

        // ✅ only reset draft/data after a successful save
        await clearDraft();
        resetForm();

        setSaved(true);
        return;
      }

      // moment mode
      const { data: moment, error: momentErr } = await supabase
        .from('moment_logs')
        .insert({
          user_id: userId,
          date: today,
          overall_severity: finalOverallSeverity,
          activity: whatDoing || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (momentErr) throw momentErr;

      const momentId = moment!.id;

      if (selectedConditions.length > 0) {
        const { error: insMC } = await supabase.from('moment_log_conditions').insert(
          selectedConditions.map((user_condition_id) => ({
            moment_log_id: momentId,
            user_condition_id,
            severity: conditionSeverities[user_condition_id] ?? null,
          }))
        );
        if (insMC) throw insMC;
      }

      if (triggerEntries.length > 0) {
        const { error: insMT } = await supabase.from('moment_log_triggers').insert(
          triggerEntries.map((t) => ({
            moment_log_id: momentId,
            ...t,
          }))
        );
        if (insMT) throw insMT;
      }

      await updateStreak(userId);

      // ✅ only reset draft/data after a successful save
      await clearDraft();
      resetForm();

      setSaved(true);
    } catch (e: any) {
      console.error('[UnifiedLogScreen] save failed', e);
      Alert.alert('Save failed', e?.message || 'Check console logs.');
    } finally {
      setLoading(false);
    }
  }, [
    mode,
    userId,
    today,
    notes,
    whatDoing,
    overallSeverity,
    selectedConditions,
    conditionSeverities,
    triggerValues,
    clearDraft,
    resetForm,
  ]);

  if (!userId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Please sign in</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Optional header (if you ever want it) */}
      {showHeader && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Log</Text>
          <TouchableOpacity onPress={() => router.push('/settings-triggers')} style={styles.iconButton}>
            <Settings size={20} color={colors.accent.purple} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        {/* left spacer so title stays centered */}
        <View style={styles.topBarSide} />
      
        <Text style={styles.topBarTitle}>Check In</Text>
      
        <View style={styles.topBarSide}>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <X size={16} color={colors.neutral.gray700} strokeWidth={2.5} />
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modePill, mode === 'moment' && styles.modePillActive]}
            onPress={() => {
              setHydrated(false);
              setMode('moment');
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.modeText, mode === 'moment' && styles.modeTextActive]}>Quick</Text>
              <Text style={[styles.modeSubtext, mode === 'moment' && styles.modeSubtextActive]}>
                Multiple per day
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modePill, mode === 'daily' && styles.modePillActive]}
            onPress={() => {
              setHydrated(false);
              setWhatDoing('');
              setMode('daily');
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.modeText, mode === 'daily' && styles.modeTextActive]}>Daily</Text>
              <Text style={[styles.modeSubtext, mode === 'daily' && styles.modeSubtextActive]}>
                One per day
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Overall severity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overall severity</Text>
          <SimpleSlider min={0} max={10} value={overallSeverity} onChange={setOverallSeverity} />
        </View>

        {/* Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conditions / Symptoms</Text>

          <View style={{ gap: spacing.sm }}>
            {conditions.map((c) => (
              <View key={c.id}>
                <TouchableOpacity
                  style={[
                    styles.conditionOption,
                    selectedConditions.includes(c.id) && styles.conditionOptionActive,
                  ]}
                  onPress={() => toggleCondition(c.id)}
                >
                  <Text
                    style={[
                      styles.conditionText,
                      selectedConditions.includes(c.id) && styles.conditionTextActive,
                    ]}
                  >
                    {c.condition?.name ?? c.custom_label ?? 'Unnamed'}
                  </Text>
                </TouchableOpacity>

                {selectedConditions.includes(c.id) && (
                  <View style={styles.inlineSeverity}>
                    <Text style={styles.inlineSeverityLabel}>Severity</Text>
                    <SimpleSlider
                      min={0}
                      max={10}
                      value={conditionSeverities[c.id] ?? null}
                      onChange={(v) => setConditionSeverities((prev) => ({ ...prev, [c.id]: v }))}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Moment-only */}
        {mode === 'moment' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What are you doing right now?</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., standing, walking, lying down…"
              value={whatDoing}
              onChangeText={setWhatDoing}
            />
          </View>
        )}

        {/* Triggers */}
        <View style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Triggers</Text>
            <TouchableOpacity onPress={() => router.push('/settings-triggers')}>
              <Settings size={18} color={colors.accent.purple} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {triggersLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent.purple} />
            </View>
          ) : filteredTriggers.length === 0 ? (
            <Text style={styles.emptyText}>No triggers enabled</Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {filteredTriggers.map((t) => (
                <TriggerInput
                  key={t.id}
                  trigger={t}
                  value={triggerValues[t.id]?.value ?? null}
                  onValueChange={(value, valueText) => {
                    setTriggerValues((prev) => ({
                      ...prev,
                      [t.id]: { value, valueText },
                    }));
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, { minHeight: 100 }]}
            placeholder="Any additional notes…"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Footer save */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      {/* Saved overlay */}
      {saved && (
        <View style={styles.savedOverlay}>
          <View style={styles.savedCard}>
            <View style={styles.checkCircle}>
              <Check size={28} color={colors.neutral.white} strokeWidth={3} />
            </View>

            <Text style={styles.savedTitle}>Saved</Text>
            <Text style={styles.savedSubtitle}>Your log has been recorded.</Text>

            <TouchableOpacity
              style={styles.savedButton}
              onPress={() => {
                setSaved(false);
                router.replace('/(tabs)/dashboard');
              }}
            >
              <Text style={styles.savedButtonText}>Back to dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary.cream },

  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerTitle: { ...typography.title2, color: colors.neutral.gray900 },

  topBar: {
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  topBarSide: {
    width: 110, // should roughly match cancel button width
    alignItems: 'flex-end',
  },
  
  topBarTitle: {
    ...typography.title2,
    color: colors.neutral.gray900,
    textAlign: 'center',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  cancelText: {
    ...typography.bodyBold,
    color: colors.neutral.gray700,
  },

  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 0,
    paddingBottom: 140,
  },

  modeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  modePill: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    ...shadows.sm,
  },
  modePillActive: { backgroundColor: colors.primary.lavender, ...shadows.md },
  modeText: { ...typography.bodyBold, color: colors.neutral.gray700 },
  modeTextActive: { color: colors.accent.purple },

  section: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: { ...typography.bodyBold, color: colors.neutral.gray900, marginBottom: spacing.sm },

  conditionOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.gray50,
  },
  conditionOptionActive: { backgroundColor: colors.primary.peach },
  conditionText: { ...typography.bodyBold, color: colors.neutral.gray900 },
  conditionTextActive: { color: colors.neutral.gray900 },

  inlineSeverity: {
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray200,
  },
  inlineSeverityLabel: {
    ...typography.captionBold,
    color: colors.neutral.gray700,
    marginBottom: spacing.xs,
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

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loadingContainer: { paddingVertical: spacing.lg, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.neutral.gray600 },

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
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { ...typography.bodyBold, color: colors.neutral.white },

  title: { ...typography.title2, color: colors.neutral.gray900, padding: spacing.lg },

  // Saved overlay
  savedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  savedCard: {
    width: '100%',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  savedTitle: {
    ...typography.title1,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  savedSubtitle: {
    ...typography.body,
    color: colors.neutral.gray600,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  savedButton: {
    width: '100%',
    backgroundColor: colors.neutral.gray900,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  savedButtonText: {
    ...typography.bodyBold,
    color: colors.neutral.white,
  },

  modeSubtext: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 2,
    color: colors.neutral.gray500,
  },
  modeSubtextActive: {
    color: colors.accent.purple,
  },
});