// The one place that knows the backend's web address and how to talk to it.
// Every other file calls these functions instead of using fetch() directly,
// so if the address ever changes, this is the only file that needs editing.

import { Platform } from 'react-native';

// Points at the real, deployed Cloudflare Worker, not a local address. This
// way the phone and the web demo both reach the same backend no matter what
// Wi-Fi network they are on, instead of needing the phone and the computer
// on the same network like the Expo dev server does.
const API_BASE_URL = 'https://tefillinchallenge-api.tefillinchallenge-api.workers.dev';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Every request goes through here. `token` is optional, only the routes that
// need someone logged in will actually check it.
async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    // No internet, or the backend is unreachable. This is different from the
    // server responding with an error, so it gets its own friendly message.
    throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong.', response.status);
  }

  return data;
}

export const api = {
  signup: (email, password, name) => request('/api/signup', { method: 'POST', body: { email, password, name } }),
  login: (email, password) => request('/api/login', { method: 'POST', body: { email, password } }),
  logout: (token) => request('/api/logout', { method: 'POST', token }),
  me: (token) => request('/api/me', { token }),

  getGroups: (token) => request('/api/groups', { token }),
  createGroup: (token, name, description) =>
    request('/api/groups', { method: 'POST', token, body: { name, description } }),
  joinGroup: (token, groupId) => request(`/api/groups/${groupId}/join`, { method: 'POST', token }),
  leaveGroup: (token, groupId) => request(`/api/groups/${groupId}/leave`, { method: 'POST', token }),

  getPosts: (token, feed) => request(`/api/posts?feed=${feed}`, { token }),
  createPost: (token, { challenge, caption, groupId, dayKey, photoKey }) =>
    request('/api/posts', {
      method: 'POST',
      token,
      body: { challenge, caption, groupId, dayKey, photoKey },
    }),

  // Photo uploads use multipart/form-data, not JSON, and skip the JSON
  // Content-Type header that request() normally sets, so this bypasses
  // request() and builds the fetch call itself.
  uploadPhoto: async (token, localUri) => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // The web build runs on the browser's own fetch, which only accepts a
      // real Blob for a file field, not the {uri, name, type} shape below.
      // The image picker hands back a blob: URL on web, so this reads it
      // back into an actual Blob first.
      const blob = await fetch(localUri).then((response) => response.blob());
      formData.append('photo', blob, 'photo.jpg');
    } else {
      // On a real phone, Expo's fetch understands this {uri, name, type}
      // shape for a local file and turns it into the actual file bytes on
      // the wire.
      formData.append('photo', {
        uri: localUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });
    }

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    } catch (networkError) {
      throw new ApiError('Could not reach the server. Check your connection and try again.', 0);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ApiError(data.error || 'Could not upload photo.', response.status);
    }
    return data;
  },
};

export { ApiError };
