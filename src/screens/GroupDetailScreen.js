// One group's home base: the leaderboard is the point, everything else (invite
// code, pending requests, member roster, leaving) supports it. Mirrors the
// stats-card-then-list rhythm from ProfileScreen so it doesn't feel like a
// different app.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePosts } from '../context/PostsContext';
import { colors, spacing, radius, cardShadow } from '../theme';

const SORT_OPTIONS = [
  { value: 'streak', label: 'Streak' },
  { value: 'total', label: 'Total days' },
  { value: 'group', label: 'In this group' },
];

const JOIN_POLICY_LABEL = {
  open: 'Anyone can join',
  approval: 'Owner approves new members',
  invite: 'Invite only',
};

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const {
    groups,
    challenges,
    getGroupLeaderboard,
    getGroupMembers,
    getGroupRequests,
    approveGroupRequest,
    denyGroupRequest,
    leaveGroup,
  } = usePosts();
  const insets = useSafeAreaInsets();

  const group = groups.find((g) => g.id === groupId);
  const displayName = group ? group.name : groupName;
  const isActiveMember = group ? group.membershipStatus === 'active' : false;
  const isOwner = group ? group.role === 'owner' : false;

  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const [requests, setRequests] = useState([]);
  const [busyRequestId, setBusyRequestId] = useState(null);

  const [challengeFilter, setChallengeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('streak');
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const hasLoadedLeaderboardOnce = useRef(false);

  const [showAllMembers, setShowAllMembers] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  const [leaveConfirming, setLeaveConfirming] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState(null);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      setMembers(await getGroupMembers(groupId));
    } catch (error) {
      console.warn('Could not load members.', error);
    } finally {
      setMembersLoading(false);
    }
  }, [groupId, getGroupMembers]);

  const loadRequests = useCallback(async () => {
    try {
      setRequests(await getGroupRequests(groupId));
    } catch (error) {
      console.warn('Could not load join requests.', error);
    }
  }, [groupId, getGroupRequests]);

  const loadLeaderboard = useCallback(async () => {
    if (!hasLoadedLeaderboardOnce.current) {
      setLeaderboardLoading(true);
    }
    try {
      setLeaderboard(
        await getGroupLeaderboard(groupId, { challenge: challengeFilter, sort: sortBy })
      );
    } catch (error) {
      console.warn('Could not load leaderboard.', error);
    } finally {
      hasLoadedLeaderboardOnce.current = true;
      setLeaderboardLoading(false);
    }
  }, [groupId, challengeFilter, sortBy, getGroupLeaderboard]);

  useEffect(() => {
    if (!isActiveMember) {
      return;
    }
    loadMembers();
  }, [isActiveMember, loadMembers]);

  useEffect(() => {
    if (!isOwner) {
      return;
    }
    loadRequests();
  }, [isOwner, loadRequests]);

  useEffect(() => {
    if (!isActiveMember) {
      return;
    }
    loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActiveMember, groupId, challengeFilter, sortBy]);

  async function handleApprove(userId) {
    setBusyRequestId(userId);
    try {
      const request = requests.find((r) => r.userId === userId);
      await approveGroupRequest(groupId, userId);
      setRequests((previous) => previous.filter((r) => r.userId !== userId));
      if (request) {
        setMembers((previous) => [
          ...previous,
          { userId, name: request.name, initials: request.initials, role: 'member', joinedAt: Date.now() },
        ]);
      }
    } catch (error) {
      console.warn('Could not approve request.', error);
    } finally {
      setBusyRequestId(null);
    }
  }

  async function handleDeny(userId) {
    setBusyRequestId(userId);
    try {
      await denyGroupRequest(groupId, userId);
      setRequests((previous) => previous.filter((r) => r.userId !== userId));
    } catch (error) {
      console.warn('Could not deny request.', error);
    } finally {
      setBusyRequestId(null);
    }
  }

  async function handleShareCode() {
    try {
      await Share.share({
        message: `Join "${displayName}" on MyMitzvahs with the code ${group.inviteCode}`,
      });
      setShareFeedback(true);
      setTimeout(() => setShareFeedback(false), 2000);
    } catch (error) {
      // User cancelled the share sheet, or it's unsupported on this platform.
      // Neither is worth surfacing.
    }
  }

  async function handleLeave() {
    setLeaveBusy(true);
    setLeaveError(null);
    try {
      await leaveGroup(groupId);
      navigation.navigate('Groups');
    } catch (error) {
      setLeaveError(error.message);
      setLeaveBusy(false);
    }
  }

  const memberCount = group ? group.memberCount : null;
  const policyLabel = group ? JOIN_POLICY_LABEL[group.joinPolicy] : null;
  const visibleMembers = showAllMembers ? members : members.slice(0, 6);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.small }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>
            {displayName}
          </Text>
          {memberCount !== null ? (
            <Text style={styles.subtitle}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
              {policyLabel ? ` · ${policyLabel}` : ''}
            </Text>
          ) : null}
        </View>
      </View>

      {group && group.membershipStatus === 'pending' ? (
        <View style={[styles.pendingCard, cardShadow]}>
          <Ionicons name="time-outline" size={20} color={colors.textMuted} />
          <Text style={styles.pendingText}>
            Your request to join is waiting on the owner's approval.
          </Text>
        </View>
      ) : null}

      {group && !group.isGlobal && isActiveMember && group.inviteCode ? (
        <View style={[styles.card, cardShadow]}>
          <Text style={styles.cardLabel}>Invite code</Text>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteCode}>{group.inviteCode}</Text>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareCode}
              activeOpacity={0.85}
            >
              <Ionicons
                name={shareFeedback ? 'checkmark' : 'share-outline'}
                size={15}
                color={colors.blue}
              />
              <Text style={styles.shareButtonText}>{shareFeedback ? 'Shared' : 'Share'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {isOwner && requests.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Pending requests</Text>
          <View style={[styles.card, cardShadow]}>
            {requests.map((request, index) => (
              <View
                key={request.userId}
                style={[styles.requestRow, index > 0 && styles.rowDivided]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{request.initials}</Text>
                </View>
                <Text style={styles.requestName} numberOfLines={1}>
                  {request.name}
                </Text>
                <TouchableOpacity
                  style={[styles.iconButton, styles.approveButton]}
                  onPress={() => handleApprove(request.userId)}
                  activeOpacity={0.8}
                  disabled={busyRequestId === request.userId}
                >
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconButton, styles.denyButton]}
                  onPress={() => handleDeny(request.userId)}
                  activeOpacity={0.8}
                  disabled={busyRequestId === request.userId}
                >
                  <Ionicons name="close" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {isActiveMember ? (
        <>
          <Text style={styles.sectionTitle}>Leaderboard</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipScroll}
            contentContainerStyle={styles.chipRow}
          >
            <TouchableOpacity
              style={[styles.chip, challengeFilter === 'all' && styles.chipActive]}
              onPress={() => setChallengeFilter('all')}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, challengeFilter === 'all' && styles.chipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {challenges.map((challenge) => {
              const isSelected = challengeFilter === challenge.id;
              return (
                <TouchableOpacity
                  key={challenge.id}
                  style={[
                    styles.chip,
                    isSelected && styles.chipActive,
                    !challenge.active && styles.chipMuted,
                  ]}
                  onPress={() => setChallengeFilter(challenge.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isSelected && styles.chipTextActive,
                      !challenge.active && styles.chipTextMuted,
                    ]}
                  >
                    {challenge.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sortRow}>
            {SORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.sortOption, sortBy === option.value && styles.sortOptionActive]}
                onPress={() => setSortBy(option.value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.sortOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {leaderboardLoading ? (
            <View style={[styles.card, cardShadow, styles.centered]}>
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : leaderboard.length === 0 ? (
            <View style={[styles.emptyCard, cardShadow]}>
              <Ionicons name="trophy-outline" size={28} color={colors.textFaint} />
              <Text style={styles.emptyText}>Nobody in this group has logged yet.</Text>
            </View>
          ) : (
            <View style={[styles.card, cardShadow]}>
              {leaderboard.map((entry, index) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  sortBy={sortBy}
                  divided={index > 0}
                />
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Members</Text>
          {membersLoading ? (
            <View style={[styles.card, cardShadow, styles.centered]}>
              <ActivityIndicator color={colors.blue} />
            </View>
          ) : (
            <View style={[styles.card, cardShadow]}>
              {visibleMembers.map((member, index) => (
                <View key={member.userId} style={[styles.memberRow, index > 0 && styles.rowDivided]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{member.initials}</Text>
                  </View>
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  {member.role === 'owner' ? (
                    <View style={styles.ownerPill}>
                      <Text style={styles.ownerPillText}>Owner</Text>
                    </View>
                  ) : null}
                </View>
              ))}
              {members.length > 6 ? (
                <TouchableOpacity
                  style={styles.showAllButton}
                  onPress={() => setShowAllMembers((previous) => !previous)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.showAllText}>
                    {showAllMembers ? 'Show less' : `Show all ${members.length} members`}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </>
      ) : null}

      {group && !group.isGlobal && isActiveMember ? (
        <View style={styles.leaveSection}>
          {leaveConfirming ? (
            <View style={[styles.leaveCard, cardShadow]}>
              <Text style={styles.leaveConfirmText}>Leave this group?</Text>
              {leaveError ? <Text style={styles.leaveError}>{leaveError}</Text> : null}
              <View style={styles.leaveActions}>
                <TouchableOpacity
                  style={styles.leaveCancelButton}
                  onPress={() => {
                    setLeaveConfirming(false);
                    setLeaveError(null);
                  }}
                  activeOpacity={0.8}
                  disabled={leaveBusy}
                >
                  <Text style={styles.leaveCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.leaveConfirmButton}
                  onPress={handleLeave}
                  activeOpacity={0.8}
                  disabled={leaveBusy}
                >
                  <Text style={styles.leaveConfirmButtonText}>
                    {leaveBusy ? 'Leaving…' : 'Leave group'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.leaveLink}
              onPress={() => setLeaveConfirming(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="exit-outline" size={15} color={colors.textMuted} />
              <Text style={styles.leaveLinkText}>Leave group</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}

function LeaderboardRow({ entry, sortBy, divided }) {
  const metrics = {
    streak: { value: entry.streak, label: 'Streak' },
    total: { value: entry.totalDays, label: 'Total' },
    group: { value: entry.daysInGroup, label: 'In group' },
  };
  const primary = metrics[sortBy];
  const secondary = Object.keys(metrics)
    .filter((key) => key !== sortBy)
    .map((key) => metrics[key]);

  const isTop3 = entry.rank <= 3;
  const isFirst = entry.rank === 1;

  return (
    <View
      style={[
        styles.leaderRow,
        divided && styles.rowDivided,
        entry.isMe && styles.leaderRowMe,
      ]}
    >
      <View
        style={[
          styles.rankBadge,
          isFirst && styles.rankBadgeFirst,
          isTop3 && !isFirst && styles.rankBadgeTop3,
        ]}
      >
        <Text
          style={[
            styles.rankText,
            isFirst && styles.rankTextFirst,
            isTop3 && !isFirst && styles.rankTextTop3,
          ]}
        >
          {entry.rank}
        </Text>
      </View>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{entry.initials}</Text>
      </View>
      <View style={styles.leaderText}>
        <Text style={styles.leaderName} numberOfLines={1}>
          {entry.name}
          {entry.isMe ? ' (you)' : ''}
        </Text>
        <Text style={styles.leaderSecondary}>
          {secondary.map((m) => `${m.label} ${m.value}`).join('   ')}
        </Text>
      </View>
      <Text style={styles.leaderPrimary}>{primary.value}</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.medium,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.small,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    padding: spacing.medium,
    marginBottom: spacing.medium,
  },
  pendingText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    marginLeft: spacing.small,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    marginBottom: spacing.medium,
  },
  cardLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.medium,
    paddingTop: spacing.medium,
  },
  inviteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.medium,
    paddingBottom: spacing.medium,
    paddingTop: spacing.small,
  },
  inviteCode: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: 'monospace',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    borderRadius: radius.small,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  shareButtonText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 5,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginTop: spacing.small,
    marginBottom: spacing.small + 2,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.medium,
  },
  requestName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.medium,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.small,
  },
  approveButton: {
    backgroundColor: colors.successSoft,
  },
  denyButton: {
    backgroundColor: colors.cardMuted,
  },
  chipScroll: {
    marginBottom: spacing.small,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.small,
    paddingRight: spacing.medium,
  },
  chip: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.small,
  },
  chipActive: {
    borderColor: colors.blue,
    backgroundColor: colors.blueSoft,
  },
  chipMuted: {
    opacity: 0.55,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.blue,
    fontWeight: '700',
  },
  chipTextMuted: {
    color: colors.textFaint,
  },
  sortRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardMuted,
    borderRadius: radius.small,
    padding: 3,
    marginBottom: spacing.medium,
  },
  sortOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.small - 2,
    alignItems: 'center',
  },
  sortOptionActive: {
    backgroundColor: colors.card,
    ...cardShadow,
  },
  sortOptionText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  sortOptionTextActive: {
    color: colors.blue,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.large,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    padding: spacing.large,
    alignItems: 'center',
    marginBottom: spacing.medium,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.small,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.medium,
  },
  leaderRowMe: {
    backgroundColor: colors.blueSoft,
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeFirst: {
    backgroundColor: colors.goldSoft,
  },
  rankBadgeTop3: {
    backgroundColor: colors.blueSoft,
  },
  rankText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  rankTextFirst: {
    color: colors.gold,
  },
  rankTextTop3: {
    color: colors.blue,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.small,
  },
  avatarText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '800',
  },
  leaderText: {
    flex: 1,
    marginLeft: spacing.medium,
  },
  leaderName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  leaderSecondary: {
    color: colors.textFaint,
    fontSize: 11,
    marginTop: 2,
  },
  leaderPrimary: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    marginLeft: spacing.small,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.medium,
  },
  memberName: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: spacing.medium,
  },
  ownerPill: {
    backgroundColor: colors.goldSoft,
    borderRadius: radius.small,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ownerPillText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
  },
  showAllButton: {
    paddingVertical: spacing.medium,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  showAllText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '700',
  },
  leaveSection: {
    marginTop: spacing.small,
    alignItems: 'center',
  },
  leaveLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.small,
  },
  leaveLinkText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  leaveCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    padding: spacing.medium,
  },
  leaveConfirmText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  leaveError: {
    color: colors.gold,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.small,
  },
  leaveActions: {
    flexDirection: 'row',
    marginTop: spacing.medium,
    gap: spacing.small,
  },
  leaveCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.small,
    backgroundColor: colors.cardMuted,
  },
  leaveCancelText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  leaveConfirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.small,
    backgroundColor: colors.text,
  },
  leaveConfirmButtonText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: '700',
  },
});
