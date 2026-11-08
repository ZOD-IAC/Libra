import React from 'react';
import {
  Text,
  View,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Switch,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import { useTheme, serif } from './theme';
export function Copy({
  children,
  size = 15,
  muted = false,
  style,
  heading = false,
}: {
  children: React.ReactNode;
  size?: number;
  muted?: boolean;
  style?: TextStyle;
  heading?: boolean;
}) {
  const t = useTheme();
  return (
    <Text
      style={[
        {
          color: muted ? t.muted : t.ink,
          fontSize: size,
          lineHeight: size * 1.45,
          fontFamily: heading ? serif : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Screen({
  children,
  onRefresh,
}: {
  children: React.ReactNode;
  onRefresh?: () => void;
}) {
  const t = useTheme();
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, paddingBottom: 44, gap: 22 }}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={t.primary} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>{children}</View>
  );
}
export function Panel({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          padding: 20,
          backgroundColor: t.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: t.line,
          gap: 14,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'soft' | 'ghost' | 'danger';
  icon?: React.ComponentProps<typeof Feather>['name'];
  disabled?: boolean;
}) {
  const t = useTheme();
  const color = kind === 'primary' ? t.onPrimary : kind === 'danger' ? t.danger : t.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        paddingVertical: 13,
        paddingHorizontal: 18,
        borderRadius: 16,
        backgroundColor: kind === 'primary' ? t.primary : kind === 'soft' ? t.sage : 'transparent',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
      })}
    >
      {icon && <Feather name={icon} color={color} size={18} />}
      <Text style={{ fontSize: 15, fontWeight: '600', color }}>{title}</Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
}: {
  name: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        backgroundColor: t.soft,
      }}
    >
      <Feather name={name} size={20} color={t.primary} />
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numeric = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  maxLength?: number;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Copy size={13} muted>
        {label}
      </Copy>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.muted}
        multiline={multiline}
        keyboardType={numeric ? 'numbers-and-punctuation' : 'default'}
        maxLength={maxLength ?? (multiline ? 10000 : 400)}
        style={{
          minHeight: 50,
          maxHeight: multiline ? 200 : undefined,
          borderWidth: 1,
          borderColor: t.line,
          borderRadius: 14,
          padding: 14,
          color: t.ink,
          backgroundColor: t.surface,
          fontSize: 16,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const t = useTheme();
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Copy>{label}</Copy>
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: t.primary, false: t.line }}
        thumbColor={t.surface}
      />
    </Row>
  );
}
export function Chips<T extends string>({
  values,
  value,
  onChange,
}: {
  values: { id: T; name: string }[];
  value: T;
  onChange: (s: T) => void;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {values.map((v) => (
        <Pressable
          key={v.id}
          accessibilityRole="button"
          accessibilityState={{ selected: v.id === value }}
          onPress={() => onChange(v.id)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 12,
            minHeight: 44,
            borderRadius: 14,
            backgroundColor: v.id === value ? t.primary : t.soft,
          }}
        >
          <Text style={{ fontSize: 13, color: v.id === value ? t.onPrimary : t.ink }}>
            {v.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export function Heading({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1, gap: 5 }}>
        {eyebrow && (
          <Copy muted size={11} style={{ letterSpacing: 2, fontWeight: '700' }}>
            {eyebrow.toUpperCase()}
          </Copy>
        )}
        <Copy heading size={34}>
          {title}
        </Copy>
      </View>
      {action}
    </Row>
  );
}
export function SectionTitle({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Copy heading size={23}>
        {title}
      </Copy>
      {right}
    </Row>
  );
}
export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <Panel>
      <Copy heading size={23}>
        {title}
      </Copy>
      <Copy muted>{body}</Copy>
    </Panel>
  );
}
export const s = StyleSheet.create({ stack: { gap: 16 }, small: { gap: 8 }, flex: { flex: 1 } });
