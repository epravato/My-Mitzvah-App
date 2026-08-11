// One function per API route. Each one gets (request, env, user) where user
// is already the logged-in person's row (or null on the two routes that do
// not require being logged in), so a handler never has to think about
// authentication itself.

import { hashPassword, verifyPassword } from './passwords.js';
import { createSession, deleteSession } from './auth.js';
import { errorResponse, jsonResponse, isValidDayKey, daysBetween } from './utils.js';

function userIsFrontend(user) {
  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    email: user.email,
    streak: user.streak,
    bestStreak: user.best_streak,
    totalDays: user.total_days,
    goalDays: user.goal_days,
    // The app (not the server) decides whether the streak is still alive and
    // whether today is already logged, since only the phone knows the
    // person's own timezone. Sending the raw date lets it do that math the
    // same way it always has, in src/dateHelpers.js.
    lastLoggedDate: user.last_logged_date,
  };
}

function makeInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// --- Auth ---------------------------------------------------------------

export async function signup(request, env) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;
  const name = body?.name?.trim();

  if (!email || !email.includes('@')) {
    return errorResponse('Enter a valid email address.', 400, request);
  }
  if (!password || password.length < 8) {
    return errorResponse('Password must be at least 8 characters.', 400, request);
  }
  if (!name) {
    return errorResponse('Enter your name.', 400, request);
  }

  const existing = await env.DB.prepare('SELECT id FROM users WHERE lower(email) = ?')
    .bind(email)
    .first();
  if (existing) {
    return errorResponse('An account with that email already exists.', 409, request);
  }

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  const initials = makeInitials(name);

  // New accounts start with lastLoggedDate empty, meaning no live streak yet,
  // unlike the sample data (which starts pre-warmed at a 12 day streak for
  // demo purposes only).
  await env.DB.prepare(
    `INSERT INTO users (id, email, name, initials, password_hash, password_salt)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, email, name, initials, hash, salt)
    .run();

  await env.DB.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)')
    .bind('group-global', id)
    .run();

  const token = await createSession(env.DB, id);
  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();

  return jsonResponse({ token, user: userIsFrontend(user) }, 201, request);
}

export async function login(request, env) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return errorResponse('Enter your email and password.', 400, request);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE lower(email) = ?')
    .bind(email)
    .first();

  // Deliberately the same message whether the email is unknown or the
  // password is wrong. Telling the difference would let someone check which
  // emails have accounts just by trying to log in.
  const genericError = 'Incorrect email or password.';
  if (!user) {
    return errorResponse(genericError, 401, request);
  }

  const passwordMatches = await verifyPassword(password, user.password_salt, user.password_hash);
  if (!passwordMatches) {
    return errorResponse(genericError, 401, request);
  }

  const token = await createSession(env.DB, user.id);
  return jsonResponse({ token, user: userIsFrontend(user) }, 200, request);
}

export async function logout(request, env) {
  await deleteSession(request, env.DB);
  return jsonResponse({ ok: true }, 200, request);
}

export async function me(request, env, user) {
  return jsonResponse({ user: userIsFrontend(user) }, 200, request);
}

// --- Groups ---------------------------------------------------------------

export async function listGroups(request, env, user) {
  const groups = await env.DB.prepare(
    `SELECT g.id, g.name, g.description, g.is_global, g.invite_code,
            (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) AS member_count,
            EXISTS(SELECT 1 FROM group_members gm2 WHERE gm2.group_id = g.id AND gm2.user_id = ?) AS joined
     FROM groups g
     ORDER BY g.is_global DESC, g.created_at ASC`
  )
    .bind(user.id)
    .all();

  const formatted = groups.results.map((group) => ({
    id: group.id,
    name: group.name,
    description: group.description,
    isGlobal: !!group.is_global,
    memberCount: group.member_count,
    joined: !!group.joined,
    inviteCode: group.invite_code,
  }));

  return jsonResponse({ groups: formatted }, 200, request);
}

export async function createGroup(request, env, user) {
  const body = await request.json().catch(() => null);
  const name = body?.name?.trim();
  const description = body?.description?.trim() || 'A new accountability group';

  if (!name) {
    return errorResponse('Give the group a name.', 400, request);
  }

  const id = crypto.randomUUID();
  const inviteCode = name.slice(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GROUP';

  await env.DB.prepare(
    `INSERT INTO groups (id, name, description, is_global, invite_code, created_by)
     VALUES (?, ?, ?, 0, ?, ?)`
  )
    .bind(id, name, description, inviteCode, user.id)
    .run();

  await env.DB.prepare('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)')
    .bind(id, user.id)
    .run();

  return jsonResponse(
    { group: { id, name, description, isGlobal: false, memberCount: 1, joined: true, inviteCode } },
    201,
    request
  );
}

export async function joinGroup(request, env, user, groupId) {
  const group = await env.DB.prepare('SELECT id FROM groups WHERE id = ?').bind(groupId).first();
  if (!group) {
    return errorResponse('That group does not exist.', 404, request);
  }
  await env.DB.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)')
    .bind(groupId, user.id)
    .run();
  return jsonResponse({ ok: true }, 200, request);
}

export async function leaveGroup(request, env, user, groupId) {
  await env.DB.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?')
    .bind(groupId, user.id)
    .run();
  return jsonResponse({ ok: true }, 200, request);
}

// --- Posts ------------------------------------------------------------

export async function listPosts(request, env, user) {
  const url = new URL(request.url);
  const feed = url.searchParams.get('feed') === 'groups' ? 'groups' : 'global';

  const query =
    feed === 'global'
      ? `SELECT p.*, u.name AS user_name, u.initials
         FROM posts p JOIN users u ON u.id = p.user_id
         ORDER BY p.created_at DESC LIMIT 100`
      : `SELECT p.*, u.name AS user_name, u.initials
         FROM posts p
         JOIN users u ON u.id = p.user_id
         JOIN group_members gm ON gm.group_id = p.group_id AND gm.user_id = ?
         WHERE p.group_id != 'group-global'
         ORDER BY p.created_at DESC LIMIT 100`;

  const stmt = feed === 'global' ? env.DB.prepare(query) : env.DB.prepare(query).bind(user.id);
  const { results } = await stmt.all();

  const posts = results.map((post) => ({
    id: post.id,
    userId: post.user_id,
    userName: post.user_name,
    initials: post.initials,
    groupId: post.group_id,
    challenge: post.challenge,
    caption: post.caption,
    photoUri: photoUrl(request, post.photo_key),
    photoTint: post.photo_tint,
    streakAtPost: post.streak_at_post,
    createdAt: new Date(post.created_at + 'Z').getTime(),
  }));

  return jsonResponse({ posts }, 200, request);
}

const PHOTO_TINTS = ['#E3EDFB', '#EDE7F6', '#FBF0DC', '#E2F4EC', '#FAE7EF'];

// --- Photos -----------------------------------------------------------

const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Hard cap so storage can never blow past R2's free tier even if this
// endpoint gets hit far more than expected. 2000 photos * 8MB max = 16GB
// ceiling, comfortably inside what the free tier allows.
const MAX_PHOTOS = 2000;

export async function uploadPhoto(request, env, user) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get('photo');

  if (!file || typeof file === 'string') {
    return errorResponse('No photo provided.', 400, request);
  }
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return errorResponse('Photo must be JPEG, PNG, or WEBP.', 400, request);
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return errorResponse('Photo must be under 8MB.', 400, request);
  }

  const existing = await env.PHOTOS.list({ limit: MAX_PHOTOS });
  if (existing.objects.length >= MAX_PHOTOS || existing.truncated) {
    return errorResponse('Photo storage is full. Contact the app owner.', 507, request);
  }

  const extension = file.type.split('/')[1];
  // Prefixed with the user's id just to keep a person's own photos grouped
  // together in the bucket, not because anything reads that prefix back out.
  const key = `${user.id}/${crypto.randomUUID()}.${extension}`;

  await env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return jsonResponse({ key }, 201, request);
}

export async function getPhoto(request, env, user, match) {
  const key = decodeURIComponent(match[1]);
  const object = await env.PHOTOS.get(key);

  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      // Photo keys are random UUIDs, and a post's photo never changes after
      // it is posted, so it is safe to let browsers and CDNs cache this
      // forever instead of re-fetching it every time.
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

function photoUrl(request, photoKey) {
  if (!photoKey) {
    return null;
  }
  return `${new URL(request.url).origin}/api/photo/${encodeURIComponent(photoKey)}`;
}

export async function createPost(request, env, user) {
  const body = await request.json().catch(() => null);
  const challenge = body?.challenge?.trim() || 'Tefillin';
  const caption = body?.caption?.trim() || '';
  const groupId = body?.groupId || 'group-global';
  const dayKey = body?.dayKey;
  const photoKey = body?.photoKey || null;

  if (!isValidDayKey(dayKey)) {
    return errorResponse('Missing or invalid day.', 400, request);
  }

  // Streak math happens here, on the server, using the phone's day key but
  // the server's own record of when the user last logged. This is what
  // keeps the streak honest. It cannot be inflated by editing anything
  // stored on the device, since the device no longer stores the streak.
  const alreadyLoggedToday = user.last_logged_date === dayKey;
  const gap = daysBetween(user.last_logged_date, dayKey);

  let nextStreak = user.streak;
  if (!alreadyLoggedToday) {
    nextStreak = gap === 1 ? user.streak + 1 : 1;
  }

  const id = crypto.randomUUID();
  const photoTint = PHOTO_TINTS[Math.floor(Math.random() * PHOTO_TINTS.length)];

  await env.DB.prepare(
    `INSERT INTO posts (id, user_id, group_id, challenge, caption, photo_key, photo_tint, streak_at_post, day_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(id, user.id, groupId, challenge, caption, photoKey, photoTint, nextStreak, dayKey)
    .run();

  if (!alreadyLoggedToday) {
    await env.DB.prepare(
      `UPDATE users
       SET streak = ?, best_streak = MAX(best_streak, ?), total_days = total_days + 1, last_logged_date = ?
       WHERE id = ?`
    )
      .bind(nextStreak, nextStreak, dayKey, user.id)
      .run();
  }

  const updatedUser = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(user.id).first();

  return jsonResponse(
    {
      post: {
        id,
        userId: user.id,
        userName: user.name,
        initials: user.initials,
        groupId,
        challenge,
        caption,
        photoUri: photoUrl(request, photoKey),
        photoTint,
        streakAtPost: nextStreak,
        createdAt: Date.now(),
      },
      user: userIsFrontend(updatedUser),
    },
    201,
    request
  );
}
