import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ChevronLeft, Plus, Activity, X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserCondition, SubSymptom, ConditionStatus } from '@/lib/types';

const STATUS_LABELS: Record<ConditionStatus, string> = {
  diagnosed: 'Diagnosed',
  likely: 'Likely',
  exploring: 'Exploring',
  monitoring: 'Monitoring',
};

const STATUS_COLORS: Record<ConditionStatus, string> = {
  diagnosed: '#10b981',
  likely: '#f59e0b',
  exploring: '#6366f1',
  monitoring: '#8b5cf6',
};

export default function ConditionDetailScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const conditionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [condition, setCondition] = useState<UserCondition | null>(null);
  const [subSymptoms, setSubSymptoms] = useState<SubSymptom[]>([]);
  const [notes, setNotes] = useState('');
  const [showAddSymptom, setShowAddSymptom] = useState(false);
  const [newSymptomName, setNewSymptomName] = useState('');
  const [savingSymptom, setSavingSymptom] = useState(false);
  const [todaySeverity, setTodaySeverity] = useState<number | null>(null);

  const userId = user?.id;

  const loadConditionDetail = async (userId: string) => {
    setLoading(true);
    try {
      const { data: conditionData } = await supabase
        .from('user_conditions')
        .select('*, condition:conditions(*)')
        .eq('id', conditionId)
        .eq('user_id', userId)
        .maybeSingle();
  
      if (conditionData) {
        setCondition(conditionData as any);
        setNotes(conditionData.notes || '');
      }
  
      const { data: subSymptomsData } = await supabase
        .from('sub_symptoms')
        .select('*')
        .eq('user_condition_id', conditionId)
        .order('created_at', { ascending: false });
  
      if (subSymptomsData) {
        setSubSymptoms(subSymptomsData);
      }
  
      const today = new Date().toISOString().split('T')[0];
      const { data: todayMoments } = await supabase
        .from('moment_log_conditions')
        .select('severity, moment_logs!inner(date)')
        .eq('user_condition_id', conditionId)
        .eq('moment_logs.date', today);
  
      if (todayMoments && todayMoments.length > 0) {
        const maxSeverity = Math.max(...todayMoments.map((m: any) => m.severity || 0));
        setTodaySeverity(maxSeverity);
      }
    } catch (e) {
      console.error('loadConditionDetail error:', e);
    } finally {
      setLoading(false);
    }
  };

useFocusEffect(
  useCallback(() => {
    if (!userId || !conditionId) return;

    loadConditionDetail(userId);

  }, [userId, conditionId])
);

  const handleAddSubSymptom = async () => {
    if (!newSymptomName.trim() || !conditionId) return;

    setSavingSymptom(true);
    try {
      const { data } = await supabase
        .from('sub_symptoms')
        .insert({
          user_condition_id: conditionId,
          name: newSymptomName.trim(),
        })
        .select()
        .single();

      if (data) {
        setSubSymptoms([data, ...subSymptoms]);
        setNewSymptomName('');
        setShowAddSymptom(false);
      }
    } catch (error) {
      console.error('Error adding sub-symptom:', error);
    } finally {
      setSavingSymptom(false);
    }
  };

  const handleDeleteSubSymptom = (symptomId: string, symptomName: string) => {
    Alert.alert(
      'Delete Sub-Symptom',
      `Remove "${symptomName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('sub_symptoms').delete().eq('id', symptomId);
            setSubSymptoms(subSymptoms.filter((s) => s.id !== symptomId));
          },
        },
      ]
    );
  };

  const handleSaveNotes = async () => {
    if (!conditionId) return;

    await supabase
      .from('user_conditions')
      .update({ notes: notes || null })
      .eq('id', conditionId);
  };

  const handleDeleteCondition = () => {
    console.log('🧨 handleDeleteCondition called', { userId, conditionId });

    if (!userId) {
      Alert.alert('Error', 'Not signed in.');
      return;
    }

    const label =
      condition?.condition?.name || condition?.custom_label || 'this condition';

    const message = `Are you sure you want to delete "${label}"? This will remove all associated logs and data.`;

    const runDelete = async () => {
      console.log('✅ confirmed delete, starting...', { userId, conditionId });

      try {
        setLoading(true);

        const { data: subDel, error: subErr } = await supabase
          .from('sub_symptoms')
          .delete()
          .eq('user_condition_id', conditionId)
          .select('id');

        console.log('delete sub_symptoms:', { count: subDel?.length, subErr });
        if (subErr) throw subErr;

        const { data: momentDel, error: momentErr } = await supabase
          .from('moment_log_conditions')
          .delete()
          .eq('user_condition_id', conditionId)
          .select('id');

        console.log('delete moment_log_conditions:', {
          count: momentDel?.length,
          momentErr,
        });
        if (momentErr) throw momentErr;

        const { data: deletedRows, error: condErr } = await supabase
          .from('user_conditions')
          .delete()
          .eq('id', conditionId)
          .eq('user_id', userId)
          .select('id');

        console.log('delete user_conditions result:', {
          conditionId,
          userId,
          deletedRows,
          condErr,
        });

        if (condErr) throw condErr;

        if (!deletedRows || deletedRows.length === 0) {
          Alert.alert('Not deleted', 'Nothing matched OR RLS blocked it.');
          return;
        }

        setCondition(null);
        router.back();
      } catch (e: any) {
        console.error('Delete condition failed:', e);
        Alert.alert('Error', e?.message || 'Failed to delete condition.');
      } finally {
        setLoading(false);
      }
    };

    // ✅ Web confirm (Alert is unreliable on web)
    if (Platform.OS === 'web') {
      const ok = window.confirm(message);
      if (ok) runDelete();
      return;
    }

    // ✅ Native confirm
    Alert.alert('Delete Condition', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: runDelete },
    ]);
  };

  const handleLogMoment = () => {
    router.push({
      pathname: '/moment-log',
      params: { preselectedCondition: conditionId },
    });
  };

  if (loading || !condition) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {condition.condition?.name || condition.custom_label}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mainCard}>
          <View style={styles.conditionHeader}>
            <Text style={styles.conditionName}>
              {condition.condition?.name || condition.custom_label}
            </Text>
            <TouchableOpacity
              style={[
                styles.statusBadge,
                { backgroundColor: `${STATUS_COLORS[condition.status]}20` },
              ]}
              onPress={() => router.push(`/add-condition?editId=${conditionId}&name=${encodeURIComponent(condition.condition?.name || condition.custom_label || '')}&description=${encodeURIComponent(condition.condition?.description || '')}`)}
            >
              <Text
                style={[styles.statusText, { color: STATUS_COLORS[condition.status] }]}
              >
                {STATUS_LABELS[condition.status]}
              </Text>
            </TouchableOpacity>
          </View>

          {todaySeverity !== null && (
            <View style={styles.todaySection}>
              <Text style={styles.todayLabel}>Today's Severity</Text>
              <Text style={styles.todayValue}>{todaySeverity}/10</Text>
            </View>
          )}

          <TouchableOpacity style={styles.logButton} onPress={handleLogMoment}>
            <Activity size={20} color="white" strokeWidth={2} />
            <Text style={styles.logButtonText}>Log a Moment for This Condition</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sub-Symptoms</Text>
            {!showAddSymptom && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddSymptom(true)}
              >
                <Plus size={18} color="#6366f1" strokeWidth={2.5} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {showAddSymptom && (
            <View style={styles.addSymptomBox}>
              <TextInput
                style={styles.addSymptomInput}
                placeholder="e.g., leg pain, dizziness, aura..."
                value={newSymptomName}
                onChangeText={setNewSymptomName}
                autoFocus
              />
              <View style={styles.addSymptomActions}>
                <TouchableOpacity
                  style={styles.cancelSymptomButton}
                  onPress={() => {
                    setShowAddSymptom(false);
                    setNewSymptomName('');
                  }}
                >
                  <Text style={styles.cancelSymptomText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveSymptomButton,
                    (!newSymptomName.trim() || savingSymptom) &&
                      styles.saveSymptomButtonDisabled,
                  ]}
                  onPress={handleAddSubSymptom}
                  disabled={!newSymptomName.trim() || savingSymptom}
                >
                  {savingSymptom ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.saveSymptomText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {subSymptoms.length > 0 ? (
            <View style={styles.symptomsList}>
              {subSymptoms.map((symptom) => (
                <View key={symptom.id} style={styles.symptomItem}>
                  <Text style={styles.symptomName}>{symptom.name}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteSubSymptom(symptom.id, symptom.name)}
                  >
                    <X size={16} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No sub-symptoms added yet. Tap "Add" to create one.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trend Chart</Text>
          <View style={styles.chartPlaceholder}>
            <Activity size={32} color="#d1d5db" strokeWidth={1.5} />
            <Text style={styles.chartPlaceholderText}>
              Chart coming soon - track symptoms to see trends
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes about this condition..."
            value={notes}
            onChangeText={setNotes}
            onBlur={handleSaveNotes}
            multiline
            numberOfLines={6}
          />
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            handleDeleteCondition();
          }}
        >
          <Text style={styles.deleteButtonText}>Delete Condition</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  mainCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  conditionHeader: {
    marginBottom: 16,
  },
  conditionName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  todaySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    marginBottom: 16,
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  todayValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#6366f1',
    borderRadius: 12,
  },
  logButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eef2ff',
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  addSymptomBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  addSymptomInput: {
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 12,
  },
  addSymptomActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelSymptomButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  cancelSymptomText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveSymptomButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  saveSymptomButtonDisabled: {
    opacity: 0.5,
  },
  saveSymptomText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  symptomsList: {
    gap: 8,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  symptomName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
  chartPlaceholder: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  chartPlaceholderText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 150,
    textAlignVertical: 'top',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
