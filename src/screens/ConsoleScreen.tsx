import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AddResult, ApiError, AuthHooks, Balance, addCredits, getBalance } from '../api';
import { creditsError, emailError } from '../auth';
import { colors } from '../theme';
import { Banner, Button, Card, Field, formatCredits, formatDate } from '../ui';

export default function ConsoleScreen({ hooks, onLogout }: { hooks: AuthHooks; onLogout: () => void }) {
  const [email, setEmail] = useState('');
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);

  const [credits, setCredits] = useState('');
  const [reason, setReason] = useState('');
  const [creditsErr, setCreditsErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [added, setAdded] = useState<AddResult | null>(null);

  function resetAddForm() {
    setCredits('');
    setReason('');
    setCreditsErr(null);
    setConfirming(false);
    setAddError(null);
  }

  async function lookup(target = email) {
    const err = emailError(target);
    setEmailErr(err);
    setLookupError(null);
    if (err) return;
    setLooking(true);
    try {
      const data = await getBalance(target.trim(), hooks);
      // Clear any half-filled add form when switching to a different user.
      if (data.user.user_id !== balance?.user.user_id) {
        resetAddForm();
        setAdded(null);
      }
      setBalance(data);
    } catch (e) {
      setBalance(null);
      resetAddForm();
      setAdded(null);
      setLookupError(e instanceof ApiError ? e.message : 'Could not load the balance.');
    } finally {
      setLooking(false);
    }
  }

  function review() {
    const err = creditsError(credits);
    setCreditsErr(err);
    setAddError(null);
    setAdded(null);
    if (!err) setConfirming(true);
  }

  async function confirmAdd() {
    if (!balance) return;
    setAdding(true);
    setAddError(null);
    try {
      // Add to the account that was looked up, not whatever is in the search box now.
      const result = await addCredits(balance.user.email, credits.trim(), reason.trim(), hooks);
      setAdded(result);
      resetAddForm();
      await lookup(balance.user.email);
    } catch (e) {
      setConfirming(false);
      setAddError(e instanceof ApiError ? e.message : 'Could not add credits.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.headerTitle}>ReNote Credits Console</Text>
            <Text style={styles.headerSub} numberOfLines={1}>Signed in as {hooks.session.email}</Text>
          </View>
          <Text accessibilityRole="button" onPress={onLogout} style={styles.signOut}>Sign out</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={styles.sectionTitle}>Find a user</Text>
          <Text style={styles.hint}>Enter the email the user signed up with.</Text>
          {lookupError ? <Banner kind="error" text={lookupError} /> : null}
          <Field
            label="User email"
            value={email}
            onChangeText={setEmail}
            placeholder="user@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onSubmitEditing={() => lookup()}
            error={emailErr}
          />
          <Button title="Get balance" onPress={() => lookup()} loading={looking} />
        </Card>

        {balance ? (
          <>
            <Card style={styles.gap}>
              <Text style={styles.userName}>{balance.user.full_name || balance.user.email}</Text>
              <Text style={styles.userMeta}>{balance.user.email}</Text>
              <Text style={styles.userMeta}>User ID: {balance.user.user_id}</Text>

              <View style={styles.balanceBox}>
                <Text style={styles.balanceLabel}>Current balance</Text>
                <Text style={styles.balanceValue}>{formatCredits(balance.balance)}</Text>
                <Text style={styles.balanceLabel}>credits</Text>
              </View>

              <View style={styles.statsRow}>
                <Stat label="Plan" value={balance.plan || '-'} />
                <Stat label="Monthly allowance" value={formatCredits(balance.monthly?.total ?? balance.monthly_credits)} />
              </View>
              <View style={styles.statsRow}>
                <Stat label="Monthly left" value={formatCredits(balance.monthly?.remaining)} />
                <Stat label="Add-on credits left" value={formatCredits(balance.addon?.remaining)} />
              </View>
              <View style={styles.statsRow}>
                <Stat label="Next refill" value={formatDate(balance.next_refill_at)} />
                <Stat label="Plan renews" value={formatDate(balance.plan_renews_at)} />
              </View>
            </Card>

            <Card style={styles.gap}>
              <Text style={styles.sectionTitle}>Add credits</Text>
              <Text style={styles.hint}>
                Added credits are kept through the monthly reset and recorded in the credit ledger.
              </Text>
              {added ? (
                <Banner
                  kind="success"
                  text={`Added ${formatCredits(added.credits_added)} credits to ${added.user.email}. Balance: ${formatCredits(added.balance_before)} → ${formatCredits(added.balance_after)}.`}
                />
              ) : null}
              {addError ? <Banner kind="error" text={addError} /> : null}

              {confirming ? (
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmText}>
                    Add <Text style={styles.bold}>{formatCredits(Number(credits))}</Text> credits to{' '}
                    <Text style={styles.bold}>{balance.user.email}</Text>?
                  </Text>
                  <Text style={styles.confirmMeta}>
                    New balance will be {formatCredits(balance.balance + Number(credits))} credits.
                    {reason.trim() ? `\nReason: ${reason.trim()}` : ''}
                  </Text>
                  <View style={styles.row}>
                    <View style={styles.flex}>
                      <Button title="Cancel" variant="outline" onPress={() => setConfirming(false)} disabled={adding} />
                    </View>
                    <View style={styles.flex}>
                      <Button title="Confirm" onPress={confirmAdd} loading={adding} />
                    </View>
                  </View>
                </View>
              ) : (
                <>
                  <Field
                    label="Number of credits"
                    value={credits}
                    onChangeText={(t) => {
                      setCredits(t);
                      if (creditsErr) setCreditsErr(null);
                    }}
                    placeholder="e.g. 100"
                    keyboardType="decimal-pad"
                    error={creditsErr}
                  />
                  <Field
                    label="Reason (optional)"
                    value={reason}
                    onChangeText={setReason}
                    placeholder="e.g. Support compensation"
                    maxLength={500}
                  />
                  <Button title="Add credits" onPress={review} />
                </>
              )}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.page },
  header: { backgroundColor: colors.blue, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16 },
  headerInner: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  headerSub: { color: '#dbe6ff', fontSize: 13, marginTop: 2 },
  signOut: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#9db8f7',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  gap: { marginTop: 16 },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 13, marginTop: 4, marginBottom: 16 },
  userName: { color: colors.text, fontSize: 18, fontWeight: '700' },
  userMeta: { color: colors.muted, fontSize: 13, marginTop: 3 },
  balanceBox: {
    backgroundColor: colors.blueSoft,
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
    marginVertical: 18,
  },
  balanceLabel: { color: colors.muted, fontSize: 13 },
  balanceValue: { color: colors.blue, fontSize: 38, fontWeight: '700', marginVertical: 2 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stat: { flex: 1, borderWidth: 1, borderColor: colors.blueBorder, borderRadius: 8, padding: 12 },
  statLabel: { color: colors.muted, fontSize: 12 },
  statValue: { color: colors.text, fontSize: 15, fontWeight: '600', marginTop: 4 },
  confirmBox: { borderWidth: 1, borderColor: colors.blue, borderRadius: 8, padding: 16, backgroundColor: colors.blueSoft },
  confirmText: { color: colors.text, fontSize: 15 },
  confirmMeta: { color: colors.muted, fontSize: 13, marginTop: 6, marginBottom: 14 },
  bold: { fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
