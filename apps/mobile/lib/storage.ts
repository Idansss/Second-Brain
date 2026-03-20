import * as SecureStore from "expo-secure-store";

const KEYS = {
  SESSION_TOKEN: "sb_session_token",
  API_URL: "sb_api_url",
} as const;

// ── Session token ─────────────────────────────────────────────────────────────

export async function getSessionToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.SESSION_TOKEN);
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.SESSION_TOKEN, token);
}

export async function clearSessionToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.SESSION_TOKEN);
}

// ── API URL override ──────────────────────────────────────────────────────────

export async function getStoredApiUrl(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEYS.API_URL);
  } catch {
    return null;
  }
}

export async function setStoredApiUrl(url: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.API_URL, url);
}
