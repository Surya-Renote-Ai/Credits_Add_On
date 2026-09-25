import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError, Session, login } from '../api';
import { decodeJwt, emailError, isSuperadmin } from '../auth';
import { colors } from '../theme';
import { Banner, Button, Card, Field, PasswordField } from '../ui';

export default function LoginScreen({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const errs = {
      email: emailError(email),
      password: password ? null : 'Enter your password.',
    };
    setFieldErrors(errs);
    setError(null);
    if (errs.email || errs.password) return;

    setLoading(true);
    try {
      const tokens = await login(email.trim(), password);
      // Only superadmins get past this screen. The backend enforces the same
      // rule on every admin call; this check just gives a clear message early.
      if (!isSuperadmin(tokens.accessToken)) {
        setError('This account does not have superadmin access.');
        return;
      }
      const claims = decodeJwt(tokens.accessToken) || {};
      setPassword('');
      onLogin({ ...tokens, email: claims.email || email.trim() });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.wrap}>
        <Text style={styles.brand}>ReNote</Text>
        <Text style={styles.subtitle}>Credits Console</Text>
        <Card>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.hint}>For superadmin accounts only.</Text>
          {error ? <Banner kind="error" text={error} /> : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="admin@renote.ai"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            error={fieldErrors.email}
          />
          <PasswordField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            autoComplete="password"
            onSubmitEditing={submit}
            error={fieldErrors.password}
          />
          <Button title="Sign in" onPress={submit} loading={loading} />
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page, justifyContent: 'center', padding: 16 },
  wrap: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  brand: { color: colors.blue, fontSize: 28, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 15, textAlign: 'center', marginBottom: 24, marginTop: 2 },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 18 },
});
