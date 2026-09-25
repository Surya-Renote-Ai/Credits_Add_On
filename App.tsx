import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthHooks, Session } from './src/api';
import LoginScreen from './src/screens/LoginScreen';
import ConsoleScreen from './src/screens/ConsoleScreen';
import { colors } from './src/theme';

// The session lives in memory only: closing or reloading the app signs the
// admin out, so a superadmin token is never left behind in storage.
export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  const hooks = useMemo<AuthHooks | null>(
    () =>
      session && {
        session,
        onSession: setSession,
        onExpired: () => setSession(null),
      },
    [session],
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root}>
        <StatusBar style={session ? 'light' : 'dark'} />
        {hooks ? (
          <ConsoleScreen hooks={hooks} onLogout={() => setSession(null)} />
        ) : (
          <LoginScreen onLogin={setSession} />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.page },
});
