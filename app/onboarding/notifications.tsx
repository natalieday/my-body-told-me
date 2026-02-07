// app/onboarding/notifications.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';

type NotificationPreference = 'daily' | 'occasional' | 'none';

export default function OnboardingNotifications() {
  const router = useRouter();
  const { user } = useAuth();

  const [preference, setPreference] = useState<NotificationPreference | null>(null);
  const [continueError, setContinueError] = useState('');
  const [showSkipModal, setShowSkipModal] = useState(false);

  const handleSelect = async (pref: NotificationPreference) => {
    setContinueError('');
    setPreference(pref);

    if (user) {
      await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
    }
  };

  const handleContinue = () => {
    setContinueError('');
    if (!preference) {
      setContinueError('Error — select an option before continuing');
      return;
    }
    router.push('/onboarding/complete');
  };

  const handleModalSkip = () => {
    setShowSkipModal(false);
    router.push('/onboarding/complete');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.neutral.gray900} />
          </TouchableOpacity>

          <View style={styles.stepWrap}>
            <Text style={styles.stepText}>Step 3/3</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Would reminders help?</Text>
          <Text style={styles.subtitle}>You can always change this later</Text>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[styles.option, preference === 'daily' && styles.optionSelected]}
              onPress={() => handleSelect('daily')}
            >
              <Text style={[styles.optionText, preference === 'daily' && styles.optionTextSelected]}>
                Daily check-in
              </Text>
              <Text style={styles.optionSubtext}>
                A daily reminder to log how you're feeling
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, preference === 'occasional' && styles.optionSelected]}
              onPress={() => handleSelect('occasional')}
            >
              <Text style={[styles.optionText, preference === 'occasional' && styles.optionTextSelected]}>
                Occasional reminders
              </Text>
              <Text style={styles.optionSubtext}>
                A few reminders per week when helpful
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.option, preference === 'none' && styles.optionSelected]}
              onPress={() => handleSelect('none')}
            >
              <Text style={[styles.optionText, preference === 'none' && styles.optionTextSelected]}>
                No reminders
              </Text>
              <Text style={styles.optionSubtext}>
                I'll check in when it feels right
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

        {continueError ? (
          <Text style={styles.continueErrorText}>{continueError}</Text>
        ) : null}
        {/*
        <TouchableOpacity style={styles.skipButton} onPress={() => setShowSkipModal(true)}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        */}
      </View>

      <Modal
        visible={showSkipModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSkipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Are you sure you want to skip?</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowSkipModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Choose an option</Text>
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
    height: Platform.OS === 'ios' ? 104 : 72,
    justifyContent: 'center',
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
  optionsContainer: {
    gap: spacing.md,
  },
  option: {
    backgroundColor: colors.neutral.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
    ...shadows.sm,
  },
  optionSelected: {
    borderColor: colors.accent.purple,
    backgroundColor: colors.accent.purple + '10',
  },
  optionText: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  optionTextSelected: {
    color: colors.accent.purple,
  },
  optionSubtext: {
    ...typography.caption,
    color: colors.neutral.gray600,
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
  continueErrorText: {
    ...typography.caption,
    color: colors.accent.red,
    marginTop: spacing.sm,
    textAlign: 'center',
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
    justifyContent: 'center',
    gap: spacing.xs,
  },
  stepText: {
    ...typography.caption,
    color: colors.neutral.gray500,
    lineHeight: 14,
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