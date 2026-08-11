// Now that the real Cloudflare backend is live, this file only holds the
// challenge type list, since that is fixed by the app itself rather than
// something that comes from a person's account. The sample user, groups, and
// posts that used to live here are gone. Real accounts, groups, and posts now
// come from the backend, see src/context/PostsContext.js and src/api.js.

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
