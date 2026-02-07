// app/(tabs)/dashboard.tsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Clock } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { UserProfile, DailyLog, UserCondition, MoodTag } from '@/lib/types';
import { Card } from '@/components/Card';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';

const MOOD_EMOJIS: Record<MoodTag, string> = {
  good: '😊',
  neutral: '😐',
  tough: '😣',
  fluctuating: '🌧',
};

const MOOD_COLORS: Record<MoodTag, string> = {
  good: '#10b981',
  neutral: '#6b7280',
  tough: '#ef4444',
  fluctuating: '#f59e0b',
};

function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getSeverityColor(sev: number | null | undefined) {
  if (sev === null || sev === undefined) return null;

  // 0 = green, 4-6 = orange, 7-10 = red
  if (sev <= 3) return colors.accent.green;   // green
  if (sev <= 6) return '#f59e0b';             // orange (or add to design-system)
  return '#ef4444';                            // red
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [conditions, setConditions] = useState<UserCondition[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [todayLog, setTodayLog] = useState<DailyLog | null>(null);
  const [todayCheckInCount, setTodayCheckInCount] = useState(0);
  const [latestInsight, setLatestInsight] = useState<string>('');
  //const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, currentMonth]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      const start = ymdLocal(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
      );
      
      const end = ymdLocal(
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      );
      
      const { data: logsData } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false });

      if (logsData) {
        setLogs(logsData);

        const today = ymdLocal(new Date());
        const todayLogData = logsData.find((log) => log.date === today);
        setTodayLog(todayLogData || null);

        const { data: momentLogsData } = await supabase
          .from('moment_logs')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', today);
        
        const quickCount = momentLogsData?.length || 0;
        const dailyCount = todayLogData ? 1 : 0;
        
        setTodayCheckInCount(dailyCount + quickCount);
      }

      const { data: conditionsData } = await supabase
        .from('user_conditions')
        .select('*, condition:conditions(*)')
        .eq('user_id', user.id);

      if (conditionsData) {
        setConditions(conditionsData as any);
      }

      const { data: insightData } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (insightData) {
        const firstLine = insightData.insights_text.split('\n')[0];
        setLatestInsight(firstLine.replace(/^[•\-*]\s*/, ''));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (number | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const getLogForDate = (day: number | null) => {
    if (!day) return null;
    const dateStr = ymdLocal(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    );
    
    return logs.find((log) => log.date === dateStr);
  };

  const isToday = (day: number | null) => {
    if (!day) return false;
  
    const todayStr = ymdLocal(new Date());
    const dayStr = ymdLocal(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    );
  
    return dayStr === todayStr;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const days = getDaysInMonth();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.checkInButton}
          onPress={() => router.push('/(tabs)/today')}
          activeOpacity={0.85}
        >
          <Plus size={18} color="white" strokeWidth={2.5} />
          <Text style={styles.checkInButtonText}>Check In</Text>
        </TouchableOpacity>

        <View style={styles.cardsGrid}>
          <Card color={colors.primary.lavender} style={styles.streakCard}>
            <View style={styles.streakContent}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <View style={styles.streakInfo}>
                <Text style={styles.streakNumber}>{profile?.current_streak || 0}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>
            </View>
          </Card>

          <Card color={colors.primary.peach} style={styles.momentCard}>
            <View style={styles.momentContent}>
              <Clock size={32} color={colors.neutral.gray800} strokeWidth={2} />
              <View style={styles.momentInfo}>
                <Text style={styles.momentNumber}>{todayCheckInCount}</Text>
                <Text style={styles.momentLabel}>
                  {todayCheckInCount === 1 ? 'check-in' : 'check-ins'} today
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {todayLog && todayLog.mood_tag && (
          <Card color={colors.primary.mint} style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Text style={styles.todayTitle}>Today's Check In</Text>
              <Text style={styles.todayMood}>{MOOD_EMOJIS[todayLog.mood_tag]}</Text>
            </View>
            {todayLog.overall_severity !== null && todayLog.overall_severity !== undefined && (
              <View style={styles.severityRow}>
                <Text style={styles.severityLabel}>Severity</Text>
                <Text style={styles.severityValue}>{todayLog.overall_severity}/10</Text>
              </View>
            )}
          </Card>
        )}

        <View style={styles.calendarSection}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              onPress={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                )
              }
            >
              <Text style={styles.calendarNavText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {currentMonth.toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <TouchableOpacity
              onPress={() =>
                setCurrentMonth(
                  new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                )
              }
            >
              <Text style={styles.calendarNavText}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekDaysRow}>
            {weekDays.map((day, i) => (
              <View key={i} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {days.map((day, index) => {
              const log = getLogForDate(day);
              const isTodayDate = isToday(day);
          
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.dayCell}
                  onPress={() => {
                    if (day && log) router.push('/history');
                  }}
                  disabled={!day || !log}
                >
                  <View
                    style={[
                      styles.dayInner,
                      isTodayDate && styles.todayInner,
                      isTodayDate && styles.todayCell,
                    ]}
                  >
                  {day ? (
                    <>
                      <Text style={[styles.dayNumber, isTodayDate && styles.todayNumber]}>
                        {day}
                      </Text>
                  
                      <View style={styles.indicatorSlot}>
                        {log?.overall_severity !== null && log?.overall_severity !== undefined ? (
                          <View
                            style={[
                              styles.severityDot,
                              { backgroundColor: getSeverityColor(log.overall_severity)! },
                            ]}
                          />
                        ) : (
                          <View style={styles.noDataDot} />
                        )}
                      </View>
                    </>
                  ) : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {latestInsight && (
          <View style={styles.insightCard}>
            <Text style={styles.insightText}>{latestInsight}</Text>
            <TouchableOpacity onPress={() => router.push('/history')}>
              <Text style={styles.viewAllLink}>View all insights →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* <View style={styles.conditionsSection}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.conditionsScroll}
          >
            {conditions.map((condition) => {
              const todayConditionLog = todayLog
                ? logs.find((l) => l.id === todayLog.id)
                : null;

              return (
                <TouchableOpacity
                  key={condition.id}
                  style={styles.conditionCard}
                  onPress={() => router.push('/history')}
                >
                  <Text style={styles.conditionName}>
                    {condition.condition?.name}
                  </Text>
                  {todayLog && (
                    <Text style={styles.conditionSeverity}>
                      Logged today
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View> */}

        <View style={{ height: 100 }} />
      </ScrollView>

    </View>
  );
}

const CELL_HEIGHT = 46;
const INNER_SIZE = 36;
const INDICATOR_HEIGHT = 20;
const TODAY_INNER_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.cream,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingBottom: 100,
  },
  header: {
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.hero,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.neutral.gray600,
  },
  cardsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  streakCard: {
    flex: 1,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakEmoji: {
    fontSize: 40,
  },
  streakInfo: {
    flex: 1,
  },
  streakNumber: {
    ...typography.title1,
    color: colors.neutral.gray900,
    marginBottom: 2,
  },
  streakLabel: {
    ...typography.caption,
    color: colors.neutral.gray700,
  },
  momentCard: {
    flex: 1,
  },
  momentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  momentInfo: {
    flex: 1,
  },
  momentNumber: {
    ...typography.title1,
    color: colors.neutral.gray900,
    marginBottom: 2,
  },
  momentLabel: {
    ...typography.caption,
    color: colors.neutral.gray700,
  },
  todayCard: {
    marginBottom: spacing.lg,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  todayTitle: {
    ...typography.title3,
    color: colors.neutral.gray900,
  },
  todayMood: {
    fontSize: 32,
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  severityLabel: {
    ...typography.body,
    color: colors.neutral.gray700,
  },
  severityValue: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
  },
  calendarSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthTitle: {
    ...typography.title3,
    color: colors.neutral.gray900,
  },
  calendarNavText: {
    fontSize: 24,
    color: colors.accent.purple,
    paddingHorizontal: 12,
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  weekDayText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.neutral.gray500,
    textAlign: 'center',
  },
  todayCell: {
    backgroundColor: colors.primary.lavender,
    //borderRadius: borderRadius.sm,
  },
  dayNumber: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.neutral.gray900,
    marginBottom: 2,
    //lineHeight: 14,
    textAlign: 'center',
  },
  todayNumber: {
    color: colors.accent.purple,
  },
  moodEmoji: {
    fontSize: 20,
    lineHeight: 20,
    textAlign: 'center',
  },
  noDataDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.neutral.gray300,
  },
  insightCard: {
    backgroundColor: colors.primary.sage,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  insightText: {
    ...typography.body,
    color: colors.neutral.gray900,
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  viewAllLink: {
    ...typography.captionBold,
    color: colors.accent.purple,
  },
  conditionsSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.title3,
    color: colors.neutral.gray900,
    marginBottom: spacing.md,
  },
  conditionsScroll: {
    gap: spacing.md,
  },
  conditionCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    width: 140,
    ...shadows.sm,
  },
  conditionName: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  conditionSeverity: {
    ...typography.caption,
    color: colors.accent.green,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: 40,
  },
  modalTitle: {
    ...typography.title2,
    color: colors.neutral.gray900,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral.gray50,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.lavender,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modalTextContainer: {
    flex: 1,
  },
  modalOptionTitle: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: 4,
  },
  modalOptionDesc: {
    ...typography.caption,
    color: colors.neutral.gray600,
    lineHeight: 18,
  },
  modalCancel: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  modalCancelText: {
    ...typography.bodyBold,
    color: colors.neutral.gray600,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  dayCell: {
    width: '14.2857%', // 100 / 7
    height: CELL_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: INNER_SIZE,
    height: INNER_SIZE,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayCell: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  indicatorSlot: {
    height: INDICATOR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayInner: {
    width: TODAY_INNER_SIZE,
    height: TODAY_INNER_SIZE,
    borderRadius: 12, // slightly rounder since it's bigger
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutral.gray900,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  checkInButtonText: {
    ...typography.bodyBold,
    color: colors.neutral.white,
  },
  severityIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  
  severityMiniText: {
    ...typography.small,
    fontWeight: '700',
    color: colors.neutral.gray700,
    fontSize: 11,
    lineHeight: 12,
  },
});
