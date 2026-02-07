// app/onboarding/conditions.tsx
import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, Plus, X, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { searchConditions } from '@/lib/conditions-data';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';

export default function OnboardingConditions() {
  const router = useRouter();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [addedConditions, setAddedConditions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [showSkipModal, setShowSkipModal] = useState(false);

  const searchResults = searchQuery ? searchConditions(searchQuery) : [];

  const addCondition = async (name: string, description: string) => {
    if (!user || loading) return;

    setLoading(true);
    try {
      const { data: existingCondition } = await supabase
        .from('conditions')
        .select('id')
        .eq('name', name)
        .maybeSingle();

      let conditionId = existingCondition?.id;

      if (!conditionId) {
        const { data: newCondition } = await supabase
          .from('conditions')
          .insert({ name, description })
          .select('id')
          .single();
        conditionId = newCondition?.id;
      }

      if (conditionId) {
        await supabase.from('user_conditions').insert({
          user_id: user.id,
          condition_id: conditionId,
          status: 'exploring',
        });

        setAddedConditions([...addedConditions, name]);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error adding condition:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/onboarding/notifications');
  };

  const handleModalSkip = () => {
    setShowSkipModal(false);
    router.push('/onboarding/notifications');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.neutral.gray900} />
          </TouchableOpacity>

          <View style={styles.stepWrap}>
            <Text style={styles.stepText}>Step 2/3</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '66%' }]} />
            </View>
          </View>

          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Add a condition</Text>
          <Text style={styles.subtitle}>You can add more later, or skip this step</Text>

          <View style={styles.searchBar}>
            <Search size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a condition..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          {addedConditions.length > 0 && (
            <View style={styles.addedSection}>
              <Text style={styles.addedTitle}>Added:</Text>
              {addedConditions.map((condition, index) => (
                <View key={index} style={styles.addedItem}>
                  <Text style={styles.addedItemText}>{condition}</Text>
                </View>
              ))}
            </View>
          )}

          {searchQuery ? (
            <View style={styles.searchResults}>
              {searchResults.length > 0 ? (
                searchResults.slice(0, 20).map((result, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.searchResultItem}
                    onPress={() => addCondition(result.name, result.description)}
                    disabled={loading}
                  >
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultName}>{result.name}</Text>
                      <Text style={styles.searchResultDesc}>{result.description}</Text>
                    </View>
                    <Plus size={20} color="#6366f1" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.noResults}>
                  <Text style={styles.noResultsText}>No conditions found</Text>
                  <TouchableOpacity
                    style={styles.customButton}
                    onPress={() => addCondition(searchQuery, '')}
                    disabled={loading}
                  >
                    <Text style={styles.customButtonText}>Add "{searchQuery}" as custom</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {addedConditions.length > 0 ? (
          <>
            <TouchableOpacity style={styles.button} onPress={handleContinue}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.skipButtonSmall}
              onPress={() => setShowSkipModal(true)}
            >
              <Text style={styles.skipButtonSmallText}>Skip</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.skipLaterButton}
            onPress={() => setShowSkipModal(true)}
          >
            <Text style={styles.skipLaterButtonText}>Not sure yet / I'll add later</Text>
          </TouchableOpacity>
        )}
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
    marginBottom: spacing.xl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.neutral.gray900,
  },
  addedSection: {
    marginBottom: spacing.lg,
  },
  addedTitle: {
    ...typography.bodyBold,
    color: colors.neutral.gray700,
    marginBottom: spacing.sm,
  },
  addedItem: {
    backgroundColor: colors.accent.green + '20',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  addedItemText: {
    ...typography.body,
    color: colors.neutral.gray900,
  },
  searchResults: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  searchResultContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  searchResultName: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  searchResultDesc: {
    ...typography.caption,
    color: colors.neutral.gray600,
  },
  noResults: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noResultsText: {
    ...typography.body,
    color: colors.neutral.gray600,
    marginBottom: spacing.md,
  },
  customButton: {
    backgroundColor: colors.neutral.gray900,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  customButtonText: {
    ...typography.bodyBold,
    color: colors.neutral.white,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  skipLaterButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  skipLaterButtonText: {
    ...typography.body,
    color: colors.neutral.gray600,
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
  skipButtonSmall: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  skipButtonSmallText: {
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