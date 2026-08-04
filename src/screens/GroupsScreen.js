// Your groups, plus groups you could join. This is the hybrid model in practice.
// The global feed is always there, and private groups sit alongside it.

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePosts } from '../context/PostsContext';
import { colors, spacing, radius, cardShadow, webInputReset } from '../theme';

export default function GroupsScreen() {
  const { groups, toggleGroupMembership, createGroup } = usePosts();
  const insets = useSafeAreaInsets();
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [nameFocused, setNameFocused] = useState(false);

  function handleCreate() {
    if (!newGroupName.trim()) {
      return;
    }
    createGroup({ name: newGroupName.trim() });
    setNewGroupName('');
    setShowCreate(false);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Groups</Text>
            <Text style={styles.subtitle}>Small circles keep the streak honest</Text>
          </View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreate((previous) => !previous)}
            activeOpacity={0.85}
          >
            <Ionicons name={showCreate ? 'close' : 'add'} size={20} color={colors.card} />
          </TouchableOpacity>
        </View>

        {showCreate ? (
          <View style={styles.createBox}>
            <TextInput
              style={[styles.input, webInputReset, nameFocused && styles.inputFocused]}
              placeholder="Group name"
              placeholderTextColor={colors.textFaint}
              value={newGroupName}
              onChangeText={setNewGroupName}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleCreate}
              activeOpacity={0.85}
            >
              <Text style={styles.saveButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={[styles.groupCard, cardShadow]}>
            <View style={styles.groupIcon}>
              <Ionicons
                name={item.isGlobal ? 'globe-outline' : 'people-outline'}
                size={19}
                color={colors.blue}
              />
            </View>

            <View style={styles.groupText}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.groupDescription}>{item.description}</Text>
              <Text style={styles.groupMeta}>
                {item.memberCount} members
                {item.inviteCode ? ` · code ${item.inviteCode}` : ''}
              </Text>
            </View>

            {item.isGlobal ? (
              <View style={styles.alwaysOnPill}>
                <Text style={styles.alwaysOnText}>Always on</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.joinButton, item.joined && styles.joinedButton]}
                onPress={() => toggleGroupMembership(item.id)}
                activeOpacity={0.85}
              >
                <Text style={[styles.joinText, item.joined && styles.joinedText]}>
                  {item.joined ? 'Joined' : 'Join'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.medium,
    paddingTop: spacing.medium,
    paddingBottom: spacing.medium,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  createButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.medium,
    gap: spacing.small,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    color: colors.text,
    paddingHorizontal: spacing.medium,
    paddingVertical: 11,
    fontSize: 14,
  },
  inputFocused: {
    borderColor: colors.blue,
  },
  saveButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.small,
    paddingHorizontal: spacing.medium,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 14,
  },
  listContent: {
    padding: spacing.medium,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    padding: spacing.medium,
    marginBottom: spacing.small + 4,
  },
  groupIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupText: {
    flex: 1,
    marginLeft: spacing.medium,
  },
  groupName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  groupDescription: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  groupMeta: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 4,
  },
  joinButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.small,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinedButton: {
    backgroundColor: colors.cardMuted,
  },
  joinText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: '800',
  },
  joinedText: {
    color: colors.textMuted,
  },
  alwaysOnPill: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.small,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  alwaysOnText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
});
