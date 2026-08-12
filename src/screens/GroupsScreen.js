// Your groups, plus a search for finding new ones. GET /api/groups only returns
// groups you're already in (or pending on), so discovery lives entirely in the
// search box below, which hits a separate endpoint.

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePosts } from '../context/PostsContext';
import { colors, spacing, radius, cardShadow, webInputReset } from '../theme';

export default function GroupsScreen({ navigation }) {
  const { groups, searchGroups, requestToJoinGroup, joinGroupByCode } = usePosts();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [queryFocused, setQueryFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [joinBusyId, setJoinBusyId] = useState(null);

  const [code, setCode] = useState('');
  const [codeFocused, setCodeFocused] = useState(false);
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState('');

  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      setSearching(false);
      setSearchError('');
      return;
    }
    setSearching(true);
    setSearchError('');
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchGroups(trimmed);
        setSearchResults(results);
      } catch (error) {
        setSearchError(error.message);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, searchGroups]);

  async function handleJoin(item) {
    setJoinBusyId(item.id);
    try {
      const status = await requestToJoinGroup(item.id);
      if (searchResults) {
        setSearchResults((previous) =>
          previous.map((g) => (g.id === item.id ? { ...g, membershipStatus: status } : g))
        );
      }
    } catch (error) {
      setSearchError(error.message);
    } finally {
      setJoinBusyId(null);
    }
  }

  async function handleJoinByCode() {
    if (!code.trim()) {
      return;
    }
    setCodeBusy(true);
    setCodeError('');
    try {
      await joinGroupByCode(code.trim());
      setCode('');
    } catch (error) {
      setCodeError(error.message);
    } finally {
      setCodeBusy(false);
    }
  }

  function openGroup(item) {
    navigation.navigate('GroupDetail', { groupId: item.id, groupName: item.name });
  }

  function renderGroupCard(item) {
    const isOwnerWithPending = item.role === 'owner' && item.pendingCount > 0;

    return (
      <TouchableOpacity
        style={[styles.groupCard, cardShadow]}
        activeOpacity={item.membershipStatus === 'active' ? 0.85 : 1}
        onPress={() => {
          if (item.membershipStatus === 'active') {
            openGroup(item);
          }
        }}
        disabled={item.membershipStatus !== 'active'}
      >
        <View style={styles.groupIcon}>
          <Ionicons
            name={item.isGlobal ? 'globe-outline' : 'people-outline'}
            size={19}
            color={colors.blue}
          />
        </View>

        <View style={styles.groupText}>
          <View style={styles.groupNameRow}>
            <Text style={styles.groupName} numberOfLines={1}>
              {item.name}
            </Text>
            {isOwnerWithPending ? (
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>{item.pendingCount}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.groupDescription} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={styles.groupMeta}>
            {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
          </Text>
        </View>

        {item.isGlobal ? (
          <View style={styles.alwaysOnPill}>
            <Text style={styles.alwaysOnText}>Always on</Text>
          </View>
        ) : item.membershipStatus === 'pending' ? (
          <View style={styles.pendingPill}>
            <Text style={styles.pendingPillText}>Pending</Text>
          </View>
        ) : item.membershipStatus === 'none' ? (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => handleJoin(item)}
            activeOpacity={0.85}
            disabled={joinBusyId === item.id}
          >
            {joinBusyId === item.id ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={styles.joinText}>
                {item.joinPolicy === 'open' ? 'Join' : 'Request'}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  }

  const isSearching = query.trim().length > 0;
  const listData = isSearching ? searchResults || [] : groups;

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
            onPress={() => navigation.navigate('CreateGroup')}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color={colors.card} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={16} color={colors.textFaint} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, webInputReset, queryFocused && styles.inputFocused]}
            placeholder="Search groups by name"
            placeholderTextColor={colors.textFaint}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setQueryFocused(true)}
            onBlur={() => setQueryFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching ? <ActivityIndicator size="small" color={colors.blue} /> : null}
        </View>

        <View style={styles.codeRow}>
          <TextInput
            style={[styles.codeInput, webInputReset, codeFocused && styles.inputFocused]}
            placeholder="Have an invite code?"
            placeholderTextColor={colors.textFaint}
            value={code}
            onChangeText={setCode}
            onFocus={() => setCodeFocused(true)}
            onBlur={() => setCodeFocused(false)}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={styles.codeButton}
            onPress={handleJoinByCode}
            activeOpacity={0.85}
            disabled={codeBusy}
          >
            {codeBusy ? (
              <ActivityIndicator size="small" color={colors.card} />
            ) : (
              <Text style={styles.codeButtonText}>Join</Text>
            )}
          </TouchableOpacity>
        </View>
        {codeError ? <Text style={styles.errorText}>{codeError}</Text> : null}
        {isSearching && searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => renderGroupCard(item)}
        ListEmptyComponent={
          isSearching && !searching ? (
            <Text style={styles.emptyText}>No groups match "{query.trim()}".</Text>
          ) : null
        }
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.small,
    paddingHorizontal: spacing.medium,
    marginTop: spacing.medium,
  },
  searchIcon: {
    marginRight: spacing.small,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 11,
    fontSize: 14,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.small,
    gap: spacing.small,
  },
  codeInput: {
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
  codeButton: {
    backgroundColor: colors.blue,
    borderRadius: radius.small,
    paddingHorizontal: spacing.medium,
    paddingVertical: 12,
    minWidth: 64,
    alignItems: 'center',
  },
  codeButtonText: {
    color: colors.card,
    fontWeight: '800',
    fontSize: 14,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 12,
    marginTop: spacing.small,
  },
  listContent: {
    padding: spacing.medium,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.large,
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
    marginRight: spacing.small,
  },
  groupNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  pendingBadge: {
    marginLeft: spacing.small,
    backgroundColor: colors.gold,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBadgeText: {
    color: colors.card,
    fontSize: 11,
    fontWeight: '800',
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
    minWidth: 64,
    alignItems: 'center',
  },
  joinText: {
    color: colors.card,
    fontSize: 13,
    fontWeight: '800',
  },
  pendingPill: {
    backgroundColor: colors.cardMuted,
    borderRadius: radius.small,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pendingPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
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
