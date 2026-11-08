import React, { useState } from 'react';
import { View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { Screen, Copy, Button, Panel, Field } from '../ui/primitives';
import { useTheme, serif } from '../ui/theme';
import { useApp, attempt } from '../state/app';
import { samples, samplePlan, basicPlan } from '../domain/samples';
export function Onboarding() {
  const t = useTheme(),
    { repo, refresh } = useApp(),
    [name, setName] = useState(''),
    [manual, setManual] = useState(false),
    reduced = useReducedMotion();
  return (
    <Screen>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(350)}
        style={{ gap: 26, paddingTop: 18 }}
      >
        <View
          style={{
            width: 58,
            height: 58,
            backgroundColor: t.sage,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Feather name="feather" color={t.primary} size={29} />
        </View>
        <Copy size={12} muted style={{ letterSpacing: 3 }}>
          VERDANT · A LITTLE, EVERY DAY
        </Copy>
        <Copy heading size={48} style={{ lineHeight: 57 }}>
          A rhythm that{'\n'}feels like you.
        </Copy>
        <Copy muted size={17}>
          Your goals. Your pace. A quiet place to turn intentions into everyday actions.
        </Copy>
        <Panel>
          <Copy heading size={24}>
            Bring your own plan
          </Copy>
          <Copy muted>
            Import a JSON plan to personalize your routines, goals and measurements. Everything
            stays on this device.
          </Copy>
          <Button title="Import my plan" icon="upload" onPress={() => router.push('/import')} />
        </Panel>
        <Copy heading size={23}>
          Or begin with a little inspiration
        </Copy>
        {samples.map((s) => (
          <Panel key={s.id}>
            <Copy style={{ fontWeight: '600' }}>{s.title}</Copy>
            <Copy muted size={13}>
              {s.subtitle}
            </Copy>
            <Button
              title="Use this sample"
              kind="soft"
              onPress={() =>
                attempt(() => {
                  repo.apply(samplePlan(s.data));
                  refresh();
                })
              }
            />
          </Panel>
        ))}
        <Button
          title="Create a basic routine"
          kind="ghost"
          icon="plus"
          onPress={() => setManual(!manual)}
        />
        {manual && (
          <Panel>
            <Field
              label="Plan name"
              value={name}
              onChangeText={setName}
              placeholder="My daily rhythm"
            />
            <Button
              title="Create my plan"
              onPress={() =>
                attempt(() => {
                  repo.apply(basicPlan(name));
                  refresh();
                  router.push('/edit-activity');
                })
              }
            />
          </Panel>
        )}
        <Copy muted size={12}>
          No account. No subscription. No connection needed after installation.
        </Copy>
      </Animated.View>
    </Screen>
  );
}
