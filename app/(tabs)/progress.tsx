import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Redirect, router } from 'expo-router';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useApp, attempt } from '../../src/state/app';
import {
  Screen,
  Copy,
  Heading,
  Panel,
  Row,
  SectionTitle,
  Chips,
  Button,
} from '../../src/ui/primitives';
import { DateField } from '../../src/ui/DateField';
import { useTheme } from '../../src/ui/theme';
import { today, addDays, datesBetween } from '../../src/domain/schedule';
import { summary, definition } from '../../src/domain/analytics';
import { Goals } from '../../src/features/Goals';
export default function Progress() {
  const { repo, refresh } = useApp(),
    p = repo.active(),
    t = useTheme(),
    [period, setPeriod] = useState('7'),
    [end, setEnd] = useState(p ? today(p.timezone) : '2026-01-01'),
    [metric, setMetric] = useState(p?.metrics[0]?.id ?? '');
  if (!p) return <Redirect href="/" />;
  const day = today(p.timezone),
    start = addDays(end, 1 - Number(period));
  repo.ensure(start, end);
  const rows = repo.rows(start, end).filter((r) => r.due_date <= day),
    stats = summary(rows, day),
    dates = datesBetween(start, end),
    measurements = repo.measurements(p.id),
    points = measurements.filter((m) => m.metric_id === metric && m.date >= start && m.date <= end),
    milestones = repo.milestones(p.id);
  const daily = dates.map((date, index) => {
    const s = summary(
      rows.filter((r) => r.due_date === date),
      day,
    );
    return {
      value: s.percent,
      label: period === '7' ? date.slice(8) : index % 5 === 0 ? date.slice(8) : '',
      frontColor: s.total ? t.primary : t.line,
    };
  });
  return (
    <Screen onRefresh={refresh}>
      <Heading eyebrow="NOTICE THE PATTERNS" title="Your progress" />
      <Copy muted>Progress is a pattern, not a perfect streak.</Copy>
      <Chips
        values={[
          { id: '7', name: '7 days' },
          { id: '30', name: '30 days' },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <DateField label="Period ending" value={end} onChange={setEnd} />
      <Panel>
        <Copy size={11} muted style={{ letterSpacing: 2 }}>
          ACTIVITY COMPLETION
        </Copy>
        <Row style={{ alignItems: 'baseline' }}>
          <Copy heading size={52}>
            {stats.percent}%
          </Copy>
          <Copy muted>
            {stats.completed} / {stats.total} scheduled
          </Copy>
        </Row>
        <Copy muted size={13}>
          {stats.total
            ? `${stats.completed} complete, ${stats.partial} partial, ${stats.skipped} skipped, ${stats.missed} missed, ${stats.unrecorded} habit check-ins unrecorded, ${stats.pending} pending.`
            : 'No scheduled activities in this period yet.'}
        </Copy>
        <BarChart
          data={daily}
          height={140}
          barWidth={period === '7' ? 21 : 7}
          spacing={period === '7' ? 16 : 3}
          maxValue={100}
          noOfSections={2}
          hideRules
          yAxisThickness={0}
          xAxisThickness={1}
          xAxisColor={t.line}
          yAxisTextStyle={{ color: t.muted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: t.muted, fontSize: 10 }}
          width={260}
          backgroundColor={t.surface}
          isAnimated={false}
        />
        <Copy muted size={11}>
          Subtask progress receives partial credit; full completion remains separate. Avoidance
          support steps do not count as a confirmed habit result. Skipped activities stay in the
          denominator. Not-applicable activities are excluded. Empty days appear as zero and are
          excluded from the period percentage.
        </Copy>
      </Panel>
      <SectionTitle title="Your bigger picture" />
      <Goals all />
      {p.metrics.length > 0 && (
        <>
          <SectionTitle title="Measurements" />
          <Chips
            values={p.metrics.map((m) => ({ id: m.id, name: m.name }))}
            value={metric}
            onChange={setMetric}
          />
          <Panel>
            {points.length > 1 ? (
              <LineChart
                data={points.map((point, index) => ({
                  value: point.value,
                  label: index === 0 || index === points.length - 1 ? point.date.slice(5) : '',
                }))}
                height={150}
                width={250}
                spacing={Math.max(18, 250 / Math.max(1, points.length - 1))}
                color={t.primary}
                dataPointsColor={t.primary}
                yAxisTextStyle={{ color: t.muted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: t.muted, fontSize: 10 }}
                yAxisThickness={0}
                xAxisColor={t.line}
                hideRules
                curved={false}
              />
            ) : (
              <Copy muted>
                {points.length === 1
                  ? 'One recorded point. Add another to see a trend.'
                  : 'No measurements recorded in this period.'}
              </Copy>
            )}
            <Copy size={12} muted>
              {p.metrics.find((m) => m.id === metric)?.unit} · recorded values, in date order
            </Copy>
            {points
              .slice(-15)
              .reverse()
              .map((m) => (
                <Row key={m.id} style={{ justifyContent: 'space-between' }}>
                  <Copy size={13}>
                    {m.date} · {m.value}
                  </Copy>
                  {!m.instance_id ? (
                    <Row>
                      <Button
                        title="Edit"
                        kind="ghost"
                        onPress={() =>
                          router.push({ pathname: '/measurement', params: { id: m.id } })
                        }
                      />
                      <Button
                        title="Delete"
                        kind="ghost"
                        onPress={() =>
                          Alert.alert('Delete measurement?', 'This removes this entry.', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () =>
                                attempt(() => {
                                  repo.removeMeasurement(m.id);
                                  refresh();
                                }),
                            },
                          ])
                        }
                      />
                    </Row>
                  ) : (
                    <Copy muted size={11}>
                      From activity
                    </Copy>
                  )}
                </Row>
              ))}
          </Panel>
        </>
      )}
      <SectionTitle title="Activity adherence" />
      {p.activities.map((a) => {
        const relevant = rows.filter((r) => r.activity_id === a.id),
          s = summary(relevant, day);
        return (
          <Row key={a.id} style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Copy>{a.title}</Copy>
              <Copy muted size={12}>
                {s.skipped} skipped · {s.missed} missed
              </Copy>
            </View>
            <Copy muted>{s.total ? `${s.percent}%` : '—'}</Copy>
          </Row>
        );
      })}
      <Panel>
        <Copy heading size={24}>
          What the records say
        </Copy>
        <Copy muted>
          {stats.total
            ? `You completed ${stats.completed} of ${stats.total} scheduled activities in this period. ${stats.missed ? `${stats.missed} went unrecorded. Consider whether their timing or scope needs adjusting.` : 'Keep observing which activities fit your day.'}`
            : 'Start with a few records. There isn’t enough information for a useful pattern yet.'}
        </Copy>
        <Copy muted size={12}>
          These records describe activity; they do not establish cause and effect.
        </Copy>
      </Panel>
      <SectionTitle title="Milestone history" />
      {milestones.length ? (
        milestones.map((m) => (
          <Copy key={`${m.goal_id}/${m.milestone_id}`} muted>
            {p.goals
              .find((g) => g.id === m.goal_id)
              ?.milestones.find((x) => x.id === m.milestone_id)?.name ?? m.milestone_id}{' '}
            · {m.reached_on}
          </Copy>
        ))
      ) : (
        <Copy muted>No milestones reached yet.</Copy>
      )}
    </Screen>
  );
}
