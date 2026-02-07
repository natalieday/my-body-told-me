import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';
import { Trigger, TRIGGER_CATEGORIES } from '@/lib/trigger-types';

interface TriggerWithStatus extends Trigger {
  enabled: boolean;
  userTriggerId?: string;
}

export default function SettingsTriggersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [triggers, setTriggers] = useState<TriggerWithStatus[]>([]);
  const [subTriggers, setSubTriggers] = useState<Record<string, TriggerWithStatus[]>>({});

  useEffect(() => {
    if (user) {
      loadTriggers();
    }
  }, [user]);

  const loadTriggers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: allTriggers } = await supabase
        .from('triggers')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      const { data: userTriggers } = await supabase
        .from('user_triggers')
        .select('*')
        .eq('user_id', user.id);

      const enabledMap = new Map(
        userTriggers?.map(ut => [ut.trigger_id, { enabled: ut.enabled, id: ut.id }]) || []
      );

      const parentTriggers: TriggerWithStatus[] = [];
      const childTriggersMap: Record<string, TriggerWithStatus[]> = {};

      allTriggers?.forEach(trigger => {
        const status = enabledMap.get(trigger.id);
        const triggerWithStatus = {
          ...trigger,
          enabled: status?.enabled || false,
          userTriggerId: status?.id,
        };

        if (trigger.parent_trigger_id) {
          if (!childTriggersMap[trigger.parent_trigger_id]) {
            childTriggersMap[trigger.parent_trigger_id] = [];
          }
          childTriggersMap[trigger.parent_trigger_id].push(triggerWithStatus);
        } else {
          parentTriggers.push(triggerWithStatus);
        }
      });

      setTriggers(parentTriggers);
      setSubTriggers(childTriggersMap);
    } catch (error) {
      console.error('Error loading triggers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrigger = async (triggerId: string, currentEnabled: boolean, userTriggerId?: string) => {
    if (!user) return;

    try {
      if (userTriggerId) {
        await supabase
          .from('user_triggers')
          .update({ enabled: !currentEnabled, updated_at: new Date().toISOString() })
          .eq('id', userTriggerId);
      } else {
        await supabase.from('user_triggers').insert({
          user_id: user.id,
          trigger_id: triggerId,
          enabled: true,
          sort_order: 0,
        });
      }

      await loadTriggers();
    } catch (error) {
      console.error('Error toggling trigger:', error);
    }
  };

  const groupedTriggers = triggers.reduce((acc, trigger) => {
    if (!acc[trigger.category]) {
      acc[trigger.category] = [];
    }
    acc[trigger.category].push(trigger);
    return acc;
  }, {} as Record<string, TriggerWithStatus[]>);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={colors.neutral.gray900} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Triggers</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.purple} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={colors.neutral.gray900} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Triggers</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageDescription}>
          Choose which triggers you want to track. You can always adjust these later.
        </Text>

        {Object.entries(groupedTriggers).map(([category, categoryTriggers]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {TRIGGER_CATEGORIES[category as keyof typeof TRIGGER_CATEGORIES]}
            </Text>
            <View style={styles.triggersCard}>
              {categoryTriggers.map((trigger, index) => (
                <View key={trigger.id}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.triggerRow}>
                    <View style={styles.triggerInfo}>
                      <Text style={styles.triggerLabel}>{trigger.label}</Text>
                      <Text style={styles.triggerType}>
                        {trigger.input_type === 'binary' ? 'Yes/No' :
                         trigger.input_type === 'scale' ? 'Scale 0-5' :
                         'Multiple options'}
                      </Text>
                    </View>
                    <Switch
                      value={trigger.enabled}
                      onValueChange={() => toggleTrigger(trigger.id, trigger.enabled, trigger.userTriggerId)}
                      trackColor={{ false: colors.neutral.gray300, true: colors.accent.purple + '40' }}
                      thumbColor={trigger.enabled ? colors.accent.purple : colors.neutral.gray100}
                    />
                  </View>

                  {trigger.enabled && subTriggers[trigger.id] && (
                    <View style={styles.subTriggersContainer}>
                      {subTriggers[trigger.id].map((subTrigger, subIndex) => (
                        <View key={subTrigger.id}>
                          {subIndex > 0 && <View style={styles.subDivider} />}
                          <View style={styles.subTriggerRow}>
                            <View style={styles.triggerInfo}>
                              <Text style={styles.subTriggerLabel}>{subTrigger.label}</Text>
                              <Text style={styles.triggerType}>
                                {subTrigger.input_type === 'scale' ? 'Scale 0-5' : 'Multiple options'}
                              </Text>
                            </View>
                            <Switch
                              value={subTrigger.enabled}
                              onValueChange={() => toggleTrigger(subTrigger.id, subTrigger.enabled, subTrigger.userTriggerId)}
                              trackColor={{ false: colors.neutral.gray300, true: colors.accent.purple + '40' }}
                              thumbColor={subTrigger.enabled ? colors.accent.purple : colors.neutral.gray100}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 50 }} />
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.title3,
    color: colors.neutral.gray900,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  pageDescription: {
    ...typography.body,
    color: colors.neutral.gray600,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typography.bodyBold,
    fontSize: 18,
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
  },
  triggersCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  triggerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  triggerLabel: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  triggerType: {
    ...typography.caption,
    color: colors.neutral.gray600,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.gray200,
    marginHorizontal: spacing.lg,
  },
  subTriggersContainer: {
    backgroundColor: colors.neutral.gray50,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.md,
    paddingTop: spacing.sm,
  },
  subTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  subTriggerLabel: {
    ...typography.body,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  subDivider: {
    height: 1,
    backgroundColor: colors.neutral.gray200,
    marginHorizontal: spacing.md,
  },
});
