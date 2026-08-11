// The whole backend in one router. Every request comes through here first,
// which looks at the method and path and calls the matching function from
// handlers.js. Routes marked "requiresAuth: true" get checked against the
// sessions table before their handler ever runs.

import { getUserFromRequest } from './auth.js';
import { corsHeaders, errorResponse } from './utils.js';
import * as handlers from './handlers.js';

const routes = [
  { method: 'POST', pattern: /^\/api\/signup$/, handler: handlers.signup, requiresAuth: false },
  { method: 'POST', pattern: /^\/api\/login$/, handler: handlers.login, requiresAuth: false },
  { method: 'POST', pattern: /^\/api\/logout$/, handler: handlers.logout, requiresAuth: false },
  { method: 'GET', pattern: /^\/api\/me$/, handler: handlers.me, requiresAuth: true },

  { method: 'GET', pattern: /^\/api\/groups$/, handler: handlers.listGroups, requiresAuth: true },
  { method: 'POST', pattern: /^\/api\/groups$/, handler: handlers.createGroup, requiresAuth: true },
  {
    method: 'POST',
    pattern: /^\/api\/groups\/([^/]+)\/join$/,
    handler: (request, env, user, match) => handlers.joinGroup(request, env, user, match[1]),
    requiresAuth: true,
  },
  {
    method: 'POST',
    pattern: /^\/api\/groups\/([^/]+)\/leave$/,
    handler: (request, env, user, match) => handlers.leaveGroup(request, env, user, match[1]),
    requiresAuth: true,
  },

  { method: 'GET', pattern: /^\/api\/posts$/, handler: handlers.listPosts, requiresAuth: true },
  { method: 'POST', pattern: /^\/api\/posts$/, handler: handlers.createPost, requiresAuth: true },

  { method: 'POST', pattern: /^\/api\/upload$/, handler: handlers.uploadPhoto, requiresAuth: true },
  // Serving a photo does not need a login. Once a post is in a feed anyone in
  // that group can already see it, so the photo itself is not any more
  // private than the post is.
  {
    method: 'GET',
    pattern: /^\/api\/photo\/([^/]+)$/,
    handler: handlers.getPhoto,
    requiresAuth: false,
  },
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Browsers send a preflight OPTIONS request before certain real requests.
    // It just needs the CORS headers back, no handler involved.
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(request) });
    }

    const route = routes.find((r) => r.method === request.method && r.pattern.test(url.pathname));
    if (!route) {
      return errorResponse('Not found.', 404, request);
    }

    let user = null;
    if (route.requiresAuth) {
      user = await getUserFromRequest(request, env.DB);
      if (!user) {
        return errorResponse('Please log in again.', 401, request);
      }
    }

    try {
      const match = url.pathname.match(route.pattern);
      return await route.handler(request, env, user, match);
    } catch (error) {
      console.error('Unhandled error:', error);
      return errorResponse('Something went wrong on our end.', 500, request);
    }
  },
};
