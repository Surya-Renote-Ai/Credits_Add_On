import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from './theme';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
}) {
  const outline = variant === 'outline';
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        outline ? styles.buttonOutline : styles.buttonPrimary,
        pressed && !off && { opacity: 0.85 },
        off && { opacity: 0.55 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={outline ? colors.blue : colors.white} />
      ) : (
        <Text style={[styles.buttonText, outline && { color: colors.blue }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...input
}: TextInputProps & { label: string; error?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? { borderColor: colors.error } : null]}
        {...input}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// Edge draws its own reveal button inside password inputs, which would sit next
// to ours. Hide it; the eye below does the same job on every platform.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = 'input::-ms-reveal, input::-ms-clear { display: none; }';
  document.head.appendChild(style);
}

// A Field whose text is hidden as dots until the eye is pressed. Pressing it
// again hides the text.
export function PasswordField({
  label,
  error,
  ...input
}: Omit<TextInputProps, 'secureTextEntry'> & { label: string; error?: string | null }) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.inputWithIcon, error ? { borderColor: colors.error } : null]}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          {...input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((v) => !v)}
          hitSlop={8}
          style={styles.eye}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.blue} />
        </Pressable>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Banner({ kind, text }: { kind: 'error' | 'success'; text: string }) {
  const error = kind === 'error';
  return (
    <View style={[styles.banner, error ? styles.bannerError : styles.bannerSuccess]}>
      <Text style={{ color: error ? colors.error : colors.blueDark, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

export function formatCredits(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    padding: 20,
  },
  button: {
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonPrimary: { backgroundColor: colors.blue },
  buttonOutline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.blue },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  field: { marginBottom: 14 },
  label: { color: colors.text, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    height: 46,
    borderWidth: 1,
    borderColor: colors.blueBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  inputWithIcon: { paddingRight: 44 },
  eye: {
    position: 'absolute',
    right: 0,
    height: 46,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldError: { color: colors.error, fontSize: 12, marginTop: 5 },
  banner: { borderRadius: 8, padding: 12, marginBottom: 14, borderWidth: 1 },
  bannerError: { backgroundColor: colors.errorSoft, borderColor: '#fecdca' },
  bannerSuccess: { backgroundColor: colors.blueSoft, borderColor: colors.blueBorder },
});
