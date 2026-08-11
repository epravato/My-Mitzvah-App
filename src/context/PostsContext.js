// One place that owns all app data. Screens call usePosts() instead of talking
// to the backend directly, matching the plan from decisions.md: swapping
// dummy data for the real Cloudflare backend only meant changing this file.
//
// Data now lives on the server (Cloudflare D1), not on the device. This file's
// job is to fetch it after login, keep a local copy for the screens to read,
// and send changes (a new post, joining a group) up to the server.

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api';
import { challenges as staticChallenges } from '../data/dummyData';
import { todayKey, daysBetween } from '../dateHelpers';

const PostsContext = createContext(null);

export function PostsProvider({ children }) {
  const { token, user: authUser, updateUser } = useAuth();

  const [posts, setPosts] = useState([]);
  const [groups, setGroups] = useState([]);
  // Stays false until the first load from the server finishes, so the
  // screens do not flash an empty feed before the real posts arrive.
  const [hydrated, setHydrated] = useState(false);

  const loadEverything = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      // "global" returns every post from everyone, which is also what the
      // Feed screen's "My Groups" toggle filters down from client-side, same
      // as it did with the old dummy data.
      const [postsResult, groupsResult] = await Promise.all([
        api.getPosts(token, 'global'),
        api.getGroups(token),
      ]);
      setPosts(postsResult.posts);
      setGroups(groupsResult.groups);
    } catch (error) {
      // A failed load leaves the screens showing stale (or empty) data
      // rather than crashing. Whoever is on the Today screen can still see
      // their own stats, since those come from the login response, not
      // this fetch.
      console.warn('Could not load posts or groups.', error);
    } finally {
      setHydrated(true);
    }
  }, [token]);

  useEffect(() => {
    setHydrated(false);
    loadEverything();
  }, [loadEverything]);

  // Streak aliveness is computed here, on the phone, from the date the
  // server says was last logged. Only the phone knows the person's own
  // timezone, so this stays client-side exactly like it did before the
  // backend existed. See src/dateHelpers.js.
  const today = todayKey();
  const postedToday = authUser ? authUser.lastLoggedDate === today : false;
  const gapSinceLastLog = authUser ? daysBetween(authUser.lastLoggedDate, today) : null;
  const streakIsAlive = gapSinceLastLog !== null && gapSinceLastLog <= 1;
  const currentStreak = streakIsAlive && authUser ? authUser.streak : 0;

  async function addPost({ challenge, caption, groupId, photoUri }) {
    // The photo, if there is one, has to reach the server before the post
    // does, since the post only stores the photo's key, not the photo
    // itself. If the upload fails, the post is not created at all, rather
    // than silently posting without the proof photo the person meant to
    // include.
    let photoKey = null;
    if (photoUri) {
      const uploaded = await api.uploadPhoto(token, photoUri);
      photoKey = uploaded.key;
    }

    const { post, user: updatedUser } = await api.createPost(token, {
      challenge,
      caption,
      groupId,
      dayKey: todayKey(),
      photoKey,
    });
    setPosts((previous) => [post, ...previous]);
    updateUser(updatedUser);
  }

  async function toggleGroupMembership(groupId) {
    const group = groups.find((g) => g.id === groupId);
    if (!group) {
      return;
    }
    if (group.joined) {
      await api.leaveGroup(token, groupId);
    } else {
      await api.joinGroup(token, groupId);
    }
    setGroups((previous) =>
      previous.map((g) => (g.id === groupId ? { ...g, joined: !g.joined } : g))
    );
  }

  async function createGroup({ name, description }) {
    const { group } = await api.createGroup(token, name, description);
    setGroups((previous) => [...previous, group]);
    return group;
  }

  // Posts the user should actually see, based on which groups they belong to.
  function getVisiblePosts(feedMode) {
    if (feedMode === 'global') {
      return posts;
    }
    const joinedGroupIds = groups
      .filter((group) => group.joined && !group.isGlobal)
      .map((group) => group.id);
    return posts.filter((post) => joinedGroupIds.includes(post.groupId));
  }

  function getGroupName(groupId) {
    const match = groups.find((group) => group.id === groupId);
    return match ? match.name : 'Unknown group';
  }

  const value = useMemo(
    () => ({
      posts,
      groups,
      user: authUser ? { ...authUser, streak: currentStreak } : null,
      challenges: staticChallenges,
      postedToday,
      hydrated,
      streakIsAlive,
      addPost,
      toggleGroupMembership,
      createGroup,
      getVisiblePosts,
      getGroupName,
      refresh: loadEverything,
    }),
    [posts, groups, authUser, currentStreak, hydrated, postedToday, streakIsAlive, loadEverything]
  );

  return <PostsContext.Provider value={value}>{children}</PostsContext.Provider>;
}

export function usePosts() {
  const context = useContext(PostsContext);
  if (!context) {
    throw new Error('usePosts must be used inside a PostsProvider');
  }
  return context;
}
