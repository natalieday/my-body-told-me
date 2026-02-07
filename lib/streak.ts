import { supabase } from './supabase';

export async function updateStreak(userId: string, logDate?: string) {
  const dateToUse = logDate || new Date().toISOString().split('T')[0];
  const { data: user, error: fetchError } = await supabase
    .from('users')
    .select('current_streak, longest_streak, last_log_date')
    .eq('id', userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const today = new Date(dateToUse);
  const lastLog = user?.last_log_date ? new Date(user.last_log_date) : null;

  let newCurrentStreak = 1;

  if (lastLog) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastLog.toDateString() === yesterday.toDateString()) {
      newCurrentStreak = (user?.current_streak || 0) + 1;
    } else if (lastLog.toDateString() !== today.toDateString()) {
      newCurrentStreak = 1;
    } else {
      newCurrentStreak = user?.current_streak || 1;
    }
  }

  const newLongestStreak = Math.max(
    newCurrentStreak,
    user?.longest_streak || 0
  );

  const { error: updateError } = await supabase
    .from('users')
    .update({
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_log_date: dateToUse,
    })
    .eq('id', userId);

  if (updateError) throw updateError;

  return {
    current_streak: newCurrentStreak,
    longest_streak: newLongestStreak,
  };
}
