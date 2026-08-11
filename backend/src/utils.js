// Small helpers shared across the backend. Nothing here is specific to any one
// route, it is just plumbing (turning bytes into hex text, building JSON
// responses with the right headers, and so on).

// Allowed origins for the web demo. The native app on a phone does not go
// through CORS at all (only browsers enforce it), so this list only matters
// for testing in a browser tab.
const ALLOWED_ORIGINS = [
  'http://localhost:8081',
  'http://localhost:19006',
];

export function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function jsonResponse(data, status, request) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
    },
  });
}

export function errorResponse(message, status, request) {
  return jsonResponse({ error: message }, status, request);
}

export function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

// A normal === comparison on the wrong two hashes returns slightly faster or
// slower depending on which characters happen to match. That timing
// difference is a real, if narrow, way to leak information about a secret.
// This walks the whole string every time so a wrong guess always takes the
// same amount of time as any other wrong guess.
export function timingSafeEqual(a, b) {
  if (a.length !== b.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

// Everyone's day key ("YYYY-MM-DD") comes from their own phone, since only the
// phone knows what "today" means where the person actually is. This just
// checks the shape is sane so a bad request cannot write garbage into the
// database.
export function isValidDayKey(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// How many days apart two day keys are. Mirrors src/dateHelpers.js on the app
// side, so the server's idea of a streak always matches what the app shows.
export function daysBetween(fromKey, toKey) {
  if (!fromKey || !toKey) {
    return null;
  }
  const [fromYear, fromMonth, fromDay] = fromKey.split('-').map(Number);
  const [toYear, toMonth, toDay] = toKey.split('-').map(Number);
  const from = Date.UTC(fromYear, fromMonth - 1, fromDay, 12);
  const to = Date.UTC(toYear, toMonth - 1, toDay, 12);
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}
