// App entry point. Five tabs with a raised center button for logging, which is the
// same shape as the MyFitnessPal bottom bar.

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { PostsProvider, usePosts } from './src/context/PostsContext';
import HomeScreen from './src/screens/HomeScreen';
import FeedScreen from './src/screens/FeedScreen';
import PostScreen from './src/screens/PostScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors, buttonShadow } from './src/theme';

const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.blue,
  },
};

// The raised blue circle in the middle of the tab bar.
function CenterTabButton({ onPress, accessibilityState }) {
  const focused = accessibilityState && accessibilityState.selected;
  return (
    <TouchableOpacity
      style={styles.centerButton}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Log today"
    >
      <View style={[styles.centerCircle, buttonShadow, focused && styles.centerCircleFocused]}>
        <Ionicons name="add" size={28} color={colors.card} />
      </View>
    </TouchableOpacity>
  );
}

function tabIcon(name) {
  return function renderIcon({ color, size }) {
    return <Ionicons name={name} size={size} color={color} />;
  };
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PostsProvider>
        <StatusBar style="dark" />
        <RootTabs />
      </PostsProvider>
    </SafeAreaProvider>
  );
}

function RootTabs() {
  const { hydrated } = usePosts();

  // Hold off on the first paint until the saved data is read back, otherwise the
  // sample streak flashes on screen before the real one replaces it.
  if (!hydrated) {
    return <View style={styles.loading} />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.blue,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
        }}
      >
        <Tab.Screen
          name="Today"
          component={HomeScreen}
          options={{ tabBarIcon: tabIcon('home-outline') }}
        />
        <Tab.Screen
          name="Feed"
          component={FeedScreen}
          options={{ tabBarIcon: tabIcon('albums-outline') }}
        />
        <Tab.Screen
          name="Post"
          component={PostScreen}
          options={{
            tabBarLabel: '',
            tabBarButton: (props) => <CenterTabButton {...props} />,
          }}
        />
        <Tab.Screen
          name="Groups"
          component={GroupsScreen}
          options={{ tabBarIcon: tabIcon('people-outline') }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarIcon: tabIcon('person-outline') }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: Platform.OS === 'web' ? 68 : undefined,
    paddingTop: 6,
  },
  tabItem: {
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  centerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircleFocused: {
    backgroundColor: colors.blueDark,
  },
});
