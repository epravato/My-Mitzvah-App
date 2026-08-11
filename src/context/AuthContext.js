// Owns the logged-in state: who is signed in, and the token that proves it to
// the backend on every request. Saved to AsyncStorage so closing the app or
// refreshing the browser does not sign anyone out.

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, ApiError } from '../api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'tefillin-challenge-auth-v1';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  // Stays false until the saved login has been read back, so the app does
  // not flash the login screen for a split second before showing someone
  // who is actually already signed in.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedLogin() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && !cancelled) {
          const parsed = JSON.parse(saved);
          // Confirm the saved token still works rather than trusting it
          // blindly, since it could have expired since the last time the
          // app was open.
          const { user: freshUser } = await api.me(parsed.token);
          setToken(parsed.token);
          setUser(freshUser);
        }
      } catch (error) {
        // A missing or expired session just means "start logged out",
        // nothing to show the person about it.
        await AsyncStorage.removeItem(STORAGE_KEY);
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    loadSavedLogin();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persist(newToken, newUser) {
    setToken(newToken);
    setUser(newUser);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken }));
  }

  async function signUp(email, password, name) {
    const { token: newToken, user: newUser } = await api.signup(email, password, name);
    await persist(newToken, newUser);
  }

  async function signIn(email, password) {
    const { token: newToken, user: newUser } = await api.login(email, password);
    await persist(newToken, newUser);
  }

  async function signOut() {
    if (token) {
      // Best effort. Even if this fails (no connection, etc), the person
      // should still get signed out on this device.
      api.logout(token).catch(() => {});
    }
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }

  // Lets other contexts (like PostsContext, after posting) update the user
  // object they already have, e.g. a fresh streak count, without a refetch.
  function updateUser(newUser) {
    setUser(newUser);
  }

  const value = useMemo(
    () => ({ token, user, hydrated, signUp, signIn, signOut, updateUser }),
    [token, user, hydrated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}

export { ApiError };
