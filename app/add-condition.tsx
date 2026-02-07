import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ConditionStatus } from '@/lib/types';

const STATUS_OPTIONS: { value: ConditionStatus; label: string; description: string }[] = [
  {
    value: 'diagnosed',
    label: 'Diagnosed',
    description: 'Confirmed by a healthcare professional',
  },
  {
    value: 'likely',
    label: 'Likely',
    description: 'Suspected, but not doctor-confirmed',
  },
  {
    value: 'exploring',
    label: 'Exploring',
    description: 'Not sure yet, tracking symptoms',
  },
  {
    value: 'monitoring',
    label: 'Monitoring',
    description: 'General symptoms like stress or fatigue',
  },
];

export default function AddConditionScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const conditionName = (params.name as string) || '';
  const conditionDescription = (params.description as string) || '';
  const editId = params.editId as string | undefined;

  const [status, setStatus] = useState<ConditionStatus>('exploring');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);

  useEffect(() => {
    if (editId && user) {
      loadExistingCondition();
    }
  }, [editId, user]);

  const loadExistingCondition = async () => {
    try {
      const { data } = await supabase
        .from('user_conditions')
        .select('status, notes')
        .eq('id', editId!)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (data) {
        setStatus(data.status);
        setNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Error loading condition:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (editId) {
        await supabase
          .from('user_conditions')
          .update({
            status: status,
            notes: notes || null,
          })
          .eq('id', editId)
          .eq('user_id', user.id);
      } else {
        let globalConditionId: string | null = null;

        const { data: existingCondition } = await supabase
          .from('conditions')
          .select('id')
          .eq('name', conditionName)
          .maybeSingle();

        if (existingCondition) {
          globalConditionId = existingCondition.id;
        } else {
          const { data: newCondition } = await supabase
            .from('conditions')
            .insert({ name: conditionName, description: conditionDescription })
            .select()
            .single();

          if (newCondition) {
            globalConditionId = newCondition.id;
          }
        }

        if (globalConditionId) {
          const { data: conditionData } = await supabase
            .from('conditions')
            .select('is_cycle')
            .eq('id', globalConditionId)
            .maybeSingle();

          await supabase.from('user_conditions').insert({
            user_id: user.id,
            condition_id: globalConditionId,
            status: status,
            notes: notes || null,
            is_cycle: conditionData?.is_cycle || false,
          });
        }
      }

      router.back();
    } catch (error) {
      console.error('Error saving condition:', error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <X size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>{editId ? 'Edit Confidence' : 'Add Condition'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.conditionName}>{conditionName}</Text>
          {conditionDescription && (
            <Text style={styles.conditionDescription}>{conditionDescription}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How would you describe this?</Text>
          <View style={styles.statusOptions}>
            {STATUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.statusOption,
                  status === option.value && styles.statusOptionActive,
                ]}
                onPress={() => setStatus(option.value)}
              >
                <View style={styles.statusOptionContent}>
                  <Text
                    style={[
                      styles.statusLabel,
                      status === option.value && styles.statusLabelActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.statusDescription,
                      status === option.value && styles.statusDescriptionActive,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radioOuter,
                    status === option.value && styles.radioOuterActive,
                  ]}
                >
                  {status === option.value && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Any details you want to remember..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
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
            <Text style={styles.saveButtonText}>{editId ? 'Save Changes' : 'Add Condition'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
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
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  conditionName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  conditionDescription: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  statusOptions: {
    gap: 12,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  statusOptionActive: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  statusOptionContent: {
    flex: 1,
    marginRight: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  statusLabelActive: {
    color: '#6366f1',
  },
  statusDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  statusDescriptionActive: {
    color: '#4f46e5',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#6366f1',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366f1',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: 'white',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
