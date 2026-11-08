import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Temporal } from '@js-temporal/polyfill';
import { addDays, today, wallEpoch, quiet } from '../domain/schedule';
import { definition } from '../domain/analytics';
import type { Repository } from '../data/repository';
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
export async function requestNotifications() {
  if (Platform.OS === 'android')
    await Notifications.setNotificationChannelAsync('routine', {
      name: 'Routine reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  const p = await Notifications.requestPermissionsAsync();
  return p.granted;
}
// Single serialized reconciliation prevents older async work from overwriting newer state.
let queue = Promise.resolve();
export function reconcile(repo: Repository): Promise<void> {
  queue = queue
    .catch(() => {})
    .then(async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      const p = repo.active(),
        settings = repo.settings();
      if (!p || !settings.enabled) return;
      const permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) return;
      if (Platform.OS === 'android')
        await Notifications.setNotificationChannelAsync('routine', {
          name: 'Routine reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      const day = today(p.timezone),
        end = addDays(day, 13),
        now = Date.now();
      repo.ensure(day, end);
      const candidates: { id: string; epoch: number; title: string; body: string }[] = [];
      const add = (id: string, epoch: number | null, title: string, body: string) => {
        if (epoch === null || epoch <= now) return;
        const wall = Temporal.Instant.fromEpochMilliseconds(epoch)
          .toZonedDateTimeISO(p.timezone)
          .toPlainTime()
          .toString()
          .slice(0, 5);
        if (!quiet(wall, settings.quiet_start, settings.quiet_end))
          candidates.push({ id, epoch, title, body });
      };
      for (const r of repo.rows(day, end)) {
        const a = definition(r);
        if (r.status !== 'pending' || !a.reminder.enabled || !r.time) continue;
        const epoch = wallEpoch(r.due_date, r.time, p.timezone);
        add(
          r.id,
          epoch === null ? null : epoch - a.reminder.minutesBefore * 60000,
          a.title,
          a.steps.length
            ? `${p.name} · ${a.steps
                .filter((s) => !r.checked_steps?.includes(s.id))
                .slice(0, 3)
                .map((s) => s.title)
                .join(' → ')}`.slice(0, 300)
            : a.description || p.name,
        );
      }
      for (let d = day; d <= end; d = addDays(d, 1)) {
        if (p.dailyReminder.enabled)
          add(
            `daily/${d}`,
            wallEpoch(d, p.dailyReminder.time, p.timezone),
            'Your day, at your pace',
            p.name,
          );
        if (p.review.enabled && Temporal.PlainDate.from(d).dayOfWeek === p.review.weekday)
          add(
            `review/${d}`,
            wallEpoch(d, p.review.time, p.timezone),
            'A moment to review',
            'Open Progress and reflect on the week.',
          );
      }
      // iOS limits pending notifications; use a conservative cap on both platforms.
      for (const c of candidates.sort((a, b) => a.epoch - b.epoch).slice(0, 60))
        await Notifications.scheduleNotificationAsync({
          identifier: c.id,
          content: { title: c.title, body: c.body, data: { path: '/' }, sound: false },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(c.epoch),
            channelId: 'routine',
          },
        });
    });
  return queue;
}
export async function notificationCount() {
  return (await Notifications.getAllScheduledNotificationsAsync()).length;
}
