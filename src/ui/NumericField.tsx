import React, { useEffect, useRef, useState } from 'react';
import { Field } from './primitives';
// Preserve intermediate input ("-", "7.", "0.0") while emitting numeric values.
// External changes, such as filling a timer value, still replace the draft.
export function NumericField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | string | undefined;
  onChange: (v: number | string) => void;
}) {
  const [draft, setDraft] = useState(String(value ?? ''));
  const emitted = useRef(value);
  useEffect(() => {
    if (!Object.is(value, emitted.current)) {
      setDraft(String(value ?? ''));
      emitted.current = value;
    }
  }, [value]);
  return (
    <Field
      label={label}
      numeric
      value={draft}
      onChangeText={(text) => {
        setDraft(text);
        const next = text.trim() === '' ? '' : Number(text);
        emitted.current = next;
        onChange(next);
      }}
    />
  );
}
