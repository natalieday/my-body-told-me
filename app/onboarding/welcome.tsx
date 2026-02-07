// app/onboarding/welcome.tsx
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Lock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';

export default function OnboardingWelcome() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [continueError, setContinueError] = useState('');

  const handleContinue = async () => {
    setContinueError('');

    if (!name.trim()) {
      setContinueError('Enter your name before continuing');
      return;
    }

    if (user) {
      await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user.id,
            display_name: name,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
    }

    router.push('/onboarding/tracking');
  };

  const handleModalSkip = async () => {
    setShowSkipModal(false);
    router.push('/onboarding/tracking');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>My Body Told Me</Text>
          <Text style={styles.subtitle}>Take note of your body's messages.</Text>

          <View style={styles.trustSection}>
            <Lock size={16} color={colors.neutral.gray600} />
            <View style={styles.trustText}>
              <Text style={styles.trustTitle}>Private by default</Text>
              <Text style={styles.trustSubtitle}>Just between you and your body.</Text>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>What's your name?</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>

          {continueError ? (
            <Text style={styles.continueErrorText}>{continueError}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => setShowSkipModal(true)}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showSkipModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSkipModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>Are you sure?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => setShowSkipModal(false)}
              >
                <Text style={styles.modalButtonTextSecondary}>Add my name</Text>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.primary.cream,
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 80 : spacing.xxl,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
  },
  title: {
    ...typography.title1,
    fontSize: 36,
    color: colors.neutral.gray900,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  trustSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.neutral.white,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xxl,
    gap: spacing.md,
    ...shadows.sm,
  },
  trustText: {
    flex: 1,
  },
  trustTitle: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  trustSubtitle: {
    ...typography.caption,
    color: colors.neutral.gray600,
  },
  inputSection: {
    marginTop: spacing.xl,
  },
  inputLabel: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.neutral.gray900,
    borderWidth: 2,
    borderColor: colors.neutral.gray200,
    ...shadows.sm,
  },
  buttonContainer: {
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
  modalText: {
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
});