# My Mitzvahs

A BeReal-style accountability app for Jewish observance challenges. You get a daily prompt, take
a photo showing you did the thing, and share it with your group.

The first challenge is tefillin, inspired by Chabad's "Tefillin Together" campaign, where a group
commits to laying tefillin every day for 40 days and shares proof. The longer-term idea is more
challenge types beyond tefillin.

## Why photos

Streak apps are easy to lie to. A photo shared with a group that knows you is not. The whole
design leans on the same thing that makes BeReal work, which is that the accountability is social
rather than a number going up.

## What it does

- A daily prompt for the active challenge
- Camera capture with the photo attached to that day's entry
- Group feed, so everyone in a challenge sees who showed up
- Streak and history tracking across the 40-day run

## Stack

React Native and Expo on the front end. Cloudflare Workers and D1 on the back end. Photos go
through `expo-camera` and `expo-image-manipulator`, with `AsyncStorage` for local state and
`expo-updates` for pushing updates to testers without a rebuild.

```
src/
  api.js          backend calls
  components/     shared UI
  context/        app state
  data/           challenge definitions
  screens/        every screen
  theme.js        colors and type
```

## Status

Backend is live. The app is in tester recruitment. Not on the App Store yet.

## Running it

```bash
npm install
npx expo start --web        # browser
npx expo start --lan        # then scan the QR code with Expo Go on a phone
```

`--web` alone will not work with Expo Go, since it only serves the browser bundle and never hands
Expo Go a native manifest.
