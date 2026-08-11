// Creates a real account. Mirrors LoginScreen's look, with a name field added
// and a client-side password length check that matches what the server
// enforces, so people get a fast answer instead of waiting on a round trip.

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
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, cardShadow, webInputReset } from '../theme';

export default function SignupScreen({ navigation }) {
  const { signUp } = useAuth();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      await signUp(email.trim(), password, name.trim());
      // No navigation call needed. App.js swaps to the tabs automatically
      // once signUp() sets a logged-in user.
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
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>40</Text>
        </View>
        <Text style={styles.title}>Join the challenge</Text>
        <Text style={styles.subtitle}>Create an account to start your streak</Text>
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, webInputReset, focusedField === 'name' && styles.inputFocused]}
          placeholder="Your name"
          placeholderTextColor={colors.textFaint}
          value={name}
          onChangeText={setName}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
          textContentType="name"
        />

        <Text style={[styles.label, { marginTop: spacing.medium }]}>Email</Text>
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
        />

        <Text style={[styles.label, { marginTop: spacing.medium }]}>Password</Text>
        <TextInput
          style={[styles.input, webInputReset, focusedField === 'password' && styles.inputFocused]}
          placeholder="At least 8 characters"
          placeholderTextColor={colors.textFaint}
          value={password}
          onChangeText={setPassword}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField(null)}
          secureTextEntry
          textContentType="newPassword"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.85}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={styles.submitText}>Create account</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.switchLink}
        onPress={() => navigation.navigate('Login')}
        activeOpacity={0.7}
      >
        <Text style={styles.switchText}>
          Already have an account? <Text style={styles.switchTextStrong}>Sign in</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.large,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.large,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.medium,
  },
  logoText: {
    color: colors.card,
    fontSize: 20,
    fontWeight: '800',
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
  switchLink: {
    marginTop: spacing.large,
    alignItems: 'center',
  },
  switchText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  switchTextStrong: {
    color: colors.blue,
    fontWeight: '700',
  },
});
