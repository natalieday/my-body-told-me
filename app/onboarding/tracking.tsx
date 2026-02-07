import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';
import { Trigger, TRIGGER_CATEGORIES } from '@/lib/trigger-types';

export default function OnboardingTracking() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(new Set());
  const [showSkipModal, setShowSkipModal] = useState(false);

  useEffect(() => {
    loadTriggers();
  }, []);

  const loadTriggers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('triggers')
        .select('*')
        .eq('is_active', true)
        .is('parent_trigger_id', null)
        .order('sort_order');

      if (data) {
        setTriggers(data);
      }
    } catch (error) {
      console.error('Error loading triggers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrigger = (triggerId: string) => {
    const newSelected = new Set(selectedTriggers);
    if (newSelected.has(triggerId)) {
      newSelected.delete(triggerId);
    } else {
      newSelected.add(triggerId);
    }
    setSelectedTriggers(newSelected);
  };

  const handleContinue = async () => {
    if (user && selectedTriggers.size > 0) {
      const userTriggers = Array.from(selectedTriggers).map(triggerId => ({
        user_id: user.id,
        trigger_id: triggerId,
        enabled: true,
        sort_order: 0,
      }));

      await supabase
        .from('user_triggers')
        .upsert(userTriggers, { onConflict: 'user_id,trigger_id' });
    }

    router.push('/onboarding/conditions');
  };

  const handleModalSkip = () => {
    setShowSkipModal(false);
    router.push('/onboarding/conditions');
  };

  return (
    <View style={styles.container}>
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.neutral.gray900} />
        </TouchableOpacity>
    
        <View style={styles.stepWrap}>
          <Text style={styles.stepText}>Step 1/3</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '33%' }]} />
          </View>
        </View>
    
        <View style={styles.headerSpacer} />
      </View>
    </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>What would you like to notice patterns around?</Text>
          <Text style={styles.subtitle}>Choose what feels relevant to you</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent.purple} />
            </View>
          ) : (
            <View style={styles.optionsContainer}>
              {triggers.map((trigger) => (
                <TouchableOpacity
                  key={trigger.id}
                  style={styles.option}
                  onPress={() => toggleTrigger(trigger.id)}
                >
                  <View style={styles.checkbox}>
                    {selectedTriggers.has(trigger.id) && <View style={styles.checkboxFilled} />}
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionText}>{trigger.label}</Text>
                    <Text style={styles.optionCategory}>{TRIGGER_CATEGORIES[trigger.category as keyof typeof TRIGGER_CATEGORIES]}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>💡 This just sets defaults — you can change these anytime in settings</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => setShowSkipModal(true)}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showSkipModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSkipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Are you sure?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowSkipModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Add details</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleModalSkip}
              >
                <Text style={styles.modalButtonTextPrimary}>Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.title2,
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: colors.neutral.gray600,
    marginBottom: spacing.xxl,
  },
  loadingContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  optionsContainer: {
    gap: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  optionContent: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxFilled: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: colors.accent.purple,
  },
  optionText: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  optionCategory: {
    ...typography.caption,
    color: colors.neutral.gray600,
  },
  infoBox: {
    backgroundColor: colors.accent.blue + '20',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginTop: spacing.xl,
  },
  infoText: {
    ...typography.caption,
    color: colors.neutral.gray700,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    backgroundColor: colors.neutral.gray900,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    ...shadows.md,
    width: '100%',
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.neutral.white,
    fontSize: 17,
  },
  skipButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  skipButtonText: {
    ...typography.caption,
    color: colors.neutral.gray500,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalTitle: {
    ...typography.title3,
    color: colors.neutral.gray900,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalButtons: {
    gap: spacing.md,
  },
  modalButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: colors.neutral.gray900,
  },
  modalButtonSecondary: {
    backgroundColor: colors.neutral.gray200,
  },
  modalButtonTextPrimary: {
    ...typography.bodyBold,
    color: colors.neutral.white,
  },
  modalButtonTextSecondary: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepWrap: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  stepText: {
    ...typography.caption,
    color: colors.neutral.gray500,
  },
  progressTrack: {
    width: '60%',
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.neutral.gray200,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.accent.purple,
  },
  headerSpacer: {
    width: 40,
  },
});
