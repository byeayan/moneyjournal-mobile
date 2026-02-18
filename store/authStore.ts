import { API_BASE_URL } from '@/config/api';
import { create } from 'zustand';

function parseUserFromToken(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded);
    return parsed?.user ?? null;
  } catch {
    return null;
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
  setAuth: (token: string, user: any) => void;
  logout: () => void;
  signup: (username: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  updateCurrentUser: (payload: ProfileUpdatePayload) => Promise<void>;
  deleteCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authToken: null,
  user: null,
  isLoggedIn: false,
  setAuth: (token: string, user: any) => set({ authToken: token, user, isLoggedIn: true }),
  logout: () => set({ authToken: null, user: null, isLoggedIn: false }),

  signup: async (username: string, email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Signup failed');
    }

    set({
      authToken: data.accessToken,
      user: parseUserFromToken(data.accessToken),
      isLoggedIn: true,
    });

    await get().fetchCurrentUser();
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    set({
      authToken: data.accessToken,
      user: parseUserFromToken(data.accessToken),
      isLoggedIn: true,
    });

    await get().fetchCurrentUser();
  },

  fetchCurrentUser: async () => {
    const token = get().authToken;
    if (!token) throw new Error('No auth token found');

    const response = await fetch(`${API_BASE_URL}/users/current`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch profile');
    }

    set({ user: data });
  },

  updateCurrentUser: async (payload) => {
    const token = get().authToken;
    if (!token) throw new Error('No auth token found');

    const response = await fetch(`${API_BASE_URL}/users/current`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update profile');
    }

    set({ user: data.user });
  },

  deleteCurrentUser: async () => {
    const token = get().authToken;
    if (!token) throw new Error('No auth token found');

    const response = await fetch(`${API_BASE_URL}/users/current`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete account');
    }

    set({ authToken: null, user: null, isLoggedIn: false });
  },
}));
