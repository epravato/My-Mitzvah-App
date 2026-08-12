// Your own numbers and history. The dot grid is the accountability part, since a
// gap in the grid is a lot more obvious than a number going down.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePosts } from '../context/PostsContext';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';
import { colors, spacing, radius, cardShadow } from '../theme';
import { todayKey } from '../dateHelpers';

const DAYS_SHOWN = 28;

export default function ProfileScreen() {
  const { user, posts, getGroupName, streakIsAlive } = usePosts();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const myPosts = posts.filter((post) => post.userId === user.id);

  // Last 28 days, one dot per real logged day. A brand-new account has no
  // posts yet, so every dot starts missed until the person actually logs.
  const loggedDayKeys = new Set(myPosts.map((post) => todayKey(new Date(post.createdAt))));
  const history = Array.from({ length: DAYS_SHOWN }, (_, index) => {
    const daysAgo = DAYS_SHOWN - 1 - index;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return loggedDayKeys.has(todayKey(date));
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.medium }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.initials}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.handle}>
          {streakIsAlive
            ? `Day ${user.streak} of the 40 day challenge`
            : 'Streak broken. Log today to start again.'}
        </Text>
      </View>

      <View style={[styles.statsCard, cardShadow]}>
        <Stat value={user.streak} label="Current" icon="flame-outline" tint={colors.gold} />
        <View style={styles.statDivider} />
        <Stat value={user.bestStreak} label="Best" icon="trophy-outline" tint={colors.blue} />
        <View style={styles.statDivider} />
        <Stat
          value={user.totalDays}
          label="Total days"
          icon="calendar-outline"
          tint={colors.success}
        />
      </View>

      <Text style={styles.sectionTitle}>Last 4 weeks</Text>
      <View style={[styles.gridCard, cardShadow]}>
        <View style={styles.grid}>
          {history.map((done, index) => (
            <View
              key={index}
              style={[styles.dot, done ? styles.dotDone : styles.dotMissed]}
            />
          ))}
        </View>
        <View style={styles.legend}>
          <View style={[styles.dot, styles.dotDone, styles.legendDot]} />
          <Text style={styles.legendText}>Logged</Text>
          <View style={[styles.dot, styles.dotMissed, styles.legendDot]} />
          <Text style={styles.legendText}>Missed</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Your posts</Text>
      {myPosts.length > 0 ? (
        myPosts.map((post) => (
          <PostCard key={post.id} post={post} groupName={getGroupName(post.groupId)} />
        ))
      ) : (
        <View style={[styles.emptyCard, cardShadow]}>
          <Ionicons name="camera-outline" size={30} color={colors.textFaint} />
          <Text style={styles.emptyText}>
            Nothing posted yet. Log today and it shows up here.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.resetButton} onPress={signOut} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={15} color={colors.textMuted} />
        <Text style={styles.resetText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ value, label, icon, tint }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={16} color={tint} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.medium,
    paddingBottom: spacing.large * 2,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: spacing.large,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.blue,
    fontSize: 26,
    fontWeight: '800',
  },
  name: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '800',
    marginTop: spacing.small + 2,
  },
  handle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    paddingVertical: spacing.medium,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.large,
    marginBottom: spacing.small + 2,
  },
  gridCard: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    padding: spacing.medium,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // Seven per row so each row reads as one week.
  dot: {
    width: '12.5%',
    aspectRatio: 1,
    borderRadius: 7,
    marginRight: '1.7%',
    marginBottom: 7,
  },
  dotDone: {
    backgroundColor: colors.blue,
  },
  dotMissed: {
    backgroundColor: colors.cardMuted,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.medium,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    marginRight: 0,
    marginBottom: 0,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 12,
    marginLeft: 6,
    marginRight: spacing.medium,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    padding: spacing.large,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.small,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.large,
    paddingVertical: spacing.small,
  },
  resetText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});
