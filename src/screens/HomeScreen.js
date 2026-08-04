// The Today screen, modeled on the MyFitnessPal dashboard.
// Big progress ring up top, quick stats underneath, then today's mitzvot as a
// checklist you log against.

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePosts } from '../context/PostsContext';
import ProgressRing from '../components/ProgressRing';
import { colors, spacing, radius, cardShadow } from '../theme';

export default function HomeScreen({ navigation }) {
  const { user, postedToday, challenges, groups } = usePosts();
  const insets = useSafeAreaInsets();

  const daysDone = user.streak;
  const progress = daysDone / user.goalDays;
  const daysLeft = Math.max(0, user.goalDays - daysDone);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const joinedCount = groups.filter((group) => group.joined && !group.isGlobal).length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.medium }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Today</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.initials}</Text>
        </View>
      </View>

      <View style={[styles.ringCard, cardShadow]}>
        <ProgressRing
          progress={progress}
          centerValue={daysDone}
          centerLabel={`of ${user.goalDays} days`}
          centerCaption={daysLeft > 0 ? `${daysLeft} to go` : 'Challenge complete'}
        />
        <Text style={styles.ringTitle}>40 Day Tefillin Challenge</Text>
        <Text style={styles.ringSubtitle}>
          {postedToday
            ? 'Logged today. Nice work.'
            : 'Not logged yet today'}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <StatBox
          icon="flame-outline"
          value={user.streak}
          label="Current streak"
          tint={colors.gold}
          tintSoft={colors.goldSoft}
        />
        <StatBox
          icon="trophy-outline"
          value={user.bestStreak}
          label="Best streak"
          tint={colors.blue}
          tintSoft={colors.blueSoft}
        />
        <StatBox
          icon="calendar-outline"
          value={user.totalDays}
          label="Total days"
          tint={colors.success}
          tintSoft={colors.successSoft}
        />
      </View>

      <Text style={styles.sectionTitle}>Today's mitzvot</Text>

      <View style={[styles.card, cardShadow]}>
        {challenges.map((challenge, index) => (
          <View
            key={challenge.id}
            style={[styles.mitzvahRow, index > 0 && styles.mitzvahRowDivided]}
          >
            <View style={styles.mitzvahIcon}>
              <Ionicons name={challenge.icon} size={19} color={colors.blue} />
            </View>

            <View style={styles.mitzvahText}>
              <Text style={styles.mitzvahName}>{challenge.name}</Text>
              <Text style={styles.mitzvahSchedule}>{challenge.schedule}</Text>
            </View>

            {challenge.active ? (
              <TouchableOpacity
                style={[styles.logButton, postedToday && styles.logButtonDone]}
                onPress={() => navigation.navigate('Post')}
                activeOpacity={0.85}
              >
                {postedToday ? (
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                ) : null}
                <Text style={[styles.logButtonText, postedToday && styles.logButtonTextDone]}>
                  {postedToday ? 'Done' : 'Log'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.soonPill}>
                <Text style={styles.soonText}>Soon</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Your circles</Text>

      <TouchableOpacity
        style={[styles.card, styles.circlesCard, cardShadow]}
        onPress={() => navigation.navigate('Groups')}
        activeOpacity={0.85}
      >
        <View style={styles.mitzvahIcon}>
          <Ionicons name="people-outline" size={19} color={colors.blue} />
        </View>
        <View style={styles.mitzvahText}>
          <Text style={styles.mitzvahName}>
            {joinedCount} {joinedCount === 1 ? 'group' : 'groups'} keeping you honest
          </Text>
          <Text style={styles.mitzvahSchedule}>Tap to manage or join more</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </TouchableOpacity>
    </ScrollView>
  );
}

function StatBox({ icon, value, label, tint, tintSoft }) {
  return (
    <View style={[styles.statBox, cardShadow]}>
      <View style={[styles.statIcon, { backgroundColor: tintSoft }]}>
        <Ionicons name={icon} size={16} color={tint} />
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.large,
  },
  greeting: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  date: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.blue,
    fontWeight: '800',
    fontSize: 15,
  },
  ringCard: {
    backgroundColor: colors.card,
    borderRadius: radius.large,
    alignItems: 'center',
    paddingVertical: spacing.large,
    paddingHorizontal: spacing.medium,
  },
  ringTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    marginTop: spacing.medium,
  },
  ringSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.small + 2,
    marginTop: spacing.medium,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    padding: spacing.medium,
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.small,
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.large,
    marginBottom: spacing.small + 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.medium,
  },
  mitzvahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.medium,
  },
  mitzvahRowDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mitzvahIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mitzvahText: {
    flex: 1,
    marginLeft: spacing.medium,
  },
  mitzvahName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  mitzvahSchedule: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blue,
    borderRadius: radius.small,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logButtonDone: {
    backgroundColor: colors.successSoft,
  },
  logButtonText: {
    color: colors.card,
    fontWeight: '700',
    fontSize: 13,
  },
  logButtonTextDone: {
    color: colors.success,
    marginLeft: 4,
  },
  soonPill: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.small,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  soonText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  circlesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.medium,
  },
});
