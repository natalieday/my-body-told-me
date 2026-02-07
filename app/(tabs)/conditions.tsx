import { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { Search, Plus, ChevronRight } from 'lucide-react-native';
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

export default function ConditionsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conditions, setConditions] = useState<UserCondition[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (user) {
      loadConditions();
    }
  }, [user]);

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
        <Text style={styles.title}>Conditions</Text>
      </View>

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
        <ScrollView style={styles.searchResults}>
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
            <View style={styles.emptySearch}>
              <Text style={styles.emptySearchText}>No conditions found</Text>
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
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
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
                          { backgroundColor: `${STATUS_COLORS[condition.status]}20` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: STATUS_COLORS[condition.status] },
                          ]}
                        >
                          {STATUS_LABELS[condition.status]}
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  title: {
    ...typography.hero,
    color: colors.neutral.gray900,
  },
  searchSection: {
    padding: spacing.md,
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.gray100,
    borderRadius: borderRadius.lg,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.neutral.gray900,
  },
  searchResults: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray100,
  },
  searchResultContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  searchResultName: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: 4,
  },
  searchResultDesc: {
    ...typography.caption,
    color: colors.neutral.gray600,
  },
  emptySearch: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptySearchText: {
    ...typography.body,
    color: colors.neutral.gray600,
    marginBottom: spacing.md,
  },
  customButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary.lavender,
    borderRadius: borderRadius.md,
  },
  customButtonText: {
    ...typography.captionBold,
    color: colors.accent.purple,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    ...typography.title2,
    color: colors.neutral.gray900,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.caption,
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
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.neutral.gray900,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
});
