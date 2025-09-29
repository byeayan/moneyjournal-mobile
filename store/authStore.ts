import { API_BASE_URL } from '@/config/api';
import { create } from 'zustand';

interface AuthState {
  authToken: string | null;
  user: any;
  isLoggedIn: boolean;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
  signup: (username: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
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

    if (response.ok) {
      set({ authToken: data.accessToken, isLoggedIn: true });
    } else {
      throw new Error(data.message || 'Signup failed');
    }
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

    if (response.ok) {
      set({ authToken: data.accessToken, isLoggedIn: true });
    } else {
      throw new Error(data.message || 'Login failed');
    }
  },
}));