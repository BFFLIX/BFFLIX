// mobile/src/lib/tokenStore.ts

import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "bfflix_access_token";
const REFRESH_TOKEN_KEY = "bfflix_refresh_token";

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string) {
  // Validate that tokens are actually strings (not undefined, null, etc.)
  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Invalid access token: must be a non-empty string');
  }
  if (!refreshToken || typeof refreshToken !== 'string') {
    throw new Error('Invalid refresh token: must be a non-empty string');
  }

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}