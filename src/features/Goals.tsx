import React from 'react';
import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Copy, Row } from '../ui/primitives';
import { useTheme } from '../ui/theme';
import { useApp } from '../state/app';
import { goalProgress } from '../domain/analytics';
export function Goals({ all = false }: { all?: boolean }) {
  const { repo } = useApp(),
    p = repo.active(),
    t = useTheme();
  if (!p) return null;
  const rows = repo.allRows(p.id),
    measurements = repo.measurements(p.id),
    goals = p.goals.filter((g) => !g.archived);
  return (
    <View style={{ gap: 20 }}>
      {(all ? goals : goals.slice(0, 3)).map((g) => {
        const progress = goalProgress(g, rows, measurements);
        return (
          <Pressable
            key={g.id}
            accessibilityRole="button"
            accessibilityLabel={`Edit goal ${g.name}`}
            onPress={() => router.push({ pathname: '/edit-goal', params: { id: g.id } })}
            style={{ gap: 8, paddingVertical: 6 }}
          >
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Copy style={{ fontWeight: '500' }}>{g.name}</Copy>
              </View>
              <Copy muted size={12}>
                {Math.round(progress.value * 10) / 10} / {g.target}
              </Copy>
            </Row>
            <View
              style={{ height: 5, borderRadius: 4, backgroundColor: t.line, overflow: 'hidden' }}
            >
              <View
                style={{ height: 5, width: `${progress.percent}%`, backgroundColor: t.primary }}
              />
            </View>
            {all &&
              g.milestones.map((m) => (
                <Copy key={m.id} muted size={12}>
                  {progress.reached.some((r) => r.id === m.id) ? '✓' : '○'} {m.name} · {m.target}
                </Copy>
              ))}
          </Pressable>
        );
      })}
      {!goals.length && <Copy muted>No goals yet. Add one in Plan when you’re ready.</Copy>}
    </View>
  );
}
