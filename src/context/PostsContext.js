// One place that owns all app state. Screens call usePosts() instead of touching
// dummyData directly, so swapping dummy data for the real Cloudflare backend later
// only means changing this file.
//
// State is saved to the device with AsyncStorage, so closing the app or refreshing
// the browser no longer wipes your streak. On the web AsyncStorage is backed by the
// browser's own storage, so the same code works in both places.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  currentUser as seedUser,
  groups as seedGroups,
  posts as seedPosts,
  challenges as seedChallenges,
} from '../data/dummyData';
import { todayKey, daysBetween } from '../dateHelpers';

const PostsContext = createContext(null);

// Bump the number in this key if the saved shape ever changes in a way that would
// break older saves. Anything stored under the old key is then simply ignored.
const STORAGE_KEY = 'tefillin-challenge-state-v1';

const ONE_DAY = 24 * 60 * 60 * 1000;

function yesterdayKey() {
  return todayKey(new Date(Date.now() - ONE_DAY));
}

export function PostsProvider({ children }) {
  const [posts, setPosts] = useState(seedPosts);
  const [groups, setGroups] = useState(seedGroups);
  const [user, setUser] = useState(seedUser);

  // The last day the user logged, as "YYYY-MM-DD". Storing the date instead of a
  // true/false flag is what lets the app tell yesterday apart from last week.
  // The sample data starts on yesterday, so a fresh install opens with a live
  // 12 day streak you can continue rather than a dead one.
  const [lastLoggedDate, setLastLoggedDate] = useState(yesterdayKey);

  // Stays false until the saved data has been read back, so the first render does
  // not overwrite a real save with the seed data.
  const [hydrated, setHydrated] = useState(false);

  // Load whatever was saved last time, once, on startup.
  useEffect(() => {
    let cancelled = false;

    async function loadSavedState() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && !cancelled) {
          const parsed = JSON.parse(saved);
          if (parsed.posts) setPosts(parsed.posts);
          if (parsed.groups) setGroups(parsed.groups);
          if (parsed.user) setUser(parsed.user);
          if (parsed.lastLoggedDate) setLastLoggedDate(parsed.lastLoggedDate);
        }
      } catch (error) {
        // A bad or unreadable save should not brick the app. Fall back to the seed
        // data and carry on.
        console.warn('Could not read saved data, starting fresh.', error);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    loadSavedState();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save on every change, but only after the initial load has finished.
  useEffect(() => {
    if (!hydrated) {
      return;
    }
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ posts, groups, user, lastLoggedDate })
    ).catch((error) => {
      console.warn('Could not save data.', error);
    });
  }, [hydrated, posts, groups, user, lastLoggedDate]);

  const today = todayKey();
  const postedToday = lastLoggedDate === today;

  // A streak only survives if the last log was today or yesterday. Any longer gap
  // and it is broken, so the app says so instead of showing a number that is a lie.
  const gapSinceLastLog = daysBetween(lastLoggedDate, today);
  const streakIsAlive = gapSinceLastLog !== null && gapSinceLastLog <= 1;
  const currentStreak = streakIsAlive ? user.streak : 0;

  function addPost({ challenge, caption, photoUri, groupId }) {
    // Logging twice in one day should not inflate the streak.
    const alreadyLoggedToday = lastLoggedDate === today;

    let nextStreak = currentStreak;
    if (!alreadyLoggedToday) {
      // Logged yesterday means the streak continues. Anything else starts it over.
      nextStreak = gapSinceLastLog === 1 ? user.streak + 1 : 1;
    }

    const newPost = {
      id: `post-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      initials: user.initials,
      groupId: groupId || 'group-global',
      challenge: challenge || 'Tefillin',
      caption: caption || '',
      photoUri: photoUri || null,
      photoTint: '#E3EDFB',
      createdAt: Date.now(),
      streakAtPost: nextStreak,
    };

    setPosts((previous) => [newPost, ...previous]);

    if (!alreadyLoggedToday) {
      setUser((previous) => ({
        ...previous,
        streak: nextStreak,
        bestStreak: Math.max(previous.bestStreak, nextStreak),
        totalDays: previous.totalDays + 1,
      }));
      setLastLoggedDate(today);
    }
  }

  function toggleGroupMembership(groupId) {
    setGroups((previous) =>
      previous.map((group) =>
        group.id === groupId ? { ...group, joined: !group.joined } : group
      )
    );
  }

  function createGroup({ name, description }) {
    const newGroup = {
      id: `group-${Date.now()}`,
      name,
      description: description || 'A new accountability group',
      memberCount: 1,
      isGlobal: false,
      joined: true,
      inviteCode: name.slice(0, 6).toUpperCase().replace(/\s/g, ''),
    };
    setGroups((previous) => [...previous, newGroup]);
    return newGroup;
  }

  // Posts the user should actually see, based on which groups they belong to.
  // PostCard handles turning a saved timestamp into "2h ago".
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

  // Wipes the save and puts the sample data back. Handy while demoing.
  async function resetEverything() {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setPosts(seedPosts);
    setGroups(seedGroups);
    setUser(seedUser);
    setLastLoggedDate(yesterdayKey());
  }

  const value = useMemo(
    () => ({
      posts,
      groups,
      user: { ...user, streak: currentStreak },
      challenges: seedChallenges,
      postedToday,
      hydrated,
      streakIsAlive,
      addPost,
      toggleGroupMembership,
      createGroup,
      getVisiblePosts,
      getGroupName,
      resetEverything,
    }),
    [posts, groups, user, lastLoggedDate, hydrated, currentStreak, postedToday, streakIsAlive]
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
