// Now that the real Cloudflare backend is live, this file only holds the
// challenge type list, since that is fixed by the app itself rather than
// something that comes from a person's account. The sample user, groups, and
// posts that used to live here are gone. Real accounts, groups, and posts now
// come from the backend, see src/context/PostsContext.js and src/api.js.

// The challenge types the app knows about. Tefillin is the only one fully built
// for version one. The rest are here to prove the data model stretches.
// These ids are the canonical challenge key everywhere: what a post stores in
// its `challenge` column, what the leaderboard filters by, and what keys the
// user's per-challenge streaks. Posts used to store the display name instead,
// which is why the backend lowercases whatever it receives.
export const challenges = [
  {
    id: 'tefillin',
    name: 'Tefillin',
    icon: 'sunny-outline',
    prompt: 'Have you put on tefillin yet today?',
    schedule: 'Every morning',
    active: true,
  },
  {
    id: 'shabbat',
    name: 'Shabbat',
    icon: 'wine-outline',
    prompt: 'Shabbat starts soon. Share your table.',
    schedule: 'Friday before sundown',
    active: false,
  },
];

// Posts store the challenge id, not its name, so anything showing a challenge to
// a person has to look the name back up. Falls back to the raw value so a post
// made by an older app build (which stored the display name) still renders.
export function challengeName(challengeId) {
  const match = challenges.find((challenge) => challenge.id === challengeId);
  return match ? match.name : challengeId;
}
