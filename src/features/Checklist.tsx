import React from 'react';
import { View, Pressable } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { Copy, Row } from '../ui/primitives';
import { useTheme } from '../ui/theme';
import type { Activity, Product } from '../domain/schema';
export function Check({
  checked,
  label,
  onPress,
  disabled = false,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
    >
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 9,
          borderWidth: 1.5,
          borderColor: checked ? t.primary : t.muted,
          backgroundColor: checked ? t.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {checked ? <Feather name="check" size={17} color={t.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}
export function Checklist({
  activity,
  checked,
  onToggle,
  products = [],
  onProduct,
  disabled = false,
}: {
  activity: Activity;
  checked: string[];
  onToggle: (id: string, checked: boolean) => void;
  products?: Product[];
  onProduct?: (id: string) => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {activity.steps.map((step, index) => {
        const done = checked.includes(step.id);
        return (
          <View
            key={step.id}
            style={{ borderTopWidth: index ? 1 : 0, borderColor: t.line, paddingVertical: 5 }}
          >
            <Row style={{ alignItems: 'flex-start', gap: 6 }}>
              <Check
                checked={done}
                label={`${done ? 'Undo' : 'Complete'} subtask: ${step.title}`}
                onPress={() => onToggle(step.id, !done)}
                disabled={disabled}
              />
              <View style={{ flex: 1, gap: 5, paddingTop: 10 }}>
                <Copy style={{ fontWeight: '500', opacity: done ? 0.7 : 1 }}>{step.title}</Copy>
                {step.instructions !== '' ? (
                  <Copy size={13} muted>
                    {step.instructions}
                  </Copy>
                ) : null}
                {step.productIds.map((id) => {
                  const p = products.find((p) => p.id === id);
                  return (
                    <Pressable
                      key={id}
                      accessibilityRole="button"
                      accessibilityLabel={`Product: ${p?.name ?? id}`}
                      onPress={() => onProduct?.(id)}
                      disabled={!onProduct}
                      style={{ minHeight: 44, justifyContent: 'center' }}
                    >
                      <Copy size={12} style={{ color: t.primary }}>
                        Product · {p?.name ?? id}
                      </Copy>
                    </Pressable>
                  );
                })}
              </View>
            </Row>
          </View>
        );
      })}
    </View>
  );
}
