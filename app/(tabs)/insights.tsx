import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Sparkles,
  TrendingUp,
  AlertCircle,
  MessageCircle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { generateAIInsights } from '@/lib/ai-insights';
import { UserCondition } from '@/lib/types';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';
import { Card } from '@/components/Card';

interface Pattern {
  id: string;
  headline: string;
  explanation: string;
  conditionId?: string;
}

interface ConditionInsight {
  conditionName: string;
  conditionId: string;
  insights: string[];
}

interface InsufficientDataNotice {
  id: string;
  message: string;
}

export default function InsightsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [featuredInsight, setFeaturedInsight] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [conditionInsights, setConditionInsights] = useState<ConditionInsight[]>([]);
  const [insufficientData, setInsufficientData] = useState<InsufficientDataNotice[]>([]);
  const [expandedConditions, setExpandedConditions] = useState<Set<string>>(new Set());
  const [hasEnoughData, setHasEnoughData] = useState(false);

  useEffect(() => {
    if (user) {
      loadInsights();
    }
  }, [user]);

  const loadInsights = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { count: logCount } = await supabase
        .from('daily_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: momentCount } = await supabase
        .from('moment_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const totalLogs = (logCount || 0) + (momentCount || 0);
      setHasEnoughData(totalLogs >= 3);

      if (totalLogs < 3) {
        setInsufficientData([
          {
            id: '1',
            message: `You have ${totalLogs} log${totalLogs !== 1 ? 's' : ''}. Log at least 3 days to see AI insights.`,
          },
        ]);
      } else {
        const { data: insights } = await supabase
          .from('ai_insights')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (insights) {
          parseInsights(insights.insights_text);
        } else {
          await generateNewInsights();
        }
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewInsights = async () => {
    if (!user) return;

    try {
      const result = await generateAIInsights(user.id, 30);
      if (result.insights) {
        parseInsights(result.insights);
      }
    } catch (error) {
      console.error('Error generating insights:', error);
    }
  };

  const parseInsights = (insightsText: string) => {
    const lines = insightsText.split('\n').filter((l) => l.trim());

    if (lines.length > 0) {
      setFeaturedInsight(lines[0].replace(/^[-•*]\s*/, ''));
    }

    const patternList: Pattern[] = [];
    lines.slice(1, 5).forEach((line, idx) => {
      const cleaned = line.replace(/^[-•*]\s*/, '');
      if (cleaned) {
        patternList.push({
          id: `pattern-${idx}`,
          headline: cleaned.split('.')[0],
          explanation: cleaned,
        });
      }
    });
    setPatterns(patternList);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  const toggleCondition = (conditionId: string) => {
    const newExpanded = new Set(expandedConditions);
    if (newExpanded.has(conditionId)) {
      newExpanded.delete(conditionId);
    } else {
      newExpanded.add(conditionId);
    }
    setExpandedConditions(newExpanded);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Sparkles size={28} color="#6366f1" strokeWidth={2} />
          <Text style={styles.title}>Insights</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Analyzing your data...</Text>
          </View>
        ) : !hasEnoughData ? (
          <View style={styles.emptyState}>
            <Sparkles size={64} color="#d1d5db" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Not Enough Data Yet</Text>
            <Text style={styles.emptySubtitle}>
              Keep logging your symptoms and daily touchpoints. AI insights will appear
              once you have at least 3 entries.
            </Text>
            {insufficientData.map((notice) => (
              <View key={notice.id} style={styles.insufficientCard}>
                <AlertCircle size={20} color="#f59e0b" strokeWidth={2} />
                <Text style={styles.insufficientText}>{notice.message}</Text>
              </View>
            ))}
          </View>
        ) : (
          <>
            {featuredInsight && (
              <View style={styles.featuredCard}>
                <View style={styles.featuredHeader}>
                  <Sparkles size={24} color="#6366f1" strokeWidth={2} />
                  <Text style={styles.featuredLabel}>Featured Insight</Text>
                </View>
                <Text style={styles.featuredText}>{featuredInsight}</Text>
              </View>
            )}

            {patterns.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pattern Detection</Text>
                <View style={styles.patternsList}>
                  {patterns.map((pattern) => (
                    <TouchableOpacity
                      key={pattern.id}
                      style={styles.patternCard}
                      activeOpacity={0.7}
                    >
                      <View style={styles.patternIcon}>
                        <TrendingUp size={20} color="#6366f1" strokeWidth={2} />
                      </View>
                      <View style={styles.patternContent}>
                        <Text style={styles.patternHeadline}>{pattern.headline}</Text>
                        <Text style={styles.patternExplanation}>
                          {pattern.explanation}
                        </Text>
                      </View>
                      <ChevronRight size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {conditionInsights.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Condition-Specific Insights</Text>
                <View style={styles.conditionsList}>
                  {conditionInsights.map((condition) => (
                    <View key={condition.conditionId} style={styles.conditionCard}>
                      <TouchableOpacity
                        style={styles.conditionHeader}
                        onPress={() => toggleCondition(condition.conditionId)}
                      >
                        <Text style={styles.conditionName}>
                          {condition.conditionName}
                        </Text>
                        {expandedConditions.has(condition.conditionId) ? (
                          <ChevronDown size={20} color="#6b7280" />
                        ) : (
                          <ChevronRight size={20} color="#6b7280" />
                        )}
                      </TouchableOpacity>
                      {expandedConditions.has(condition.conditionId) && (
                        <View style={styles.conditionInsights}>
                          {condition.insights.map((insight, idx) => (
                            <View key={idx} style={styles.conditionInsightItem}>
                              <View style={styles.bulletDot} />
                              <Text style={styles.conditionInsightText}>{insight}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.amaButton}
              onPress={() => router.push('/insights-ama')}
            >
              <MessageCircle size={24} color="white" strokeWidth={2} />
              <Text style={styles.amaButtonText}>Ask Me Anything</Text>
            </TouchableOpacity>

            <View style={{ height: 100 }} />
          </>
        )}
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
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.hero,
    color: colors.neutral.gray900,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.neutral.gray600,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.title1,
    color: colors.neutral.gray900,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.neutral.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  insufficientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.primary.peach,
    borderRadius: borderRadius.lg,
    width: '100%',
    ...shadows.sm,
  },
  insufficientText: {
    flex: 1,
    ...typography.body,
    color: colors.neutral.gray900,
    lineHeight: 20,
  },
  featuredCard: {
    backgroundColor: colors.primary.lavender,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  featuredLabel: {
    ...typography.captionBold,
    color: colors.accent.purple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featuredText: {
    ...typography.title3,
    color: colors.neutral.gray900,
    lineHeight: 26,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.title2,
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
  },
  patternsList: {
    gap: spacing.md,
  },
  patternCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  patternIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  patternContent: {
    flex: 1,
  },
  patternHeadline: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: 4,
  },
  patternExplanation: {
    ...typography.caption,
    color: colors.neutral.gray600,
    lineHeight: 20,
  },
  conditionsList: {
    gap: spacing.md,
  },
  conditionCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  conditionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  conditionName: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
  },
  conditionInsights: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  conditionInsightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent.purple,
    marginTop: 7,
  },
  conditionInsightText: {
    flex: 1,
    ...typography.caption,
    color: colors.neutral.gray700,
    lineHeight: 20,
  },
  amaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.gray900,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    ...shadows.md,
  },
  amaButtonText: {
    ...typography.bodyBold,
    color: colors.neutral.white,
  },
});
