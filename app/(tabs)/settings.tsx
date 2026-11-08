import React, { useState, useEffect } from 'react';
import { View, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import {
  Screen,
  Heading,
  Copy,
  SectionTitle,
  Button,
  Panel,
  Chips,
  Toggle,
  Field,
} from '../../src/ui/primitives';
import { DateField } from '../../src/ui/DateField';
import { useApp, attempt } from '../../src/state/app';
import { requestNotifications } from '../../src/services/notifications';
import { exportJSON, pickText, clearExportCache } from '../../src/services/files';
import { validateBackup } from '../../src/data/repository';
import { parsePlan } from '../../src/domain/schema';
import { useTheme } from '../../src/ui/theme';
export default function Settings() {
  const { repo, refresh, tick, pendingNotificationCount: count } = useApp(),
    p = repo.active(),
    settings = repo.settings(),
    [quietStart, setQuietStart] = useState(settings.quiet_start),
    [quietEnd, setQuietEnd] = useState(settings.quiet_end),
    t = useTheme();
  useEffect(() => {
    setQuietStart(settings.quiet_start);
    setQuietEnd(settings.quiet_end);
  }, [settings.quiet_start, settings.quiet_end]);
  const update = (changes: Partial<NonNullable<typeof p>>) =>
    attempt(() => {
      if (!p) return;
      repo.apply({ ...p, ...changes, version: p.version + 1 });
      refresh();
    });
  return (
    <Screen>
      <Heading eyebrow="MAKE IT YOURS" title="Settings" />
      {p && (
        <Panel>
          <Copy heading size={24}>
            {p.profile.name || 'Your space'}
          </Copy>
          <Copy muted>
            {p.name} · version {p.version}
          </Copy>
          <Button
            title="Edit profile & plan details"
            kind="soft"
            onPress={() => router.push('/plan-details')}
          />
        </Panel>
      )}
      <SectionTitle title="Appearance" />
      <Chips
        values={[
          { id: 'system', name: 'System' },
          { id: 'light', name: 'Light' },
          { id: 'dark', name: 'Dark' },
        ]}
        value={repo.pref('theme') ?? p?.theme ?? 'system'}
        onChange={(v) => {
          repo.setPref('theme', v);
          refresh();
        }}
      />
      {p && (
        <>
          <SectionTitle title="Today widgets" />
          {(['current', 'goals', 'metrics', 'reflection', 'reminders'] as const).map((widget) => (
            <Toggle
              key={widget}
              label={widget[0].toUpperCase() + widget.slice(1)}
              value={p.dashboard.widgets.includes(widget)}
              onChange={(v) =>
                update({
                  dashboard: {
                    widgets: v
                      ? [...p.dashboard.widgets, widget]
                      : p.dashboard.widgets.filter((w) => w !== widget),
                  },
                })
              }
            />
          ))}
        </>
      )}
      <SectionTitle title="Notifications" />
      <Toggle
        label="Enable local reminders"
        value={!!settings.enabled}
        onChange={(enabled) =>
          attempt(async () => {
            if (enabled && !(await requestNotifications())) {
              Alert.alert(
                'Permission needed',
                'Allow notifications in Android Settings to receive reminders.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Open settings', onPress: () => void Linking.openSettings() },
                ],
              );
              return;
            }
            repo.notifications(enabled, quietStart, quietEnd);
            refresh();
          })
        }
      />
      <Panel>
        <Copy muted size={13}>
          Quiet hours · reminders during this period are omitted
        </Copy>
        <DateField
          label="Quiet hours begin"
          mode="time"
          value={quietStart}
          onChange={setQuietStart}
        />
        <DateField label="Quiet hours end" mode="time" value={quietEnd} onChange={setQuietEnd} />
        <Button
          title="Save quiet hours"
          kind="soft"
          onPress={() =>
            attempt(() => {
              repo.notifications(!!settings.enabled, quietStart, quietEnd);
              refresh();
            })
          }
        />
      </Panel>
      {p && (
        <Panel>
          <Toggle
            label="Daily routine reminder"
            value={p.dailyReminder.enabled}
            onChange={(v) => update({ dailyReminder: { ...p.dailyReminder, enabled: v } })}
          />
          <DateField
            label="Daily reminder time"
            mode="time"
            value={p.dailyReminder.time}
            onChange={(v) => update({ dailyReminder: { ...p.dailyReminder, time: v } })}
          />
          <Toggle
            label="Weekly review reminder"
            value={p.review.enabled}
            onChange={(v) => update({ review: { ...p.review, enabled: v } })}
          />
          <Chips
            values={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name, n) => ({
              id: String(n + 1),
              name,
            }))}
            value={String(p.review.weekday)}
            onChange={(v) => update({ review: { ...p.review, weekday: Number(v) } })}
          />
          <DateField
            label="Weekly review time"
            mode="time"
            value={p.review.time}
            onChange={(v) => update({ review: { ...p.review, time: v } })}
          />
        </Panel>
      )}
      <Copy muted size={12}>
        {count} reminders currently scheduled. The next 14 days are refreshed on app open, edits and
        completion, with at most 60 pending reminders. Android may delay them, especially in
        battery-saving mode. After force-stop, reopen the app. Open the app at least every two weeks
        to replenish reminders.
      </Copy>
      <Button title="Refresh reminders" kind="soft" onPress={refresh} />
      <SectionTitle title="Configuration" />
      <Button
        title="Preview detailed sample plans"
        kind="soft"
        onPress={() => router.push('/samples')}
      />
      <Button
        title="Import a plan"
        kind="soft"
        icon="upload"
        onPress={() => router.push('/import')}
      />
      {repo.plans().map((plan) => (
        <Button
          key={plan.id}
          title={`${plan.id === p?.id ? '✓ ' : ''}${plan.name}`}
          kind="ghost"
          onPress={() =>
            attempt(() => {
              repo.activate(plan.id);
              refresh();
              router.replace('/');
            })
          }
        />
      ))}
      {p && (
        <>
          <Button
            title="Export active configuration"
            kind="soft"
            icon="download"
            onPress={() => attempt(() => exportJSON('plan', p))}
          />
          <Button
            title="Export progress only"
            kind="soft"
            onPress={() =>
              attempt(() => {
                const backup = repo.backup();
                return exportJSON('progress', {
                  format: 'verdant-progress',
                  version: 1,
                  planId: p.id,
                  instances: repo.allRows(p.id),
                  measurements: repo.measurements(p.id),
                  journals: backup.tables.journals.filter((j) => j.plan_id === p.id),
                  milestones: repo.milestones(p.id),
                });
              })
            }
          />
          <Copy muted size={12}>
            Progress export is a readable archive. Use a full backup to restore the app.
          </Copy>
          <SectionTitle title="Previous configurations" />
          {repo
            .versions(p.id)
            .slice(1, 11)
            .map((v) => (
              <Button
                key={v.id}
                title={`Restore version ${v.version} · ${v.effective_on}`}
                kind="ghost"
                onPress={() =>
                  Alert.alert(
                    'Restore this configuration?',
                    'Creates a new version using the old definitions. Your activity history remains.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Restore',
                        onPress: () =>
                          attempt(() => {
                            repo.apply({ ...parsePlan(v.config), version: p.version + 1 });
                            refresh();
                          }),
                      },
                    ],
                  )
                }
              />
            ))}
        </>
      )}
      <SectionTitle title="Backup & restore" />
      <Button
        title="Export full backup"
        kind="soft"
        icon="save"
        onPress={() => attempt(() => exportJSON('backup', repo.backup()))}
      />
      <Button
        title="Restore full backup"
        kind="soft"
        icon="folder"
        onPress={() =>
          attempt(async () => {
            const text = await pickText();
            if (!text) return;
            const backup = validateBackup(JSON.parse(text));
            Alert.alert(
              'Replace all app data?',
              `${backup.tables.plans.length} plans and ${backup.tables.instances.length} activity records. This replaces all data on this device. Export a full backup first.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Replace & restore',
                  style: 'destructive',
                  onPress: () =>
                    attempt(() => {
                      repo.restore(backup);
                      refresh();
                      router.replace('/');
                    }),
                },
              ],
            );
          })
        }
      />
      <SectionTitle title="Privacy" />
      <Copy muted>
        All routines and records live on this device. No accounts, ads, telemetry or AI requests.
        Files are validated locally. Export only to places you trust.
      </Copy>
      <Copy muted>
        SQLite is not encrypted by this app. Device lock and Android’s app sandbox protect access; a
        compromised or unlocked device can expose data. Android automatic backup is disabled.
        Uninstalling or clearing storage removes your records. Keep your own backup.
      </Copy>
      <Button
        title="Delete all app data"
        kind="danger"
        onPress={() =>
          Alert.alert(
            'Delete everything?',
            'All plans, records, measurements and reflections will be removed from this app. Exported files elsewhere are unaffected.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete all data',
                style: 'destructive',
                onPress: () =>
                  attempt(() => {
                    repo.deleteAll();
                    clearExportCache();
                    refresh();
                    router.replace('/');
                  }),
              },
            ],
          )
        }
      />
      <Copy muted size={11} style={{ textAlign: 'center' }}>
        VERDANT 1.1.0 · PERSONALIZED CHECKLISTS
      </Copy>
    </Screen>
  );
}
