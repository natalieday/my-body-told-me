import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/lib/auth';
import { useRouter } from 'expo-router';
import {
  User,
  Bell,
  FileDown,
  Shield,
  Database,
  Palette,
  ChevronRight,
  Plus,
  X,
  Clock,
  Calendar,
  Trash2,
  Download,
  ChevronLeft,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { seedDemoData, clearAllUserData } from '@/lib/seed-demo-data';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  display_name?: string;
  profile_picture_url?: string;
  track_menstrual_cycle?: boolean;
}

interface CustomNotification {
  id: string;
  message: string;
  time: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';
  days_of_week: number[];
  is_enabled: boolean;
}

export default function SettingsDetailScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'auto',
    timezone: 'UTC',
  });
  const [notifications, setNotifications] = useState<CustomNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
      loadNotifications();
    }
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading preferences:', error);
        return;
      }

      if (data) {
        setPreferences({
          theme: data.theme as 'light' | 'dark' | 'auto',
          timezone: data.timezone,
          display_name: data.display_name,
          profile_picture_url: data.profile_picture_url,
          track_menstrual_cycle: data.track_menstrual_cycle || false,
        });
        setDisplayName(data.display_name || '');
      } else {
        await supabase.from('user_preferences').insert({
          user_id: user.id,
          theme: 'auto',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('custom_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('time', { ascending: true });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      if (data) {
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const updateTheme = async (theme: 'light' | 'dark' | 'auto') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({ theme, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences({ ...preferences, theme });
      setShowThemeModal(false);
    } catch (error) {
      console.error('Error updating theme:', error);
      Alert.alert('Error', 'Failed to update theme');
    }
  };

  const updateDisplayName = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setPreferences({ ...preferences, display_name: displayName });
      setShowProfileModal(false);
      Alert.alert('Success', 'Display name updated');
    } catch (error) {
      console.error('Error updating display name:', error);
      Alert.alert('Error', 'Failed to update display name');
    }
  };

  const toggleMenstrualCycle = async (value: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          track_menstrual_cycle: value,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      if (value) {
        const { data: menstrualCondition } = await supabase
          .from('conditions')
          .select('id')
          .eq('name', 'Menstrual Cycle')
          .eq('is_cycle', true)
          .maybeSingle();

        if (menstrualCondition) {
          const { data: existingUserCondition } = await supabase
            .from('user_conditions')
            .select('id')
            .eq('user_id', user.id)
            .eq('condition_id', menstrualCondition.id)
            .maybeSingle();

          if (!existingUserCondition) {
            await supabase
              .from('user_conditions')
              .insert({
                user_id: user.id,
                condition_id: menstrualCondition.id,
                status: 'monitoring',
                is_cycle: true,
              });
          }
        }
      } else {
        const { data: menstrualCondition } = await supabase
          .from('conditions')
          .select('id')
          .eq('name', 'Menstrual Cycle')
          .eq('is_cycle', true)
          .maybeSingle();

        if (menstrualCondition) {
          await supabase
            .from('user_conditions')
            .delete()
            .eq('user_id', user.id)
            .eq('condition_id', menstrualCondition.id);
        }
      }

      setPreferences({ ...preferences, track_menstrual_cycle: value });
    } catch (error) {
      console.error('Error updating menstrual cycle tracking:', error);
    }
  };

  const toggleNotification = async (id: string, value: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_notifications')
        .update({ is_enabled: value, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, is_enabled: value } : n))
      );
    } catch (error) {
      console.error('Error toggling notification:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!user) return;

    Alert.alert(
      'Delete Reminder',
      'Are you sure you want to delete this reminder?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('custom_notifications')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);

              if (error) throw error;

              setNotifications(notifications.filter((n) => n.id !== id));
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification. Please try again.');
            }
          },
        },
      ]
    );
  };

  const exportDataToPDF = async () => {
    setExporting(true);
    Alert.alert(
      'Export Data',
      'This feature will generate a PDF report of your health data. Coming soon!',
      [{ text: 'OK' }]
    );
    setExporting(false);
  };

  const handleBackup = () => {
    Alert.alert(
      'Cloud Backup',
      'Your data is automatically backed up to the cloud. All your logs and conditions are safely stored.',
      [{ text: 'OK' }]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'Account deletion will be available soon.');
          },
        },
      ]
    );
  };

  const handleSeedDemoData = () => {
    Alert.alert(
      'Load Demo Data',
      'This will add sample data to your account for testing. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load',
          onPress: async () => {
            if (user) {
              await seedDemoData();
              Alert.alert('Success', 'Demo data loaded successfully');
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your logs, conditions, and preferences. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            if (user) {
              await clearAllUserData(user.id);
              Alert.alert('Success', 'All data cleared successfully');
              router.replace('/(tabs)/today');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color={colors.neutral.gray900} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={16} color="#6b7280" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Profile</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowProfileModal(true)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Display Name</Text>
                <Text style={styles.settingValue}>
                  {preferences.display_name || 'Not set'}
                </Text>
              </View>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Email</Text>
                <Text style={styles.settingValue}>{user?.email}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Timezone</Text>
                <Text style={styles.settingValue}>{preferences.timezone}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={16} color="#6b7280" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Notifications & Reminders</Text>
          </View>
          <View style={styles.card}>
            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Bell size={32} color="#d1d5db" strokeWidth={1.5} />
                <Text style={styles.emptyText}>No reminders set</Text>
                <Text style={styles.emptySubtext}>
                  Create custom reminders to help with logging
                </Text>
              </View>
            ) : (
              <View style={styles.notificationsList}>
                {notifications.map((notif, index) => (
                  <View key={notif.id}>
                    {index > 0 && <View style={styles.divider} />}
                    <View style={styles.notificationRow}>
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationMessage}>{notif.message}</Text>
                        <View style={styles.notificationMeta}>
                          <Clock size={12} color="#6b7280" />
                          <Text style={styles.notificationTime}>{notif.time}</Text>
                          <Calendar size={12} color="#6b7280" />
                          <Text style={styles.notificationFrequency}>
                            {notif.frequency}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.notificationActions}>
                        <Switch
                          value={notif.is_enabled}
                          onValueChange={(value) => toggleNotification(notif.id, value)}
                          trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
                          thumbColor={notif.is_enabled ? '#6366f1' : '#f3f4f6'}
                        />
                        <TouchableOpacity
                          onPress={() => deleteNotification(notif.id)}
                          style={styles.deleteButton}
                        >
                          <Trash2 size={16} color="#dc2626" strokeWidth={2} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/add-notification')}
            >
              <Plus size={20} color="#6366f1" strokeWidth={2} />
              <Text style={styles.addButtonText}>Add Custom Reminder</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tracking Preferences</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => router.push('/settings-triggers')}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Manage Triggers</Text>
                <Text style={styles.settingSubtext}>
                  Choose which daily factors to track
                </Text>
              </View>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>

            <View style={styles.divider} />

            {/*
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Track Menstrual Cycle</Text>
                <Text style={styles.settingSubtext}>
                  Enable menstrual cycle symptom tracking
                </Text>
              </View>
              <Switch
                value={preferences.track_menstrual_cycle || false}
                onValueChange={toggleMenstrualCycle}
                trackColor={{ false: '#d1d5db', true: '#c7d2fe' }}
                thumbColor={preferences.track_menstrual_cycle ? '#6366f1' : '#f3f4f6'}
              />
            </View>
            */}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={16} color="#6b7280" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Appearance</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowThemeModal(true)}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Theme</Text>
                <Text style={styles.settingValue}>
                  {preferences.theme.charAt(0).toUpperCase() + preferences.theme.slice(1)}
                </Text>
              </View>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileDown size={16} color="#6b7280" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Data Export</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.settingRow}
              onPress={exportDataToPDF}
              disabled={exporting}
            >
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Export to PDF</Text>
                <Text style={styles.settingSubtext}>
                  Generate a medical report for appointments
                </Text>
              </View>
              {exporting ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <Download size={20} color="#6366f1" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database size={16} color="#6b7280" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Backup & Restore</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={handleBackup}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Cloud Backup</Text>
                <Text style={styles.settingSubtext}>
                  Your data is automatically backed up
                </Text>
              </View>
              <ChevronRight size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={16} color="#6b7280" strokeWidth={2} />
            <Text style={styles.sectionTitle}>Privacy & Security</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Data Storage</Text>
                <Text style={styles.settingSubtext}>
                  Your data is encrypted and stored securely
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={handleDeleteAccount}>
              <View style={styles.settingLeft}>
                <Text style={[styles.settingLabel, styles.dangerText]}>Delete Account</Text>
                <Text style={styles.settingSubtext}>
                  Permanently delete your account and data
                </Text>
              </View>
              <ChevronRight size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Developer Tools</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={handleSeedDemoData}>
              <View style={styles.settingLeft}>
                <Text style={[styles.settingLabel, { color: '#10b981' }]}>Load Demo Data</Text>
                <Text style={styles.settingSubtext}>
                  Populate app with sample data for testing
                </Text>
              </View>
              <ChevronRight size={20} color="#10b981" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={handleClearAllData}>
              <View style={styles.settingLeft}>
                <Text style={[styles.settingLabel, styles.dangerText]}>Clear All Data</Text>
                <Text style={styles.settingSubtext}>
                  Delete all your data (cannot be undone)
                </Text>
              </View>
              <ChevronRight size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>About</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingLabel}>Version</Text>
                <Text style={styles.settingValue}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />
      </ScrollView>

      <Modal
        visible={showProfileModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowProfileModal(false)}>
              <X size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Display Name</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.modalContent}>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your name"
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
            />
            <TouchableOpacity style={styles.modalButton} onPress={updateDisplayName}>
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showThemeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowThemeModal(false)}>
              <X size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Theme</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                preferences.theme === 'light' && styles.themeOptionActive,
              ]}
              onPress={() => updateTheme('light')}
            >
              <Text
                style={[
                  styles.themeOptionText,
                  preferences.theme === 'light' && styles.themeOptionTextActive,
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeOption,
                preferences.theme === 'dark' && styles.themeOptionActive,
              ]}
              onPress={() => updateTheme('dark')}
            >
              <Text
                style={[
                  styles.themeOptionText,
                  preferences.theme === 'dark' && styles.themeOptionTextActive,
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeOption,
                preferences.theme === 'auto' && styles.themeOptionActive,
              ]}
              onPress={() => updateTheme('auto')}
            >
              <Text
                style={[
                  styles.themeOptionText,
                  preferences.theme === 'auto' && styles.themeOptionTextActive,
                ]}
              >
                Auto
              </Text>
            </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary.cream,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.title3,
    color: colors.neutral.gray900,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.captionBold,
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  settingLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginBottom: 2,
  },
  settingValue: {
    ...typography.caption,
    color: colors.neutral.gray600,
  },
  settingSubtext: {
    ...typography.caption,
    color: colors.neutral.gray500,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.gray200,
    marginHorizontal: spacing.md,
  },
  dangerText: {
    color: colors.accent.red,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodyBold,
    color: colors.neutral.gray900,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.neutral.gray600,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  notificationsList: {
    paddingVertical: spacing.xs,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notificationContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  notificationMessage: {
    ...typography.body,
    color: colors.neutral.gray900,
    marginBottom: spacing.xs,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  notificationTime: {
    ...typography.small,
    color: colors.neutral.gray600,
    marginRight: spacing.sm,
  },
  notificationFrequency: {
    ...typography.small,
    color: colors.neutral.gray600,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  addButtonText: {
    ...typography.bodyBold,
    color: '#6366f1',
  },
  signOutButton: {
    backgroundColor: colors.accent.red,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.md,
  },
  signOutButtonText: {
    ...typography.bodyBold,
    color: colors.neutral.white,
  },
  spacer: {
    height: spacing.xxl,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.gray200,
  },
  modalTitle: {
    ...typography.title3,
    color: colors.neutral.gray900,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.neutral.gray900,
    marginBottom: spacing.lg,
  },
  modalButton: {
    backgroundColor: colors.neutral.gray900,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalButtonText: {
    ...typography.bodyBold,
    color: colors.neutral.white,
  },
  themeOption: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.neutral.gray100,
    marginBottom: spacing.md,
  },
  themeOptionActive: {
    backgroundColor: colors.accent.purple,
  },
  themeOptionText: {
    ...typography.bodyBold,
    color: colors.neutral.gray700,
    textAlign: 'center',
  },
  themeOptionTextActive: {
    color: colors.neutral.white,
  },
});
