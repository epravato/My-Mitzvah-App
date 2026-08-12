// Two steps in one screen: request a reset code by email, then enter that
// code plus a new password. Kept as one screen (not two stack entries)
// since the two steps share the email field and there's no separate
// navigation reason to split them.

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, spacing, radius, cardShadow, webInputReset } from '../theme';

export default function ForgotPasswordScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState('request'); // 'request' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleRequestCode() {
    setError('');
    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    setSubmitting(true);
    try {
      await api.forgotPassword(email.trim());
      setInfo('If that email has an account, a code was just sent to it.');
      setStep('reset');
    } catch (submissionError) {
      // forgotPassword only fails on a malformed request, never on "no such
      // account" (the server always replies the same way for that).
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    setError('');
    if (!code.trim() || !newPassword) {
      setError('Enter the code from your email and a new password.');
      return;
    }
    setSubmitting(true);
    try {
      await api.resetPassword(email.trim(), code.trim(), newPassword);
      navigation.navigate('Login');
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + spacing.large }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableOpacity
        style={styles.backLink}
        onPress={() => navigation.navigate('Login')}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={18} color={colors.textMuted} />
        <Text style={styles.backText}>Back to sign in</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Reset your password</Text>
        <Text style={styles.subtitle}>
          {step === 'request'
            ? "Enter your email and we'll send you a reset code"
            : 'Enter the code from your email and a new password'}
        </Text>
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, webInputReset, focusedField === 'email' && styles.inputFocused]}
          placeholder="you@example.com"
          placeholderTextColor={colors.textFaint}
          value={email}
          onChangeText={setEmail}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          editable={step === 'request'}
        />

        {step === 'reset' ? (
          <>
            <Text style={[styles.label, { marginTop: spacing.medium }]}>Reset code</Text>
            <TextInput
              style={[styles.input, webInputReset, focusedField === 'code' && styles.inputFocused]}
              placeholder="8-character code"
              placeholderTextColor={colors.textFaint}
              value={code}
              onChangeText={setCode}
              onFocus={() => setFocusedField('code')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <Text style={[styles.label, { marginTop: spacing.medium }]}>New password</Text>
            <TextInput
              style={[styles.input, webInputReset, focusedField === 'password' && styles.inputFocused]}
              placeholder="At least 8 characters"
              placeholderTextColor={colors.textFaint}
              value={newPassword}
              onChangeText={setNewPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry
              textContentType="newPassword"
            />
          </>
        ) : null}

        {info ? <Text style={styles.info}>{info}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={step === 'request' ? handleRequestCode : handleResetPassword}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={styles.submitText}>
              {step === 'request' ? 'Send reset code' : 'Set new password'}
            </Text>
          )}
        </TouchableOpacity>

        {step === 'reset' ? (
          <TouchableOpacity
            style={styles.resendLink}
            onPress={handleRequestCode}
            activeOpacity={0.7}
            disabled={submitting}
          >
            <Text style={styles.resendText}>Didn't get a code? Send again</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.large,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.large,
  },
  backText: {
    color: colors.textMuted,
    fontSize: 14,
    marginLeft: 2,
  },
  header: {
    marginBottom: spacing.large,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.large,
    padding: spacing.large,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    color: colors.text,
    paddingHorizontal: spacing.medium,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: colors.blue,
  },
  info: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.medium,
  },
  error: {
    color: '#C0392B',
    fontSize: 13,
    marginTop: spacing.medium,
  },
  submitButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.small,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.large,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: '800',
  },
  resendLink: {
    marginTop: spacing.medium,
    alignItems: 'center',
  },
  resendText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '600',
  },
});
