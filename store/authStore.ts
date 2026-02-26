import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/config/api';
import { create } from 'zustand';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

function parseUserFromToken(token: string) {
  const parsed = parseTokenPayload(token);
  return parsed?.user ?? null;
}

function parseTokenPayload(token: string): any {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string) {
  const payload = parseTokenPayload(token);
  if (!payload?.exp || typeof payload.exp !== 'number') return false;
  return Date.now() >= payload.exp * 1000;
}

async function persistAuth(token: string, user: any) {
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, token],
    [AUTH_USER_KEY, JSON.stringify(user ?? null)],
  ]);
}

async function clearPersistedAuth() {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, AUTH_USER_KEY]);
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function readResponseBody(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out. Check API at ${API_BASE_URL}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

interface ProfileUpdatePayload {
  username?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  phone?: string;
}

interface AuthState {
  authToken: string | null;
  user: any;
  isLoggedIn: boolean;
  isHydrated: boolean;
  initializeAuth: () => Promise<void>;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
  signup: (username: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  requireValidToken: () => Promise<string>;
  fetchCurrentUser: () => Promise<void>;
  updateCurrentUser: (payload: ProfileUpdatePayload) => Promise<void>;
  deleteCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authToken: null,
  user: null,
  isLoggedIn: false,
  isHydrated: false,

  initializeAuth: async () => {
    try {
      const [token, rawUser] = await AsyncStorage.multiGet([AUTH_TOKEN_KEY, AUTH_USER_KEY]).then(
        (pairs) => pairs.map((pair) => pair[1])
      );

      if (!token) {
        set({ isHydrated: true });
        return;
      }

      if (isTokenExpired(token)) {
        await clearPersistedAuth();
        set({ authToken: null, user: null, isLoggedIn: false, isHydrated: true });
        return;
      }

      let user: any = parseUserFromToken(token);
      if (rawUser) {
        try {
          user = JSON.parse(rawUser);
        } catch {
          user = parseUserFromToken(token);
        }
      }

      set({ authToken: token, user, isLoggedIn: true });

      try {
        await get().fetchCurrentUser();
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const shouldInvalidateSession =
          message.includes('Session expired') ||
          message.includes('No auth token') ||
          message.toLowerCase().includes('not authorized');

        if (shouldInvalidateSession) {
          await clearPersistedAuth();
          set({ authToken: null, user: null, isLoggedIn: false });
        }
      }
    } finally {
      set({ isHydrated: true });
    }
  },

  setAuth: (token: string, user: any) => {
    set({ authToken: token, user, isLoggedIn: true });
    void persistAuth(token, user);
  },

  logout: () => {
      set({ authToken: null, user: null, isLoggedIn: false });
      void clearPersistedAuth();
  },

  requireValidToken: async () => {
    const token = get().authToken;
    if (!token) throw new Error('No auth token found');

    if (isTokenExpired(token)) {
      set({ authToken: null, user: null, isLoggedIn: false });
      await clearPersistedAuth();
      throw new Error('Session expired. Please log in again.');
    }

    return token;
  },

  signup: async (username: string, email: string, password: string) => {
    let response: Response;
    try {
      response = await fetchWithTimeout(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });
    } catch (error) {
      if (error instanceof Error) throw new Error(error.message);
      throw new Error(`Cannot reach API at ${API_BASE_URL}`);
    }

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Signup failed'));
    }

    const data = await response.json();
    const parsedUser = parseUserFromToken(data.accessToken);

    set({
      authToken: data.accessToken,
      user: parsedUser,
      isLoggedIn: true,
    });
    await persistAuth(data.accessToken, parsedUser);

    await get().fetchCurrentUser();
  },

  login: async (email: string, password: string) => {
    let response: Response;
    try {
      response = await fetchWithTimeout(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
    } catch (error) {
      if (error instanceof Error) throw new Error(error.message);
      throw new Error(`Cannot reach API at ${API_BASE_URL}`);
    }

    if (!response.ok) {
      throw new Error(await readErrorMessage(response, 'Login failed'));
    }

    const data = await response.json();
    const parsedUser = parseUserFromToken(data.accessToken);

    set({
      authToken: data.accessToken,
      user: parsedUser,
      isLoggedIn: true,
    });
    await persistAuth(data.accessToken, parsedUser);

    await get().fetchCurrentUser();
  },

  fetchCurrentUser: async () => {
    const token = await get().requireValidToken();

    const response = await fetchWithTimeout(`${API_BASE_URL}/users/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await readResponseBody(response);

    if (!response.ok) {
      throw new Error((data as any)?.message || 'Failed to fetch profile');
    }

    set({ user: data });
    await persistAuth(token, data);
  },

  updateCurrentUser: async (payload) => {
    const token = await get().requireValidToken();

    const response = await fetchWithTimeout(`${API_BASE_URL}/users/current`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await readResponseBody(response);

    if (!response.ok) {
      throw new Error((data as any)?.message || 'Failed to update profile');
    }

    set({ user: (data as any)?.user ?? data });
    await persistAuth(token, (data as any)?.user ?? data);
  },

  deleteCurrentUser: async () => {
    const token = await get().requireValidToken();

    const response = await fetchWithTimeout(`${API_BASE_URL}/users/current`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await readResponseBody(response);

    if (!response.ok) {
      throw new Error((data as any)?.message || 'Failed to delete account');
    }

    set({ authToken: null, user: null, isLoggedIn: false });
    await clearPersistedAuth();
  },
}));
