// Sample data so the app is demoable before the Cloudflare backend exists.
// Nothing here is real. Screens should read this through usePosts() in PostsContext,
// never by importing this file directly.

export const currentUser = {
  id: 'user-1',
  name: 'Ethan Pravato',
  initials: 'EP',
  streak: 12,
  totalDays: 34,
  // The classic Chabad challenge runs 40 days, which is what the progress ring fills toward.
  goalDays: 40,
  bestStreak: 18,
};

export const groups = [
  {
    id: 'group-global',
    name: 'Global Feed',
    description: 'Everyone using the app',
    memberCount: 1284,
    isGlobal: true,
    joined: true,
  },
  {
    id: 'group-rabbi',
    name: 'Rabbi Weekly Check-In',
    description: 'Ethan and his rabbi, the original WhatsApp crew',
    memberCount: 6,
    isGlobal: false,
    joined: true,
    inviteCode: 'RABBI6',
  },
  {
    id: 'group-purdue',
    name: 'Purdue Chabad',
    description: 'Students doing the 40 day challenge together',
    memberCount: 41,
    isGlobal: false,
    joined: true,
    inviteCode: 'BOILER',
  },
  {
    id: 'group-hillel',
    name: 'Hillel Morning Crew',
    description: 'Early risers, tefillin before class',
    memberCount: 18,
    isGlobal: false,
    joined: false,
    inviteCode: 'SUNRISE',
  },
];

// Each post is one photo proving someone did a challenge that day.
// photoUri stays null for seeded posts, so the feed draws a placeholder card.
// Real photos taken with the camera fill this in.
export const posts = [
  {
    id: 'post-1',
    userId: 'user-2',
    userName: 'Ari Feldman',
    initials: 'AF',
    groupId: 'group-rabbi',
    challenge: 'Tefillin',
    caption: 'Day 12. Beat my alarm for once.',
    photoUri: null,
    photoTint: '#E3EDFB',
    timeAgo: '38m ago',
    streakAtPost: 12,
  },
  {
    id: 'post-2',
    userId: 'user-3',
    userName: 'Moshe Kaplan',
    initials: 'MK',
    groupId: 'group-purdue',
    challenge: 'Tefillin',
    caption: 'Wrapped in the library before my 8am. Nobody blinked.',
    photoUri: null,
    photoTint: '#EDE7F6',
    timeAgo: '1h ago',
    streakAtPost: 27,
  },
  {
    id: 'post-3',
    userId: 'user-4',
    userName: 'Dov S.',
    initials: 'DS',
    groupId: 'group-global',
    challenge: 'Tefillin',
    caption: 'First morning of the 40 day challenge.',
    photoUri: null,
    photoTint: '#FBF0DC',
    timeAgo: '2h ago',
    streakAtPost: 1,
  },
  {
    id: 'post-4',
    userId: 'user-5',
    userName: 'Yael Brenner',
    initials: 'YB',
    groupId: 'group-purdue',
    challenge: 'Shabbat',
    caption: 'Table set with 20 minutes to spare before sundown.',
    photoUri: null,
    photoTint: '#E2F4EC',
    timeAgo: '3h ago',
    streakAtPost: 8,
  },
  {
    id: 'post-5',
    userId: 'user-6',
    userName: 'Shimon Adler',
    initials: 'SA',
    groupId: 'group-global',
    challenge: 'Tefillin',
    caption: 'Roommate joined me today. Two for one.',
    photoUri: null,
    photoTint: '#FAE7EF',
    timeAgo: '5h ago',
    streakAtPost: 19,
  },
];

// The challenge types the app knows about. Tefillin is the only one fully built
// for version one. The rest are here to prove the data model stretches.
export const challenges = [
  {
    id: 'challenge-tefillin',
    name: 'Tefillin',
    icon: 'sunny-outline',
    prompt: 'Have you put on tefillin yet today?',
    schedule: 'Every morning',
    active: true,
  },
  {
    id: 'challenge-shabbat',
    name: 'Shabbat',
    icon: 'wine-outline',
    prompt: 'Shabbat starts soon. Share your table.',
    schedule: 'Friday before sundown',
    active: false,
  },
];
