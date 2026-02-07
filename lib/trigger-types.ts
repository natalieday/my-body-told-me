export interface Trigger {
  id: string;
  key: string;
  label: string;
  category: string;
  input_type: 'binary' | 'scale' | 'enum';
  options_json: {
    options?: string[];
    min?: number;
    max?: number;
    labels?: Record<string, string>;
  };
  is_active: boolean;
  parent_trigger_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface UserTrigger {
  id: string;
  user_id: string;
  trigger_id: string;
  enabled: boolean;
  sort_order: number;
  config_json: any;
  created_at: string;
  updated_at: string;
  trigger?: Trigger;
}

export interface TriggerLogValue {
  id: string;
  trigger_id: string;
  value: number | null;
  value_text: string | null;
  created_at: string;
}

export const TRIGGER_CATEGORIES = {
  sleep: 'Sleep',
  lifestyle: 'Lifestyle',
  activity: 'Activity',
  food: 'Food',
  medical: 'Medical',
  environment: 'Environment',
  menstrual: 'Menstrual Cycle',
} as const;
