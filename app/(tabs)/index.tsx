import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import {
  Screen,
  Copy,
  Row,
  Panel,
  Heading,
  SectionTitle,
  IconButton,
  Button,
  Field,
  Empty,
} from '../../src/ui/primitives';
import { ProgressRing } from '../../src/ui/ProgressRing';
import { useTheme } from '../../src/ui/theme';
import { useApp, attempt } from '../../src/state/app';
import { today, prettyDate } from '../../src/domain/schedule';
import { summary, definition } from '../../src/domain/analytics';
import { Onboarding } from '../../src/features/Onboarding';
import { ActivityRow } from '../../src/features/ActivityRow';
import { Goals } from '../../src/features/Goals';
import { QuickMeasurement } from '../../src/features/QuickMeasurement';
export default function Today() {
  const { repo, tick, refresh, notifyError } = useApp(),
    p = repo.active(),
    t = useTheme();
  const day = p ? today(p.timezone) : '',
    rows = p ? repo.rows(day) : [],
    stats = summary(rows, day),
    [journal, setJournal] = useState(''),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    if (day) {
      setJournal(repo.journal(day));
      setSaved(false);
    }
  }, [day, p?.id, repo]);
  if (!p) return <Onboarding />;
  const habitRows = rows.filter((r) => !!definition(r).habit),
    routineRows = rows.filter((r) => !definition(r).habit);
  const widgets = p.dashboard.widgets,
    now = new Intl.DateTimeFormat('en-GB', {
      timeZone: p.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date());
  const upcoming = rows
      .filter((r) => r.status === 'pending')
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')),
    next = upcoming.find((r) => r.time && r.time >= now) ?? upcoming[0];
  return (
    <Screen onRefresh={refresh}>
      <Heading
        eyebrow={prettyDate(day)}
        title={`Hello${p.profile.name ? `, ${p.profile.name}` : ''}.`}
        action={
          <IconButton
            name="sliders"
            label="Open settings"
            onPress={() => router.push('/settings')}
          />
        }
      />
      <Copy muted>A little care for the things that matter.</Copy>
      <Panel style={{ backgroundColor: '#235C45', borderColor: '#235C45', padding: 24 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1, gap: 7 }}>
            <Copy size={11} style={{ color: '#CDDEC8', letterSpacing: 2 }}>
              YOUR DAILY RHYTHM
            </Copy>
            <Copy heading size={27} style={{ color: '#FFFEF0' }}>
              {stats.completed === stats.total && stats.total
                ? 'Time to take a breath.'
                : 'Small steps,\nsteady progress.'}
            </Copy>
            <Copy size={12} style={{ color: '#CDDEC8' }}>
              {stats.completed} of {stats.total} complete · {stats.partial} partial
            </Copy>
          </View>
          <ProgressRing percent={stats.percent} inverse />
        </Row>
      </Panel>
      {notifyError && <Copy style={{ color: t.danger }}>{notifyError}</Copy>}
      {widgets.includes('current') && next && (
        <Panel style={{ backgroundColor: t.sage, borderWidth: 0 }}>
          <Row>
            <Feather name="sun" size={20} color={t.primary} />
            <Copy size={11} style={{ letterSpacing: 1.5 }}>
              NEXT IN YOUR RHYTHM
            </Copy>
          </Row>
          <Copy heading size={25}>
            {definition(next).title}
          </Copy>
          {definition(next).steps.find((s) => !next.checked_steps?.includes(s.id)) ? (
            <Copy muted>
              {definition(next).steps.find((s) => !next.checked_steps?.includes(s.id))!.title}
            </Copy>
          ) : null}
          <Row style={{ justifyContent: 'space-between' }}>
            <Copy muted>{next.time || 'When you have a moment'}</Copy>
            <Button
              title="Open activity"
              kind="ghost"
              onPress={() => router.push({ pathname: '/activity', params: { id: next.id } })}
            />
          </Row>
        </Panel>
      )}
      <SectionTitle
        title="Today’s intentions"
        right={
          <IconButton
            name="plus"
            label="Add activity"
            onPress={() => router.push('/edit-activity')}
          />
        }
      />
      {!rows.length && (
        <Empty
          title="A little breathing room"
          body="Nothing is scheduled today. Add an activity or enjoy the space."
        />
      )}
      {p.sections.map((section) => {
        const items = routineRows.filter((r) => definition(r).sectionId === section.id);
        return items.length ? (
          <View key={section.id}>
            <Copy size={11} muted style={{ letterSpacing: 1.8, paddingTop: 8 }}>
              {section.name.toUpperCase()} · {items.filter((r) => r.status === 'completed').length}/
              {items.length}
            </Copy>
            {items.map((r) => (
              <ActivityRow key={r.id} row={r} day={day} />
            ))}
          </View>
        ) : null;
      })}
      {routineRows
        .filter((r) => !p.sections.some((s) => s.id === definition(r).sectionId))
        .map((r) => (
          <ActivityRow key={r.id} row={r} day={day} />
        ))}
      <SectionTitle
        title="Build & avoid habits"
        right={
          <IconButton name="plus" label="Manage habits" onPress={() => router.push('/habits')} />
        }
      />
      {habitRows.length ? (
        habitRows.map((r) => <ActivityRow key={r.id} row={r} day={day} />)
      ) : (
        <Copy muted>
          No habit check-ins today. Add one in Habits or import a personalized plan.
        </Copy>
      )}
      <Button title="Habit history & setup" kind="ghost" onPress={() => router.push('/habits')} />
      {p.products.length > 0 ? (
        <Button
          title={`Products I use · ${p.products.length}`}
          kind="soft"
          icon="package"
          onPress={() => router.push('/products')}
        />
      ) : null}
      {widgets.includes('goals') && (
        <>
          <SectionTitle title="The bigger picture" />
          <Goals />
        </>
      )}
      {widgets.includes('metrics') && (
        <>
          <SectionTitle title="A quick check-in" />
          <Panel>
            <QuickMeasurement />
          </Panel>
        </>
      )}
      {widgets.includes('reminders') && (
        <>
          <SectionTitle title="Gentle reminders" />
          <Copy muted>
            {repo.settings().enabled
              ? 'Reminders are on. Timed activities with reminders enabled are scheduled locally.'
              : 'Reminders are off. Turn them on in Settings when you’re ready.'}
          </Copy>
        </>
      )}
      {widgets.includes('reflection') && (
        <Panel>
          <Copy heading size={24}>
            Leave a little note
          </Copy>
          <Copy muted size={13}>
            What helped today? What would make tomorrow easier?
          </Copy>
          <Field
            label="Daily reflection"
            value={journal}
            onChangeText={(v) => {
              setJournal(v);
              setSaved(false);
            }}
            multiline
          />
          <Button
            title={saved ? 'Reflection saved' : 'Save reflection'}
            kind="soft"
            onPress={() =>
              attempt(() => {
                repo.saveJournal(day, journal);
                setSaved(true);
              })
            }
          />
        </Panel>
      )}
      <Copy size={11} muted style={{ textAlign: 'center' }}>
        A day is information, never a verdict.
      </Copy>
    </Screen>
  );
}
