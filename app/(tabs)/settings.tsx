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
import { useRouter, useFocusEffect } from 'expo-router';
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
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCallback } from 'react';
import { seedDemoData, clearAllUserData } from '@/lib/seed-demo-data';
import { colors, typography, spacing, borderRadius, shadows } from '@/lib/design-system';

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  timezone: string;
  display_name?: string;
  profile_picture_url?: string;
}

interface CustomNotification {
  id: string;
  message: string;
  time: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';
  days_of_week: number[];
  is_enabled: boolean;
}

export default function SettingsScreen() {
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

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadNotifications();
      }
    }, [user])
  );

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

      if (error) {
        console.error('Error updating theme:', error);
        return;
      }

      setPreferences((prev) => ({ ...prev, theme }));
      setShowThemeModal(false);
    } catch (error) {
      console.error('Error updating theme:', error);
    }
  };

  const updateProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .update({
          display_name: displayName || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return;
      }

      setPreferences((prev) => ({ ...prev, display_name: displayName }));
      setShowProfileModal(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const toggleNotification = async (id: string, isEnabled: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_notifications')
        .update({ is_enabled: isEnabled, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error toggling notification:', error);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_enabled: isEnabled } : n))
      );
    } catch (error) {
      console.error('Error toggling notification:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    Alert.alert('Delete Notification', 'Are you sure you want to delete this notification?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('custom_notifications')
              .delete()
              .eq('id', id);

            if (error) {
              console.error('Error deleting notification:', error);
              return;
            }

            setNotifications((prev) => prev.filter((n) => n.id !== id));
          } catch (error) {
            console.error('Error deleting notification:', error);
          }
        },
      },
    ]);
  };

  const exportDataToPDF = async () => {
    setExporting(true);
    try {
      Alert.alert(
        'Export Data',
        'PDF export will be available soon. For now, you can view your data in the History tab.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Are you absolutely sure?',
              'This is permanent and cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    Alert.alert('Account Deletion', 'Please contact support to delete your account.');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleBackup = async () => {
    Alert.alert(
      'Backup Data',
      'Cloud backup is automatically enabled. Your data is securely stored and synced across devices.',
      [{ text: 'OK' }]
    );
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/auth');
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
  };

  const handleSeedDemoData = async () => {
    console.log('[Settings] Load Demo Data tapped. user =', user);
  
    if (!user) {
      console.log('[Settings] No user, aborting seedDemoData');
      Alert.alert(
        'Not signed in',
        'You need to be signed in before loading demo data.'
      );
      return;
    }
  
    // 🔥 Bypass Alert.confirm for now so we KNOW the function runs
    setLoading(true);
    try {
      console.log('[Settings] Calling seedDemoData()…');
      const result = await seedDemoData();
      console.log('[Settings] seedDemoData result:', result);
  
      if (result.success) {
        Alert.alert('Success', result.message || 'Demo data loaded successfully!');
        await loadNotifications();
      } else {
        console.error('[Settings] seedDemoData failed:', result.error);
        Alert.alert(
          'Error',
          (result.error as any)?.message || 'Failed to load demo data. Please try again.'
        );
      }
    } catch (error) {
      console.error('[Settings] Error loading demo data:', error);
      Alert.alert('Error', 'Failed to load demo data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!user) return;

    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your conditions, logs, touchpoints, and notifications. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            Alert.alert(
              'Are you absolutely sure?',
              'This will delete everything and cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    setLoading(true);
                    try {
                      const result = await clearAllUserData(user.id);
                      if (result.success) {
                        Alert.alert('Success', 'All data has been cleared.');
                        loadNotifications();
                      } else {
                        Alert.alert('Error', 'Failed to clear data. Please try again.');
                      }
                    } catch (error) {
                      console.error('Error clearing data:', error);
                      Alert.alert('Error', 'Failed to clear data. Please try again.');
                    } finally {
                      setLoading(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
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
        <Text style={styles.title}>Settings</Text>
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
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={updateProfile}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Enter your name"
                placeholderTextColor="#9ca3af"
              />
            </View>
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
            <Text style={styles.modalTitle}>Choose Theme</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                preferences.theme === 'light' && styles.themeOptionSelected,
              ]}
              onPress={() => updateTheme('light')}
            >
              <Text
                style={[
                  styles.themeOptionText,
                  preferences.theme === 'light' && styles.themeOptionTextSelected,
                ]}
              >
                Light
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeOption,
                preferences.theme === 'dark' && styles.themeOptionSelected,
              ]}
              onPress={() => updateTheme('dark')}
            >
              <Text
                style={[
                  styles.themeOptionText,
                  preferences.theme === 'dark' && styles.themeOptionTextSelected,
                ]}
              >
                Dark
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeOption,
                preferences.theme === 'auto' && styles.themeOptionSelected,
              ]}
              onPress={() => updateTheme('auto')}
            >
              <Text
                style={[
                  styles.themeOptionText,
                  preferences.theme === 'auto' && styles.themeOptionTextSelected,
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
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.cream,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.small,
    fontWeight: '600',
    color: colors.neutral.gray600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingLeft: {
    flex: 1,
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
    backgroundColor: colors.neutral.gray100,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.bodyBold,
    color: colors.neutral.gray600,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.caption,
    color: colors.neutral.gray500,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  notificationsList: {
    paddingVertical: spacing.xs,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    gap: spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    ...typography.body,
    color: colors.neutral.gray900,
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notificationTime: {
    ...typography.small,
    color: colors.neutral.gray600,
    marginRight: spacing.sm,
  },
  notificationFrequency: {
    ...typography.small,
    color: colors.neutral.gray600,
    textTransform: 'capitalize',
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
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.gray100,
  },
  addButtonText: {
    ...typography.bodyBold,
    color: colors.accent.purple,
  },
  signOutButton: {
    backgroundColor: colors.accent.red,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  signOutButtonText: {
    ...typography.bodyBold,
    color: colors.neutral.white,
  },
  spacer: {
    height: 80,
  },
  dangerText: {
    color: colors.accent.red,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.primary.cream,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.neutral.white,
    ...shadows.sm,
  },
  modalTitle: {
    ...typography.title3,
    color: colors.neutral.gray900,
  },
  modalSave: {
    ...typography.bodyBold,
    color: colors.accent.purple,
  },
  modalContent: {
    padding: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...typography.captionBold,
    color: colors.neutral.gray700,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.gray300,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.neutral.gray900,
  },
  themeOption: {
    backgroundColor: colors.neutral.white,
    borderWidth: 2,
    borderColor: colors.neutral.gray300,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  themeOptionSelected: {
    borderColor: colors.accent.purple,
    backgroundColor: colors.primary.lavender,
  },
  themeOptionText: {
    ...typography.bodyBold,
    color: colors.neutral.gray600,
    textAlign: 'center',
  },
  themeOptionTextSelected: {
    color: colors.accent.purple,
  },
});
