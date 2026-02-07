import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Settings, Search, Plus, ChevronRight } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserCondition, ConditionStatus } from '@/lib/types';
import { searchConditions } from '@/lib/conditions-data';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';

const STATUS_LABELS: Record<ConditionStatus, string> = {
  diagnosed: 'Diagnosed',
  likely: 'Likely',
  exploring: 'Exploring',
  monitoring: 'Monitoring',
};

const STATUS_COLORS: Record<ConditionStatus, string> = {
  diagnosed: colors.accent.green,
  likely: colors.accent.orange,
  exploring: colors.accent.purple,
  monitoring: colors.accent.blue,
};

export default function AccountScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conditions, setConditions] = useState<UserCondition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      loadConditions();
    }, [user])
  );
  
  const loadUserData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('display_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data?.display_name) {
        setDisplayName(data.display_name);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadConditions = async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await supabase
      .from('user_conditions')
      .select('*, condition:conditions(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setConditions(data as any);
    }
    setLoading(false);
  };

  const handleLogMoment = (conditionId: string) => {
    router.push({
      pathname: '/moment-log',
      params: { preselectedCondition: conditionId },
    });
  };

  const handleConditionPress = (conditionId: string) => {
    router.push({
      pathname: '/condition-detail',
      params: { id: conditionId },
    });
  };

  const searchResults = searchQuery ? searchConditions(searchQuery) : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Account</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings-detail')}
        >
          <Settings size={24} color={colors.neutral.gray900} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.nameSection}>
          <Text style={styles.userName}>{displayName || user?.email?.split('@')[0] || 'User'}</Text>
        </View>

        <View style={styles.conditionsSection}>
          <View style={styles.searchSection}>
            <View style={styles.searchBar}>
              <Search size={20} color="#9ca3af" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a condition..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => setShowSearch(true)}
              />
            </View>
          </View>

          {showSearch && searchQuery ? (
            <View style={styles.searchResults}>
              <ScrollView nestedScrollEnabled>
                {searchResults.length > 0 ? (
                  searchResults.slice(0, 20).map((result, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.searchResultItem}
                      onPress={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                        router.push({
                          pathname: '/add-condition',
                          params: { name: result.name, description: result.description },
                        });
                      }}
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
                      onPress={() => {
                        setShowSearch(false);
                        router.push({
                          pathname: '/add-condition',
                          params: { name: searchQuery, description: '' },
                        });
                      }}
                    >
                      <Text style={styles.customButtonText}>Add "{searchQuery}" as custom</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          ) : (
            <>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#6366f1" />
                </View>
              ) : conditions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>No conditions tracked yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Search above to add your first condition
                  </Text>
                </View>
              ) : (
                <View style={styles.conditionsList}>
                  {conditions.map((condition) => (
                    <View key={condition.id} style={styles.conditionRow}>
                      <TouchableOpacity
                        style={styles.conditionMain}
                        onPress={() => handleConditionPress(condition.id)}
                      >
                        <View style={styles.conditionInfo}>
                          <Text style={styles.conditionName}>
                            {condition.condition?.name || condition.custom_label}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              condition.is_cycle || condition.condition?.is_cycle
                                ? { backgroundColor: '#fce7f320' }
                                : { backgroundColor: `${STATUS_COLORS[condition.status]}20` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusText,
                                condition.is_cycle || condition.condition?.is_cycle
                                  ? { color: '#ec4899' }
                                  : { color: STATUS_COLORS[condition.status] },
                              ]}
                            >
                              {condition.is_cycle || condition.condition?.is_cycle
                                ? 'Cycle'
                                : STATUS_LABELS[condition.status]}
                            </Text>
                          </View>
                        </View>
                        <ChevronRight size={20} color="#9ca3af" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.logButton}
                        onPress={() => handleLogMoment(condition.id)}
                      >
                        <Plus size={18} color="#6366f1" strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary.cream,
  },
  title: {
    ...typography.title1,
    color: colors.neutral.gray900,
  },
  settingsButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  nameSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  userName: {
    ...typography.title1,
    fontSize: 32,
    color: colors.neutral.gray900,
  },
  conditionsSection: {
    flex: 1,
  },
  searchSection: {
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.neutral.gray900,
  },
  searchResults: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    maxHeight: 400,
    overflow: 'hidden',
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
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.title3,
    color: colors.neutral.gray900,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
  conditionsList: {
    gap: spacing.md,
  },
  conditionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
    minHeight: 80,
  },
  conditionMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingRight: spacing.xs,
  },
  conditionInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  conditionName: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
  },
  logButton: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.mint,
    borderLeftWidth: 1,
    borderLeftColor: colors.neutral.gray200,
  },
});
