export interface Condition {
  id: string;
  name: string;
  description: string;
  is_cycle?: boolean;
}

export type ConditionStatus = 'diagnosed' | 'likely' | 'exploring' | 'monitoring';

export interface UserCondition {
  id: string;
  user_id: string;
  condition_id: string;
  custom_label: string | null;
  status: ConditionStatus;
  notes: string | null;
  created_at: string;
  is_cycle?: boolean;
  condition?: Condition;
}

export type MoodTag = 'good' | 'neutral' | 'tough' | 'fluctuating';

export interface DailyLog {
  id: string;
  user_id: string;
  date: string;
  mood_tag: MoodTag | null;
  overall_severity: number | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  activity_level: string | null;
  food_notes: string | null;
  meds_notes: string | null;
  triggers: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyLogCondition {
  id: string;
  daily_log_id: string;
  user_condition_id: string;
  severity: number | null;
  notes: string | null;
}

export interface UserProfile {
  id: string;
  email: string;
  current_streak: number;
  longest_streak: number;
  last_log_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIInsight {
  id: string;
  user_id: string;
  insights_text: string;
  insight_date: string;
  created_at: string;
}

export interface MomentLog {
  id: string;
  user_id: string;
  timestamp: string;
  date: string;
  overall_severity: number | null;
  activity: string | null;
  triggers: string | null;
  notes: string | null;
  created_at: string;
}

export interface MomentLogCondition {
  id: string;
  moment_log_id: string;
  user_condition_id: string;
  severity: number | null;
  notes: string | null;
}

export interface SubSymptom {
  id: string;
  user_condition_id: string;
  name: string;
  created_at: string;
}
