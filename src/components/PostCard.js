// One post in the feed. Shows who posted, their photo, the challenge, and their streak.
// Seeded posts have no real photo yet, so a tinted placeholder stands in until
// someone takes a picture with the camera.

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, cardShadow } from '../theme';
import { formatTimeAgo } from '../dateHelpers';
import { challengeName } from '../data/dummyData';

export default function PostCard({ post, groupName }) {
  const challengeLabel = challengeName(post.challenge);
  // Posts you made carry a real timestamp, so their age stays accurate across a
  // refresh. The seeded sample posts only have a fixed label like "38m ago".
  const timeAgo = post.createdAt ? formatTimeAgo(post.createdAt) : post.timeAgo;

  return (
    <View style={[styles.card, cardShadow]}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{post.initials}</Text>
        </View>

        <View style={styles.headerText}>
          <Text style={styles.name}>{post.userName}</Text>
          <Text style={styles.meta}>
            {groupName} · {timeAgo}
          </Text>
        </View>

        <View style={styles.streakPill}>
          <Ionicons name="flame" size={13} color={colors.gold} />
          <Text style={styles.streakText}>{post.streakAtPost}</Text>
        </View>
      </View>

      {post.photoUri ? (
        <Image source={{ uri: post.photoUri }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.placeholder, { backgroundColor: post.photoTint }]}>
          <Ionicons name="image-outline" size={32} color={colors.textFaint} />
          <Text style={styles.placeholderText}>{challengeLabel} photo</Text>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.challengeTag}>
          <Text style={styles.challengeTagText}>{challengeLabel}</Text>
        </View>
        {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.medium,
    marginBottom: spacing.medium,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.medium,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.blue,
    fontWeight: '800',
    fontSize: 14,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing.medium,
  },
  name: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.small,
  },
  streakText: {
    color: colors.gold,
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 4,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: spacing.small,
  },
  footer: {
    padding: spacing.medium,
  },
  challengeTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.blueSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.small,
  },
  challengeTagText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  caption: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.small,
  },
});
