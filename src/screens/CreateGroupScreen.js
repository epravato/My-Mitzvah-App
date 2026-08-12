// Name, description, and a join policy — mirrors SignupScreen's card-on-background layout.

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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePosts } from '../context/PostsContext';
import { colors, spacing, radius, cardShadow, webInputReset } from '../theme';

const POLICIES = [
  {
    value: 'open',
    label: 'Open',
    icon: 'lock-open-outline',
    description: 'Anyone who finds it can join instantly.',
  },
  {
    value: 'approval',
    label: 'Approval required',
    icon: 'checkmark-done-outline',
    description: 'You approve each join request.',
  },
  {
    value: 'invite',
    label: 'Invite only',
    icon: 'key-outline',
    description: "Hidden from search, joinable only with the group's code.",
  },
];

export default function CreateGroupScreen({ navigation }) {
  const { createGroup } = usePosts();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinPolicy, setJoinPolicy] = useState('approval');
  const [focusedField, setFocusedField] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && !submitting;

  async function handleCreate() {
    if (!name.trim()) {
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const group = await createGroup({
        name: name.trim(),
        description: description.trim(),
        joinPolicy,
      });
      navigation.replace('GroupDetail', { groupId: group.id, groupName: group.name });
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + spacing.medium }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>New group</Text>
        <View style={styles.backButton} />
      </View>

      <View style={[styles.card, cardShadow]}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, webInputReset, focusedField === 'name' && styles.inputFocused]}
          placeholder="Group name"
          placeholderTextColor={colors.textFaint}
          value={name}
          onChangeText={setName}
          onFocus={() => setFocusedField('name')}
          onBlur={() => setFocusedField(null)}
          maxLength={50}
        />

        <Text style={[styles.label, { marginTop: spacing.medium }]}>Description</Text>
        <TextInput
          style={[
            styles.input,
            styles.multiline,
            webInputReset,
            focusedField === 'description' && styles.inputFocused,
          ]}
          placeholder="What's this group about?"
          placeholderTextColor={colors.textFaint}
          value={description}
          onChangeText={setDescription}
          onFocus={() => setFocusedField('description')}
          onBlur={() => setFocusedField(null)}
          multiline
          maxLength={140}
        />

        <Text style={[styles.label, { marginTop: spacing.medium }]}>Who can join</Text>
        {POLICIES.map((policy) => {
          const selected = joinPolicy === policy.value;
          return (
            <TouchableOpacity
              key={policy.value}
              style={[styles.policyCard, selected && styles.policyCardSelected]}
              onPress={() => setJoinPolicy(policy.value)}
              activeOpacity={0.85}
            >
              <View style={[styles.policyIcon, selected && styles.policyIconSelected]}>
                <Ionicons
                  name={policy.icon}
                  size={18}
                  color={selected ? colors.card : colors.blue}
                />
              </View>
              <View style={styles.policyText}>
                <Text style={styles.policyLabel}>{policy.label}</Text>
                <Text style={styles.policyDescription}>{policy.description}</Text>
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={selected ? colors.blue : colors.textFaint}
              />
            </TouchableOpacity>
          );
        })}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={handleCreate}
          activeOpacity={0.85}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color={colors.card} />
          ) : (
            <Text style={styles.submitText}>Create</Text>
          )}
        </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.large,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
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
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: colors.blue,
  },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.medium,
    padding: spacing.medium,
    marginTop: spacing.small,
  },
  policyCardSelected: {
    borderColor: colors.blue,
    backgroundColor: colors.blueSoft,
  },
  policyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyIconSelected: {
    backgroundColor: colors.blue,
  },
  policyText: {
    flex: 1,
    marginLeft: spacing.medium,
    marginRight: spacing.small,
  },
  policyLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  policyDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
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
    opacity: 0.5,
  },
  submitText: {
    color: colors.card,
    fontSize: 15,
    fontWeight: '800',
  },
});
