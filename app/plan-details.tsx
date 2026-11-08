import React, { useState } from 'react';
import { router, Redirect } from 'expo-router';
import { Screen, Heading, Copy, Field, Panel, Button, Row } from '../src/ui/primitives';
import { useApp, attempt } from '../src/state/app';
import type { Plan } from '../src/domain/schema';
export default function PlanDetails() {
  const { repo, refresh } = useApp(),
    active = repo.active(),
    [p, setP] = useState<Plan | null>(active);
  if (!p || !active) return <Redirect href="/" />;
  const patch = (v: Partial<Plan>) => setP({ ...p, ...v });
  return (
    <Screen>
      <Heading title="Plan details" />
      <Field label="Plan name" value={p.name} onChangeText={(v) => patch({ name: v })} />
      <Field
        label="Description"
        value={p.description}
        onChangeText={(v) => patch({ description: v })}
        multiline
      />
      <Field
        label="Your name (optional)"
        value={p.profile.name}
        onChangeText={(v) => patch({ profile: { ...p.profile, name: v } })}
      />
      <Field
        label="A note about you (optional)"
        value={p.profile.bio}
        onChangeText={(v) => patch({ profile: { ...p.profile, bio: v } })}
        multiline
      />
      <Copy muted>
        Time zone: {p.timezone}. Use a separate plan ID to change time zone without shifting
        history.
      </Copy>
      <Copy heading size={25}>
        Routine sections
      </Copy>
      {p.sections.map((section, n) => (
        <Panel key={section.id}>
          <Field
            label="Section name"
            value={section.name}
            onChangeText={(v) =>
              patch({ sections: p.sections.map((s, i) => (i === n ? { ...s, name: v } : s)) })
            }
          />
          <Row>
            <Button
              title="Move up"
              kind="ghost"
              disabled={n === 0}
              onPress={() => {
                const sections = [...p.sections];
                [sections[n - 1], sections[n]] = [sections[n], sections[n - 1]];
                patch({ sections });
              }}
            />
            <Button
              title="Move down"
              kind="ghost"
              disabled={n === p.sections.length - 1}
              onPress={() => {
                const sections = [...p.sections];
                [sections[n + 1], sections[n]] = [sections[n], sections[n + 1]];
                patch({ sections });
              }}
            />
          </Row>
        </Panel>
      ))}
      <Button
        title="Add section"
        kind="soft"
        onPress={() =>
          patch({ sections: [...p.sections, { id: `section-${Date.now()}`, name: 'New section' }] })
        }
      />
      <Copy heading size={25}>
        Categories
      </Copy>
      {p.categories.map((c, n) => (
        <Panel key={c.id}>
          <Field
            label="Category name"
            value={c.name}
            onChangeText={(v) =>
              patch({ categories: p.categories.map((x, i) => (i === n ? { ...x, name: v } : x)) })
            }
          />
          <Field
            label="Color (#RRGGBB)"
            value={c.color}
            onChangeText={(v) =>
              patch({ categories: p.categories.map((x, i) => (i === n ? { ...x, color: v } : x)) })
            }
          />
        </Panel>
      ))}
      <Button
        title="Add category"
        kind="soft"
        onPress={() =>
          patch({
            categories: [
              ...p.categories,
              { id: `category-${Date.now()}`, name: 'New category', color: '#587861' },
            ],
          })
        }
      />
      <Copy heading size={25}>
        Measurements
      </Copy>
      {p.metrics.map((m, n) => (
        <Panel key={m.id}>
          <Field
            label="Measurement name"
            value={m.name}
            onChangeText={(v) =>
              patch({ metrics: p.metrics.map((x, i) => (i === n ? { ...x, name: v } : x)) })
            }
          />
          <Field
            label="Unit"
            value={m.unit}
            onChangeText={(v) =>
              patch({ metrics: p.metrics.map((x, i) => (i === n ? { ...x, unit: v } : x)) })
            }
          />
          <Copy muted size={11}>
            Stable ID: {m.id}
          </Copy>
        </Panel>
      ))}
      <Button
        title="Add measurement"
        kind="soft"
        onPress={() =>
          patch({
            metrics: [
              ...p.metrics,
              { id: `metric-${Date.now()}`, name: 'New measurement', unit: 'units' },
            ],
          })
        }
      />
      <Button
        title="Save plan details"
        onPress={() =>
          attempt(() => {
            repo.apply({ ...p, version: active.version + 1 });
            refresh();
            router.back();
          })
        }
      />
      <Button title="Cancel" kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
