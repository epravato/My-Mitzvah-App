// The main feed. Two modes, matching the hybrid decision from planning.
// "Global" shows everyone using the app. "My Groups" shows only the groups you joined.

import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePosts } from '../context/PostsContext';
import PostCard from '../components/PostCard';
import { colors, spacing, radius, cardShadow } from '../theme';

export default function FeedScreen({ navigation }) {
  const { getVisiblePosts, getGroupName, postedToday } = usePosts();
  const [feedMode, setFeedMode] = useState('global');
  const insets = useSafeAreaInsets();

  const visiblePosts = getVisiblePosts(feedMode);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>

        <View style={styles.toggleRow}>
          <ToggleButton
            label="Global"
            active={feedMode === 'global'}
            onPress={() => setFeedMode('global')}
          />
          <ToggleButton
            label="My Groups"
            active={feedMode === 'groups'}
            onPress={() => setFeedMode('groups')}
          />
        </View>
      </View>

      <FlatList
        data={visiblePosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostCard post={item} groupName={getGroupName(item.groupId)} />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !postedToday ? (
            <TouchableOpacity
              style={[styles.reminder, cardShadow]}
              onPress={() => navigation.navigate('Post')}
              activeOpacity={0.85}
            >
              <View style={styles.reminderIcon}>
                <Ionicons name="sunny-outline" size={18} color={colors.blue} />
              </View>
              <Text style={styles.reminderText}>Have you put on tefillin yet today?</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={38} color={colors.textFaint} />
            <Text style={styles.emptyText}>
              No posts from your groups yet. Join a group or be the first to post.
            </Text>
          </View>
        }
      />
    </View>
  );
}

function ToggleButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.toggleButton, active && styles.toggleButtonActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{label}</Text>
    </TouchableOpacity>
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
    paddingBottom: spacing.small,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: spacing.medium,
    marginBottom: spacing.small,
    backgroundColor: colors.cardMuted,
    borderRadius: radius.small,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.small - 2,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: colors.card,
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: colors.blue,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.medium,
    paddingBottom: spacing.large,
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.medium,
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    marginBottom: spacing.medium,
  },
  reminderIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.small + 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.large,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.medium,
    lineHeight: 20,
  },
});
