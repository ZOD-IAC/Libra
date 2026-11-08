import React, { useEffect, useRef, useState } from 'react';
import { Field } from './primitives';
export function DelimitedField<T extends string | number>({
  label,
  value,
  parse,
  onChange,
}: {
  label: string;
  value: T[];
  parse: (text: string) => T;
  onChange: (value: T[]) => void;
}) {
  const serialized = value.join(','),
    [draft, setDraft] = useState(serialized),
    emitted = useRef(serialized);
  useEffect(() => {
    if (serialized !== emitted.current) {
      setDraft(serialized);
      emitted.current = serialized;
    }
  }, [serialized]);
  return (
    <Field
      label={label}
      value={draft}
      onChangeText={(text) => {
        setDraft(text);
        const next = text.split(',').map((v) => parse(v.trim()));
        emitted.current = next.join(',');
        onChange(next);
      }}
    />
  );
}
