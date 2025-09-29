import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  authToken: null,
  user: null,
  isLoggedIn: false,
  setAuth: (token: any, user: any) => set({ authToken: token, user, isLoggedIn: true }),
  logout: () => set({ authToken: null, user: null, isLoggedIn: false }),
}));
