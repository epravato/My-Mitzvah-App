// One function per API route. Each one gets (request, env, user) where user
// is already the logged-in person's row (or null on the two routes that do
// not require being logged in), so a handler never has to think about
// authentication itself.

import { hashPassword, verifyPassword } from './passwords.js';
import { createSession, deleteSession, fingerprintToken } from './auth.js';
import { errorResponse, jsonResponse, isValidDayKey, daysBetween } from './utils.js';
import { sendPasswordResetEmail } from './email.js';

// Needs a DB round trip for the per-challenge rows, so every call site awaits
// this now instead of building the user object synchronously.
async function userIsFrontend(env, user) {
  const { results } = await env.DB.prepare(
    'SELECT challenge, streak, best_streak, total_days, last_logged_date FROM challenge_streaks WHERE user_id = ?'
  )
    .bind(user.id)
    .all();

  const challengeStreaks = {};
  for (const row of results) {
    challengeStreaks[row.challenge] = {
      streak: row.streak,
      bestStreak: row.best_streak,
      totalDays: row.total_days,
      lastLoggedDate: row.last_logged_date,
    };
  }

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
    challengeStreaks,
  };
}

// Same day = no change, next day = +1, longer gap = reset to 1. Used for both
// the overall (users table) streak and each per-challenge streak, so the two
// never drift apart in how they define a "streak".
function nextStreakValue(lastLoggedDate, dayKey, currentStreak) {
  if (lastLoggedDate === dayKey) {
    return currentStreak;
  }
  return daysBetween(lastLoggedDate, dayKey) === 1 ? currentStreak + 1 : 1;
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

  return jsonResponse({ token, user: await userIsFrontend(env, user) }, 201, request);
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
  return jsonResponse({ token, user: await userIsFrontend(env, user) }, 200, request);
}

export async function logout(request, env) {
  await deleteSession(request, env.DB);
  return jsonResponse({ ok: true }, 200, request);
}

// Excludes 0/O and 1/I, the pair typed wrong most often, since this gets
// copied from an email by hand.
const RESET_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const RESET_CODE_LENGTH = 8;
const RESET_CODE_LIFETIME_MINUTES = 30;

function generateResetCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(RESET_CODE_LENGTH));
  return Array.from(bytes, (byte) => RESET_CODE_ALPHABET[byte % RESET_CODE_ALPHABET.length]).join('');
}

export async function forgotPassword(request, env) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();

  if (!email) {
    return errorResponse('Enter your email address.', 400, request);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE lower(email) = ?').bind(email).first();

  // Same response whether or not the account exists, same reasoning as
  // login: this endpoint should not be usable to check which emails have
  // accounts. The email itself is only ever sent if there really is one.
  if (user) {
    const code = generateResetCode();
    const fingerprint = await fingerprintToken(code);
    const expiresAt = new Date(
      Date.now() + RESET_CODE_LIFETIME_MINUTES * 60 * 1000
    ).toISOString();

    // Only the newest requested code should ever work.
    await env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(user.id).run();
    await env.DB.prepare(
      'INSERT INTO password_resets (code_fingerprint, user_id, expires_at) VALUES (?, ?, ?)'
    )
      .bind(fingerprint, user.id, expiresAt)
      .run();

    await sendPasswordResetEmail(env, user.email, code);
  }

  return jsonResponse(
    { ok: true, message: 'If that email has an account, a reset code was sent.' },
    200,
    request
  );
}

export async function resetPassword(request, env) {
  const body = await request.json().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const code = body?.code?.trim().toUpperCase();
  const newPassword = body?.newPassword;

  if (!email || !code) {
    return errorResponse('Enter your email and the code from your reset email.', 400, request);
  }
  if (!newPassword || newPassword.length < 8) {
    return errorResponse('Password must be at least 8 characters.', 400, request);
  }

  const user = await env.DB.prepare('SELECT * FROM users WHERE lower(email) = ?').bind(email).first();

  // Same generic error either way, so this cannot be used to probe which
  // emails have accounts or brute-force distinguish "wrong code" reasons.
  const genericError = 'That code is invalid or has expired.';
  if (!user) {
    return errorResponse(genericError, 400, request);
  }

  const fingerprint = await fingerprintToken(code);
  const reset = await env.DB.prepare(
    'SELECT * FROM password_resets WHERE code_fingerprint = ? AND user_id = ?'
  )
    .bind(fingerprint, user.id)
    .first();

  if (!reset || new Date(reset.expires_at) < new Date()) {
    return errorResponse(genericError, 400, request);
  }

  const { hash, salt } = await hashPassword(newPassword);
  await env.DB.prepare('UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?')
    .bind(hash, salt, user.id)
    .run();

  // One-time use, same idea as a session token being deleted on logout.
  await env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(user.id).run();
  // Whatever compromised the old password could also be reading old
  // sessions, so this signs the account out everywhere, not just locally.
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();

  return jsonResponse({ ok: true }, 200, request);
}

export async function me(request, env, user) {
  return jsonResponse({ user: await userIsFrontend(env, user) }, 200, request);
}

// --- Groups ---------------------------------------------------------------

// Every non-global group gets one of these regardless of join policy, since
// having the code always works to join (POST /api/groups/join-by-code).
// Excludes 0/O/1/I, the characters typed wrong most often by hand.
const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 6;

function generateInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH));
  return Array.from(bytes, (byte) => INVITE_CODE_ALPHABET[byte % INVITE_CODE_ALPHABET.length]).join('');
}

async function uniqueInviteCode(db) {
  // 33^6 possible codes, so a collision is vanishingly unlikely, but a
  // duplicate would let two groups' codes route to the same place.
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const existing = await db.prepare('SELECT id FROM groups WHERE invite_code = ?').bind(code).first();
    if (!existing) {
      return code;
    }
  }
  throw new Error('Could not generate a unique invite code.');
}

// Shared shape builder for every endpoint that returns a Group. Expects a row
// from a query that joined group_members once as gm_self (the requester's own
// membership row, or all-NULL columns if they have none).
function formatGroup(row) {
  if (row.is_global) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      isGlobal: true,
      joinPolicy: 'open',
      inviteCode: null,
      memberCount: row.member_count,
      membershipStatus: 'active',
      role: null,
      pendingCount: 0,
    };
  }

  const membershipStatus = row.my_status || 'none';
  const isActiveOwner = membershipStatus === 'active' && row.my_role === 'owner';

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isGlobal: false,
    joinPolicy: row.join_policy,
    // Never leak a code to someone who is not already in the group.
    inviteCode: membershipStatus === 'active' ? row.invite_code : null,
    memberCount: row.member_count,
    membershipStatus,
    role: membershipStatus === 'active' ? row.my_role : null,
    pendingCount: isActiveOwner ? row.pending_count : 0,
  };
}

const GROUP_SELECT_FOR_USER = `
  SELECT g.*,
         (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 'active') AS member_count,
         gm_self.status AS my_status,
         gm_self.role AS my_role,
         (SELECT COUNT(*) FROM group_members gm3 WHERE gm3.group_id = g.id AND gm3.status = 'pending') AS pending_count
  FROM groups g
  LEFT JOIN group_members gm_self ON gm_self.group_id = g.id AND gm_self.user_id = ?
`;

async function getGroupForUser(db, groupId, userId) {
  const row = await db.prepare(`${GROUP_SELECT_FOR_USER} WHERE g.id = ?`).bind(userId, groupId).first();
  return row ? formatGroup(row) : null;
}

export async function listGroups(request, env, user) {
  const { results } = await env.DB.prepare(
    `${GROUP_SELECT_FOR_USER}
     WHERE g.is_global = 1 OR gm_self.status IN ('active', 'pending')
     ORDER BY g.is_global DESC, g.name ASC`
  )
    .bind(user.id)
    .all();

  return jsonResponse({ groups: results.map(formatGroup) }, 200, request);
}

export async function searchGroups(request, env, user) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (!q) {
    return jsonResponse({ groups: [] }, 200, request);
  }

  const { results } = await env.DB.prepare(
    `${GROUP_SELECT_FOR_USER}
     WHERE g.is_global = 0 AND g.join_policy != 'invite' AND lower(g.name) LIKE lower(?)
     ORDER BY g.name ASC
     LIMIT 25`
  )
    .bind(user.id, `%${q}%`)
    .all();

  return jsonResponse({ groups: results.map(formatGroup) }, 200, request);
}

const JOIN_POLICIES = ['open', 'approval', 'invite'];
const GROUP_NAME_MAX_LENGTH = 50;
const GROUP_DESCRIPTION_MAX_LENGTH = 140;

export async function createGroup(request, env, user) {
  const body = await request.json().catch(() => null);
  const name = body?.name?.trim().slice(0, GROUP_NAME_MAX_LENGTH);
  const description = (body?.description?.trim() || 'A new accountability group').slice(
    0,
    GROUP_DESCRIPTION_MAX_LENGTH
  );
  const joinPolicy = JOIN_POLICIES.includes(body?.joinPolicy) ? body.joinPolicy : 'approval';

  if (!name) {
    return errorResponse('Give the group a name.', 400, request);
  }

  const id = crypto.randomUUID();
  const inviteCode = await uniqueInviteCode(env.DB);

  await env.DB.prepare(
    `INSERT INTO groups (id, name, description, is_global, invite_code, created_by, join_policy)
     VALUES (?, ?, ?, 0, ?, ?, ?)`
  )
    .bind(id, name, description, inviteCode, user.id, joinPolicy)
    .run();

  await env.DB.prepare(
    `INSERT INTO group_members (group_id, user_id, role, status) VALUES (?, ?, 'owner', 'active')`
  )
    .bind(id, user.id)
    .run();

  return jsonResponse({ group: await getGroupForUser(env.DB, id, user.id) }, 201, request);
}

export async function joinGroup(request, env, user, groupId) {
  const group = await env.DB.prepare('SELECT * FROM groups WHERE id = ?').bind(groupId).first();
  if (!group) {
    return errorResponse('That group does not exist.', 404, request);
  }
  if (group.is_global) {
    return errorResponse('You are already in the global feed.', 400, request);
  }

  const existing = await env.DB.prepare(
    'SELECT status FROM group_members WHERE group_id = ? AND user_id = ?'
  )
    .bind(groupId, user.id)
    .first();

  if (existing) {
    // Idempotent: asking to join a group you are already in (or already
    // waiting on) is not an error, it just reports where you stand.
    return jsonResponse(
      { status: existing.status, group: await getGroupForUser(env.DB, groupId, user.id) },
      200,
      request
    );
  }

  if (group.join_policy === 'invite') {
    return errorResponse('This group is invite only. Ask the owner for the code.', 403, request);
  }

  const status = group.join_policy === 'open' ? 'active' : 'pending';
  await env.DB.prepare(
    `INSERT INTO group_members (group_id, user_id, role, status) VALUES (?, ?, 'member', ?)`
  )
    .bind(groupId, user.id, status)
    .run();

  return jsonResponse(
    { status, group: await getGroupForUser(env.DB, groupId, user.id) },
    200,
    request
  );
}

export async function joinGroupByCode(request, env, user) {
  const body = await request.json().catch(() => null);
  const code = body?.code?.trim();

  if (!code) {
    return errorResponse('Enter an invite code.', 400, request);
  }

  const group = await env.DB.prepare('SELECT id FROM groups WHERE lower(invite_code) = lower(?)')
    .bind(code)
    .first();
  if (!group) {
    return errorResponse('No group with that code.', 404, request);
  }

  // Having the code IS the approval, so this always lands active even if a
  // pending request already existed (e.g. an approval-gated group where the
  // owner also just handed out the code).
  await env.DB.prepare(
    `INSERT INTO group_members (group_id, user_id, role, status) VALUES (?, ?, 'member', 'active')
     ON CONFLICT(group_id, user_id) DO UPDATE SET status = 'active'`
  )
    .bind(group.id, user.id)
    .run();

  return jsonResponse({ group: await getGroupForUser(env.DB, group.id, user.id) }, 200, request);
}

export async function leaveGroup(request, env, user, groupId) {
  const group = await env.DB.prepare('SELECT * FROM groups WHERE id = ?').bind(groupId).first();
  if (!group) {
    return errorResponse('That group does not exist.', 404, request);
  }
  if (group.is_global) {
    return errorResponse('You cannot leave the global feed.', 400, request);
  }

  const membership = await env.DB.prepare(
    'SELECT role, status FROM group_members WHERE group_id = ? AND user_id = ?'
  )
    .bind(groupId, user.id)
    .first();

  if (membership?.role === 'owner' && membership.status === 'active') {
    const otherActive = await env.DB.prepare(
      `SELECT COUNT(*) AS count FROM group_members WHERE group_id = ? AND user_id != ? AND status = 'active'`
    )
      .bind(groupId, user.id)
      .first();

    if (otherActive.count > 0) {
      return errorResponse('Transfer ownership before leaving.', 400, request);
    }

    // The owner leaving as the last active member takes the group with them.
    await env.DB.batch([
      env.DB.prepare('DELETE FROM posts WHERE group_id = ?').bind(groupId),
      env.DB.prepare('DELETE FROM group_members WHERE group_id = ?').bind(groupId),
      env.DB.prepare('DELETE FROM groups WHERE id = ?').bind(groupId),
    ]);
    return jsonResponse({ ok: true }, 200, request);
  }

  await env.DB.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?')
    .bind(groupId, user.id)
    .run();
  return jsonResponse({ ok: true }, 200, request);
}

async function requireOwner(db, groupId, userId) {
  const membership = await db
    .prepare('SELECT role, status FROM group_members WHERE group_id = ? AND user_id = ?')
    .bind(groupId, userId)
    .first();
  return !!membership && membership.role === 'owner' && membership.status === 'active';
}

export async function listJoinRequests(request, env, user, groupId) {
  if (!(await requireOwner(env.DB, groupId, user.id))) {
    return errorResponse('Only the group owner can see join requests.', 403, request);
  }

  const { results } = await env.DB.prepare(
    `SELECT u.id AS user_id, u.name, u.initials, gm.joined_at
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = ? AND gm.status = 'pending'
     ORDER BY gm.joined_at ASC`
  )
    .bind(groupId)
    .all();

  const requests = results.map((row) => ({
    userId: row.user_id,
    name: row.name,
    initials: row.initials,
    requestedAt: new Date(row.joined_at + 'Z').getTime(),
  }));

  return jsonResponse({ requests }, 200, request);
}

export async function approveJoinRequest(request, env, user, groupId, targetUserId) {
  if (!(await requireOwner(env.DB, groupId, user.id))) {
    return errorResponse('Only the group owner can see join requests.', 403, request);
  }

  const result = await env.DB.prepare(
    `UPDATE group_members SET status = 'active' WHERE group_id = ? AND user_id = ? AND status = 'pending'`
  )
    .bind(groupId, targetUserId)
    .run();

  if (result.meta.changes === 0) {
    return errorResponse('That join request no longer exists.', 404, request);
  }

  return jsonResponse({ ok: true }, 200, request);
}

export async function denyJoinRequest(request, env, user, groupId, targetUserId) {
  if (!(await requireOwner(env.DB, groupId, user.id))) {
    return errorResponse('Only the group owner can see join requests.', 403, request);
  }

  await env.DB.prepare(
    `DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND status = 'pending'`
  )
    .bind(groupId, targetUserId)
    .run();

  return jsonResponse({ ok: true }, 200, request);
}

async function requireActiveMember(db, group, userId) {
  if (group.is_global) {
    return true;
  }
  const membership = await db
    .prepare('SELECT status FROM group_members WHERE group_id = ? AND user_id = ?')
    .bind(group.id, userId)
    .first();
  return !!membership && membership.status === 'active';
}

export async function listMembers(request, env, user, groupId) {
  const group = await env.DB.prepare('SELECT id, is_global FROM groups WHERE id = ?')
    .bind(groupId)
    .first();
  if (!group) {
    return errorResponse('That group does not exist.', 404, request);
  }
  if (!(await requireActiveMember(env.DB, group, user.id))) {
    return errorResponse('You are not a member of that group.', 403, request);
  }

  const { results } = await env.DB.prepare(
    `SELECT u.id AS user_id, u.name, u.initials, gm.role, gm.joined_at
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = ? AND gm.status = 'active'
     ORDER BY (gm.role = 'owner') DESC, u.name ASC`
  )
    .bind(groupId)
    .all();

  const members = results.map((row) => ({
    userId: row.user_id,
    name: row.name,
    initials: row.initials,
    role: row.role,
    joinedAt: new Date(row.joined_at + 'Z').getTime(),
  }));

  return jsonResponse({ members }, 200, request);
}

const LEADERBOARD_SORT_KEYS = {
  streak: 'streak',
  total: 'totalDays',
  group: 'daysInGroup',
};

export async function getLeaderboard(request, env, user, groupId) {
  const group = await env.DB.prepare('SELECT id, is_global FROM groups WHERE id = ?')
    .bind(groupId)
    .first();
  if (!group) {
    return errorResponse('That group does not exist.', 404, request);
  }
  if (!(await requireActiveMember(env.DB, group, user.id))) {
    return errorResponse('You are not a member of that group.', 403, request);
  }

  const url = new URL(request.url);
  const challengeParam = url.searchParams.get('challenge')?.trim().toLowerCase();
  const challenge = challengeParam && challengeParam !== 'all' ? challengeParam : null;
  const sortKey = LEADERBOARD_SORT_KEYS[url.searchParams.get('sort')] || 'streak';

  // The candidate set is the same regardless of challenge filter: a group's
  // active members, or (for the global feed, which has no membership rows
  // worth using) everyone who has ever posted there.
  const membersFrom = group.is_global
    ? `(SELECT DISTINCT user_id FROM posts WHERE group_id = ?) base`
    : `(SELECT user_id FROM group_members WHERE group_id = ? AND status = 'active') base`;

  let query;
  let params;

  if (challenge) {
    query = `
      SELECT u.id AS user_id, u.name, u.initials,
             COALESCE(cs.streak, 0) AS streak,
             COALESCE(cs.best_streak, 0) AS best_streak,
             COALESCE(cs.total_days, 0) AS total_days,
             (SELECT COUNT(DISTINCT p.day_key) FROM posts p
              WHERE p.group_id = ? AND p.user_id = u.id AND p.challenge = ?) AS days_in_group
      FROM ${membersFrom}
      JOIN users u ON u.id = base.user_id
      LEFT JOIN challenge_streaks cs ON cs.user_id = u.id AND cs.challenge = ?
    `;
    // Bind order follows where the ? marks fall in the SQL text above: the
    // days_in_group subquery's group and challenge, then membersFrom's group,
    // then the challenge_streaks join.
    params = [groupId, challenge, groupId, challenge];
  } else {
    query = `
      SELECT u.id AS user_id, u.name, u.initials,
             u.streak AS streak, u.best_streak AS best_streak, u.total_days AS total_days,
             (SELECT COUNT(DISTINCT p.day_key) FROM posts p
              WHERE p.group_id = ? AND p.user_id = u.id) AS days_in_group
      FROM ${membersFrom}
      JOIN users u ON u.id = base.user_id
    `;
    params = [groupId, groupId];
  }

  const { results } = await env.DB.prepare(query)
    .bind(...params)
    .all();

  const entries = results.map((row) => ({
    userId: row.user_id,
    name: row.name,
    initials: row.initials,
    isMe: row.user_id === user.id,
    streak: row.streak,
    bestStreak: row.best_streak,
    totalDays: row.total_days,
    daysInGroup: row.days_in_group,
  }));

  entries.sort((a, b) => {
    if (b[sortKey] !== a[sortKey]) {
      return b[sortKey] - a[sortKey];
    }
    if (b.bestStreak !== a.bestStreak) {
      return b.bestStreak - a.bestStreak;
    }
    return a.name.localeCompare(b.name);
  });

  let rank = 0;
  let prevValue = null;
  const leaderboard = entries.map((entry, index) => {
    if (entry[sortKey] !== prevValue) {
      rank = index + 1;
      prevValue = entry[sortKey];
    }
    return { ...entry, rank };
  });

  return jsonResponse({ leaderboard }, 200, request);
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
  // Lowercased defensively: the contract's canonical challenge value is the
  // bare lowercase id ("tefillin"), but a stale app build could still send
  // the display name ("Tefillin"). Without this a stale build would create a
  // second, differently-cased challenge_streaks row instead of updating the
  // real one.
  const challenge = (body?.challenge?.trim() || 'tefillin').toLowerCase();
  const caption = body?.caption?.trim() || '';
  const groupId = body?.groupId || 'group-global';
  const dayKey = body?.dayKey;
  const photoKey = body?.photoKey || null;

  if (!isValidDayKey(dayKey)) {
    return errorResponse('Missing or invalid day.', 400, request);
  }

  if (groupId !== 'group-global') {
    const membership = await env.DB.prepare(
      `SELECT status FROM group_members WHERE group_id = ? AND user_id = ?`
    )
      .bind(groupId, user.id)
      .first();
    if (!membership || membership.status !== 'active') {
      return errorResponse('You are not a member of that group.', 403, request);
    }
  }

  const duplicate = await env.DB.prepare(
    'SELECT id FROM posts WHERE user_id = ? AND challenge = ? AND day_key = ?'
  )
    .bind(user.id, challenge, dayKey)
    .first();
  if (duplicate) {
    return errorResponse('You already logged that today.', 409, request);
  }

  // Streak math happens here, on the server, using the phone's day key but
  // the server's own record of when the user last logged. This is what
  // keeps the streak honest. It cannot be inflated by editing anything
  // stored on the device, since the device no longer stores the streak.
  const alreadyLoggedToday = user.last_logged_date === dayKey;
  const nextStreak = nextStreakValue(user.last_logged_date, dayKey, user.streak);

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

  // Per-challenge streak, independent of the overall one above. The
  // once-per-challenge-per-day guard already ran, so this is always a real
  // new log for this challenge, never a same-day no-op.
  const existingChallengeStreak = await env.DB.prepare(
    'SELECT streak, last_logged_date FROM challenge_streaks WHERE user_id = ? AND challenge = ?'
  )
    .bind(user.id, challenge)
    .first();

  const nextChallengeStreak = nextStreakValue(
    existingChallengeStreak?.last_logged_date ?? null,
    dayKey,
    existingChallengeStreak?.streak ?? 0
  );

  await env.DB.prepare(
    `INSERT INTO challenge_streaks (user_id, challenge, streak, best_streak, total_days, last_logged_date)
     VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT(user_id, challenge) DO UPDATE SET
       streak = excluded.streak,
       best_streak = MAX(best_streak, excluded.streak),
       total_days = total_days + 1,
       last_logged_date = excluded.last_logged_date`
  )
    .bind(user.id, challenge, nextChallengeStreak, nextChallengeStreak, dayKey)
    .run();

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
      user: await userIsFrontend(env, updatedUser),
    },
    201,
    request
  );
}
