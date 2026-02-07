import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekdays', label: 'Weekdays Only' },
  { value: 'weekends', label: 'Weekends Only' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'custom', label: 'Custom Days' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const SUGGESTION_MESSAGES = [
  'Log hydration today — it helps your migraines!',
  'Quick check-in: How\'s your back right now?',
  'Try logging one moment before bed tonight.',
  'Feel free to log a moment if something changes.',
  'Hey, remember to check your symptoms today 💛',
  'Time for your daily touchpoint!',
  'Don\'t forget to log your symptoms when you can.',
  'How are you feeling today?',
];

export default function AddNotificationScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams();

  const [message, setMessage] = useState('');
  const [time, setTime] = useState('09:00');
  const [frequency, setFrequency] = useState<string>('daily');
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: number) => {
    if (customDays.includes(day)) {
      setCustomDays(customDays.filter((d) => d !== day));
    } else {
      setCustomDays([...customDays, day].sort());
    }
  };

  const handleSave = async () => {
    if (!user || !message.trim()) {
      return;
    }

    if (frequency === 'custom' && customDays.length === 0) {
      alert('Please select at least one day for custom frequency.');
      return;
    }

    setSaving(true);
    try {
      const daysToSave = frequency === 'custom' ? customDays : [];

      const { error } = await supabase.from('custom_notifications').insert({
        user_id: user.id,
        message: message.trim(),
        time: time,
        frequency: frequency,
        days_of_week: daysToSave,
        is_enabled: true,
      });

      if (error) {
        console.error('Error saving notification:', error);
        alert('Failed to save notification');
        return;
      }

      router.back();
    } catch (error) {
      console.error('Error saving notification:', error);
      alert('Failed to save notification');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Reminder</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!message.trim() || saving}
          style={[styles.saveButton, (!message.trim() || saving) && styles.saveButtonDisabled]}
        >
          <Text style={[styles.saveButtonText, (!message.trim() || saving) && styles.saveButtonTextDisabled]}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Message</Text>
          <TextInput
            style={styles.messageInput}
            placeholder="Enter your custom reminder message..."
            placeholderTextColor="#9ca3af"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={200}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{message.length}/200</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suggestions</Text>
          <Text style={styles.sectionSubtitle}>Tap to use a suggestion:</Text>
          <View style={styles.suggestions}>
            {SUGGESTION_MESSAGES.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestionChip}
                onPress={() => setMessage(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time</Text>
          <TextInput
            style={styles.timeInput}
            value={time}
            onChangeText={setTime}
            placeholder="HH:MM"
            placeholderTextColor="#9ca3af"
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          />
          <Text style={styles.hint}>Format: 09:00 (24-hour format)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequency</Text>
          <View style={styles.frequencyOptions}>
            {FREQUENCY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.frequencyOption,
                  frequency === option.value && styles.frequencyOptionSelected,
                ]}
                onPress={() => setFrequency(option.value)}
              >
                {frequency === option.value && (
                  <View style={styles.checkIcon}>
                    <Check size={16} color="#6366f1" strokeWidth={3} />
                  </View>
                )}
                <Text
                  style={[
                    styles.frequencyOptionText,
                    frequency === option.value && styles.frequencyOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {frequency === 'custom' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Days</Text>
            <View style={styles.daysGrid}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayChip,
                    customDays.includes(day.value) && styles.dayChipSelected,
                  ]}
                  onPress={() => toggleDay(day.value)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      customDays.includes(day.value) && styles.dayChipTextSelected,
                    ]}
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewCard}>
            <Text style={styles.previewMessage}>
              {message || 'Your message will appear here'}
            </Text>
            <View style={styles.previewMeta}>
              <Text style={styles.previewTime}>{time}</Text>
              <Text style={styles.previewDot}>•</Text>
              <Text style={styles.previewFrequency}>
                {FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label || 'Daily'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  saveButtonTextDisabled: {
    color: '#9ca3af',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  messageInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  suggestions: {
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: '#4b5563',
  },
  timeInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
  },
  hint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  frequencyOptions: {
    gap: 8,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  frequencyOptionSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ddd6fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  frequencyOptionTextSelected: {
    color: '#6366f1',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  dayChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  dayChipTextSelected: {
    color: '#6366f1',
  },
  previewSection: {
    marginTop: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
  },
  previewMessage: {
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  previewMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTime: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  previewDot: {
    fontSize: 13,
    color: '#d1d5db',
  },
  previewFrequency: {
    fontSize: 13,
    color: '#6b7280',
  },
  spacer: {
    height: 40,
  },
});
