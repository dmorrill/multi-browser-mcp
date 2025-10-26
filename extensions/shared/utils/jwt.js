/**
 * JWT utility for browser extensions
 * Provides JWT decoding (without validation) and token management
 *
 * Note: This only decodes JWTs to extract claims. It does NOT validate signatures.
 * Validation happens server-side.
 */

const API_HOST = 'https://mcp-for-chrome.railsblueprint.com';

/**
 * Decode a JWT token and extract the payload
 * @param {string} token - JWT token to decode
 * @returns {object|null} Decoded payload or null if invalid
 */
export function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (e) {
    console.error('[JWT] Failed to decode JWT:', e.message);
    return null;
  }
}

/**
 * Get user info from stored JWT in browser storage
 * @param {object} browserAPI - Browser API (chrome or browser)
 * @returns {Promise<object|null>} User info or null
 */
export async function getUserInfoFromStorage(browserAPI) {
  const result = await browserAPI.storage.local.get(['accessToken']);

  console.log('[JWT] Storage result:', result);

  if (!result.accessToken) {
    console.log('[JWT] No accessToken found in storage');
    return null;
  }

  console.log('[JWT] Found accessToken, decoding...');
  const payload = decodeJWT(result.accessToken);

  if (!payload) {
    console.log('[JWT] Failed to decode JWT');
    return null;
  }

  console.log('[JWT] Decoded payload:', payload);
  console.log('[JWT] connection_url field:', payload.connection_url);

  return {
    email: payload.email || payload.sub || null,
    sub: payload.sub,
    connectionUrl: payload.connection_url || null, // PRO mode relay URL
  };
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @param {string} apiHost - API host URL (optional, defaults to production)
 * @returns {Promise<object>} New tokens { access_token, refresh_token }
 * @throws {Error} If refresh fails
 */
export async function refreshAccessToken(refreshToken, apiHost = API_HOST) {
  console.log('[JWT] Calling refresh token API...');

  const response = await fetch(`${apiHost}/api/v1/oauth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${response.status} ${error}`);
  }

  const data = await response.json();
  if (!data.access_token || !data.refresh_token) {
    throw new Error('Invalid refresh response: missing tokens');
  }

  return data;
}

/**
 * Check if a token is expired
 * @param {string} token - JWT token to check
 * @returns {boolean} True if expired, false if still valid
 */
export function isTokenExpired(token) {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;

  // exp is in seconds, Date.now() is in milliseconds
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}

/**
 * Get token expiry time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiry date or null if invalid
 */
export function getTokenExpiry(token) {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return null;

  return new Date(payload.exp * 1000);
}
