import React, { useState, useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, Copy, Heading, Panel, Button, Field } from '../src/ui/primitives';
import { useApp, attempt } from '../src/state/app';
import { parsePlan, diffPlans, type Plan } from '../src/domain/schema';
import { pickText } from '../src/services/files';
import { consumeSharedText } from '../src/state/incoming';
export default function Import() {
  const { repo, refresh } = useApp(),
    [text, setText] = useState(() => consumeSharedText() ?? ''),
    [busy, setBusy] = useState(false),
    [preview, setPreview] = useState<Plan | null>(null),
    [error, setError] = useState('');
  const { incoming } = useLocalSearchParams<{ incoming?: string }>();
  useEffect(() => {
    const shared = consumeSharedText();
    if (shared !== null) {
      setText(shared);
      setPreview(null);
      setError('');
    }
  }, [incoming]);
  const before = preview ? repo.versions(preview.id)[0] : null,
    diff = preview ? diffPlans(before ? parsePlan(before.config) : null, preview) : null;
  const validate = (value: string) => {
    try {
      setError('');
      setPreview(parsePlan(value));
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : 'Invalid file');
    }
  };
  return (
    <Screen>
      <Heading eyebrow="YOUR ROUTINES, YOUR WAY" title="Import a plan" />
      <Copy muted>Choose a JSON configuration. You’ll review it before anything changes.</Copy>
      <Button
        title={busy ? 'Opening file…' : 'Choose JSON file'}
        icon="file"
        disabled={busy}
        onPress={() =>
          attempt(async () => {
            setBusy(true);
            try {
              const value = await pickText();
              if (value !== null) {
                setText(value);
                validate(value);
              }
            } finally {
              setBusy(false);
            }
          })
        }
      />
      <Field
        label="Or paste configuration JSON"
        maxLength={2_000_000}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setPreview(null);
        }}
        multiline
      />
      <Button title="Validate & preview" kind="soft" onPress={() => validate(text)} />
      {!!error && (
        <Panel>
          <Copy>Check the configuration</Copy>
          <Copy muted size={13}>
            {error}
          </Copy>
        </Panel>
      )}
      {preview && diff && (
        <Panel>
          <Copy heading size={27}>
            {preview.name}
          </Copy>
          <Copy muted>{preview.description}</Copy>
          <Copy>
            {preview.activities.length} activities · {preview.goals.length} goals
          </Copy>
          <Copy muted size={13}>
            {preview.timezone} · version {preview.version} · schema {preview.schemaVersion}
          </Copy>
          {before && (
            <>
              <Copy>Added: {diff.added.join(', ') || 'none'}</Copy>
              <Copy>Changed: {diff.changed.join(', ') || 'none'}</Copy>
              <Copy>Removed: {diff.removed.join(', ') || 'none'}</Copy>
              <Copy muted size={12}>
                Other changes: {diff.otherChanges.join(', ') || 'none'}. Tracked activity records
                retain their snapshots.
              </Copy>
            </>
          )}
          <Copy muted size={12}>
            Activates today. Past records and tracked occurrences are preserved. Untouched
            activities from today onward refresh to this version. A time zone change needs a
            different plan ID. Keep stable IDs for unchanged activities.
          </Copy>
          <Button
            title="Confirm & activate plan"
            onPress={() =>
              attempt(() => {
                repo.apply(preview);
                consumeSharedText();
                refresh();
                router.replace('/');
              })
            }
          />
        </Panel>
      )}
      <Button
        title="Cancel"
        kind="ghost"
        onPress={() => {
          consumeSharedText();
          router.back();
        }}
      />
    </Screen>
  );
}
