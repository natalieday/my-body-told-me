import { supabase } from './supabase';

export async function seedDemoData() {
  console.log('[seedDemoData] starting');

  try {
    const today = new Date(); // ← add this back

    const { data: authUser, error: authError } = await supabase.auth.getUser();
    console.log('[seedDemoData] authUser =', authUser, 'authError =', authError);

    if (authError || !authUser?.user) {
      console.error('[seedDemoData] No authenticated user found for seeding', authError);
      return { success: false, error: authError || new Error('No authenticated user found') };
    }

    const userId = authUser.user.id;
    console.log('[seedDemoData] using userId:', userId);

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingUser) {
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: authUser.user.email,
          current_streak: 0,
          longest_streak: 0,
        });

      if (userInsertError) {
        console.error('Error creating user entry:', userInsertError);
        return { success: false, error: userInsertError };
      }
    }

    const conditionNames = [
      'Migraine',
      'POTS (Postural Orthostatic Tachycardia Syndrome)',
      'Back Pain',
      'Fibromyalgia',
    ];

    const { data: globalConditions, error: fetchError } = await supabase
      .from('conditions')
      .select('id, name')
      .in('name', conditionNames);

    if (fetchError) {
      console.error('Error fetching conditions:', fetchError);
      return { success: false, error: fetchError };
    }

    const conditionMap = new Map(globalConditions?.map(c => [c.name, c.id]) || []);

    const userConditionsData = [
      {
        user_id: userId,
        condition_id: conditionMap.get('Migraine'),
        status: 'diagnosed',
        notes:
          'Triggered by bright lights, stress, and lack of sleep. Usually worse in the afternoon.',
      },
      {
        user_id: userId,
        condition_id: conditionMap.get('POTS (Postural Orthostatic Tachycardia Syndrome)'),
        status: 'diagnosed',
        notes: 'Symptoms worse when standing. Need to increase salt and fluid intake.',
      },
      {
        user_id: userId,
        condition_id: conditionMap.get('Chronic Back Pain'),
        status: 'likely',
        notes: 'Recent flare-up after long car ride. Physical therapy helps.',
      },
      {
        user_id: userId,
        condition_id: conditionMap.get('Fibromyalgia'),
        status: 'exploring',
        notes: 'Widespread pain, better with gentle movement and warm baths.',
      },
    ].filter(c => !!c.condition_id); // drop any that didn't resolve just in case

    console.log(
      '[seedDemoData] inserting user_conditions:',
      userConditionsData.length
    ); // ← put this here

    // Insert user_conditions only if we actually have any
    let userConditions: any[] = [];

    if (userConditionsData.length > 0) {
      const { data, error } = await supabase
        .from('user_conditions')
        .insert(userConditionsData)
        .select();

      if (error) {
        console.error('Error inserting user conditions:', error);
        return { success: false, error };
      }

      userConditions = data || [];
    } else {
      console.warn(
        'No matching global conditions found in `conditions` table – skipping user_conditions seeding'
      );
    }

    const userConditionIds = userConditions.map((uc) => uc.id);

    const dailyLogs: any[] = [];
    const momentLogs: any[] = [];

    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const baseSeverity = 5 + Math.sin(i / 3) * 2;
      const severity = Math.max(1, Math.min(10, Math.round(baseSeverity + (Math.random() - 0.5) * 2)));

      const moodTags = ['good', 'neutral', 'tough', 'fluctuating'];
      const moodTag = moodTags[Math.floor(Math.random() * moodTags.length)];

      const sleepHours = 5 + Math.random() * 4;
      const sleepQuality = Math.max(1, Math.min(5, Math.round(3 + (Math.random() - 0.5) * 2)));
      const stressLevel = Math.max(1, Math.min(5, Math.round(3 + (Math.random() - 0.5) * 2)));
      const activityLevels = ['none', 'light', 'moderate', 'heavy'];
      const activityLevel = activityLevels[Math.floor(Math.random() * activityLevels.length)];

      const triggersList = [
        'stress, poor sleep',
        'weather change',
        'physical activity',
        'dehydration',
        'bright lights',
        'lack of sleep',
        '',
      ];

      dailyLogs.push({
        user_id: userId,
        date: dateStr,
        overall_severity: severity,
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        stress_level: stressLevel,
        activity_level: activityLevel,
        triggers: triggersList[Math.floor(Math.random() * triggersList.length)],
        mood_tag: moodTag,
        created_at: new Date(date.getTime() + 20 * 60 * 60 * 1000).toISOString(),
      });

      if (Math.random() > 0.3 && userConditionIds.length > 0) {
        const numLogs = Math.floor(Math.random() * 3) + 1;

        for (let j = 0; j < numLogs; j++) {
          const hour = 8 + Math.floor(Math.random() * 12);
          const minute = Math.floor(Math.random() * 60);

          const logTime = new Date(date);
          logTime.setHours(hour, minute, 0, 0);

          const logSeverity = Math.max(1, Math.min(10, severity + Math.round((Math.random() - 0.5) * 3)));

          const triggersList = ['stress', 'poor sleep', 'weather change', 'physical activity', 'dehydration', 'bright lights', 'loud noise'];
          const numTriggers = Math.random() > 0.6 ? Math.floor(Math.random() * 2) + 1 : 0;
          const selectedTriggers: string[] = [];
          for (let k = 0; k < numTriggers; k++) {
            const trigger = triggersList[Math.floor(Math.random() * triggersList.length)];
            if (!selectedTriggers.includes(trigger)) {
              selectedTriggers.push(trigger);
            }
          }

          const activities = ['working', 'exercising', 'resting', 'eating', 'socializing', 'traveling'];
          const activity = activities[Math.floor(Math.random() * activities.length)];

          const logNotes = [
            'Sharp pain, need to lie down.',
            'Throbbing sensation, took medication.',
            'Dull ache, manageable.',
            'Sudden onset, not sure why.',
            'Building up slowly throughout the day.',
            'Triggered by activity.',
            'Feeling better after rest.',
            'Worse than usual today.',
          ];

          momentLogs.push({
            user_id: userId,
            overall_severity: logSeverity,
            activity: activity,
            triggers: selectedTriggers.join(', '),
            notes: Math.random() > 0.4 ? logNotes[Math.floor(Math.random() * logNotes.length)] : null,
            timestamp: logTime.toISOString(),
            date: dateStr,
            created_at: logTime.toISOString(),
            linked_condition_id: userConditionIds[Math.floor(Math.random() * userConditionIds.length)],
          });
        }
      }
    }

    const { error: dailyLogsError } = await supabase
      .from('daily_logs')
      .insert(dailyLogs);

    if (dailyLogsError) {
      console.error('Error inserting daily logs:', dailyLogsError);
      return { success: false, error: dailyLogsError };
    }

    if (momentLogs.length > 0) {
      const momentLogsToInsert = momentLogs.map(({ linked_condition_id, ...log }) => log);

      const { data: insertedMomentLogs, error: momentLogsError } = await supabase
        .from('moment_logs')
        .insert(momentLogsToInsert)
        .select();

      if (momentLogsError) {
        console.error('Error inserting moment logs:', momentLogsError);
        return { success: false, error: momentLogsError };
      }

      const momentLogConditions = insertedMomentLogs?.map((log: any, index: number) => ({
        moment_log_id: log.id,
        user_condition_id: momentLogs[index].linked_condition_id,
        severity: log.overall_severity,
        notes: null,
      })) || [];

      if (momentLogConditions.length > 0) {
        const { error: momentLogConditionsError } = await supabase
          .from('moment_log_conditions')
          .insert(momentLogConditions);

        if (momentLogConditionsError) {
          console.error('Error inserting moment log conditions:', momentLogConditionsError);
          return { success: false, error: momentLogConditionsError };
        }
      }
    }

    const notificationsData = [
      {
        user_id: userId,
        message: 'Hey, remember to check your symptoms today 💛',
        time: '09:00:00',
        frequency: 'daily',
        days_of_week: [],
        is_enabled: true,
      },
      {
        user_id: userId,
        message: 'Quick check-in: How\'s your pain right now?',
        time: '14:00:00',
        frequency: 'daily',
        days_of_week: [],
        is_enabled: true,
      },
      {
        user_id: userId,
        message: 'Log hydration today — it helps your migraines!',
        time: '18:00:00',
        frequency: 'weekdays',
        days_of_week: [],
        is_enabled: false,
      },
    ];

    const { error: notificationsError } = await supabase
      .from('custom_notifications')
      .insert(notificationsData);

    if (notificationsError) {
      console.error('Error inserting notifications:', notificationsError);
      return { success: false, error: notificationsError };
    }

    console.log(
      '[seedDemoData] finished. dailyLogs:',
      dailyLogs.length,
      'momentLogs:',
      momentLogs.length,
      'notifications:',
      notificationsData.length
    ); // ← put this here

    return {
      success: true,
      message: `Created ${userConditions?.length || 0} conditions, ${dailyLogs.length} daily logs, ${momentLogs.length} moment logs, and ${notificationsData.length} notifications`
    };
  } catch (error) {
    console.error('Error seeding demo data:', error);
    return { success: false, error };
  }
}

export async function clearAllUserData(userId: string) {
  try {
    await supabase.from('moment_logs').delete().eq('user_id', userId);
    await supabase.from('daily_logs').delete().eq('user_id', userId);
    await supabase.from('user_conditions').delete().eq('user_id', userId);
    await supabase.from('custom_notifications').delete().eq('user_id', userId);

    return { success: true, message: 'All user data cleared' };
  } catch (error) {
    console.error('Error clearing user data:', error);
    return { success: false, error };
  }
}
