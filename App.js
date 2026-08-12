// App entry point. Five tabs with a raised center button for logging, which is the
// same shape as the MyFitnessPal bottom bar.

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { PostsProvider, usePosts } from './src/context/PostsContext';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import HomeScreen from './src/screens/HomeScreen';
import FeedScreen from './src/screens/FeedScreen';
import PostScreen from './src/screens/PostScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { colors, buttonShadow } from './src/theme';

const Tab = createBottomTabNavigator();
const AuthStack = createNativeStackNavigator();
const GroupsStack = createNativeStackNavigator();

// Groups is a tab that also drills into its own screens (create, detail), so
// it gets its own stack. Screens draw their own headers, so the stack's is hidden.
function GroupsStackScreen() {
  return (
    <GroupsStack.Navigator screenOptions={{ headerShown: false }}>
      <GroupsStack.Screen name="GroupsList" component={GroupsScreen} />
      <GroupsStack.Screen name="CreateGroup" component={CreateGroupScreen} />
      <GroupsStack.Screen name="GroupDetail" component={GroupDetailScreen} />
    </GroupsStack.Navigator>
  );
}

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
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Switches between the login/signup screens and the real app, based on
// whether anyone is signed in. PostsProvider only mounts once someone is
// logged in, since it needs a login token to fetch anything.
function RootNavigator() {
  const { user, hydrated } = useAuth();

  // Hold off on the first paint until the saved login has been checked,
  // otherwise the login screen flashes for a moment even for someone who is
  // already signed in.
  if (!hydrated) {
    return <View style={styles.loading} />;
  }

  if (!user) {
    return (
      <NavigationContainer theme={navigationTheme}>
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Signup" component={SignupScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <PostsProvider>
      <RootTabs />
    </PostsProvider>
  );
}

function RootTabs() {
  const { hydrated } = usePosts();
  const insets = useSafeAreaInsets();

  // Hold off on the first paint until the saved data is read back, otherwise the
  // sample streak flashes on screen before the real one replaces it.
  if (!hydrated) {
    return <View style={styles.loading} />;
  }

  // On native, the tab bar needs to clear the home indicator, so its height and
  // bottom padding grow with the device's safe-area inset. Web has no home indicator,
  // so it keeps a fixed height instead.
  const tabBarHeight = Platform.OS === 'web' ? 68 : 56 + insets.bottom;
  const tabBarStyle = [
    styles.tabBar,
    { height: tabBarHeight, paddingBottom: Platform.OS === 'web' ? 0 : insets.bottom },
  ];

  return (
    <NavigationContainer theme={navigationTheme}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.blue,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle,
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
          component={GroupsStackScreen}
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
