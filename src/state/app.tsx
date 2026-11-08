import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { AppState, Alert } from 'react-native';
import { openDatabaseSync } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import type { Plan } from '../domain/schema';
import { Repository } from '../data/repository';
import { addDays, today } from '../domain/schedule';
import { reconcile, notificationCount } from '../services/notifications';
import { clearExportCache } from '../services/files';
let instance: Repository | undefined;
export const repository = () =>
  instance ?? (instance = new Repository(openDatabaseSync('verdant.db')));
type AppContext = {
  repo: Repository;
  plan: Plan | null;
  tick: number;
  refresh: () => void;
  notifyError: string | null;
  pendingNotificationCount: number;
};
const Context = createContext<AppContext | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [repo] = useState(repository),
    [tick, setTick] = useState(0),
    [notifyError, setError] = useState<string | null>(null),
    [pendingNotificationCount, setCount] = useState(0);
  const alive = useRef(true);
  const refresh = useCallback(() => {
    const p = repo.active();
    if (p) {
      const day = today(p.timezone);
      repo.ensure(addDays(day, -30), addDays(day, 13));
      repo.syncMilestones(p.id);
    }
    setTick((n) => n + 1);
    reconcile(repo)
      .then(() => notificationCount())
      .then((count) => {
        if (alive.current) {
          setError(null);
          setCount(count);
        }
      })
      .catch(() => {
        if (alive.current) setError('Reminders could not be refreshed. Open Settings to retry.');
      });
  }, [repo]);
  useEffect(() => {
    alive.current = true;
    clearExportCache();
    refresh();
    let last = repo.active() ? today(repo.active()!.timezone) : '';
    const interval = setInterval(() => {
      const p = repo.active();
      if (p) {
        const next = today(p.timezone);
        if (next !== last) {
          last = next;
          refresh();
        }
      }
    }, 15000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    const notifications = Notifications.addNotificationResponseReceivedListener(() => refresh());
    return () => {
      alive.current = false;
      clearInterval(interval);
      sub.remove();
      notifications.remove();
    };
  }, [refresh, repo]);
  const plan = useMemo(() => repo.active(), [repo, tick]);
  return (
    <Context.Provider value={{ repo, plan, tick, refresh, notifyError, pendingNotificationCount }}>
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error('App provider missing');
  return ctx;
}
export function report(error: unknown) {
  Alert.alert('Couldn’t finish', error instanceof Error ? error.message : 'Please try again.');
}
export function attempt(fn: () => unknown) {
  try {
    const r = fn();
    if (r instanceof Promise) r.catch(report);
  } catch (e) {
    report(e);
  }
}
