import React from 'react';
import AppNavigator from '@/navigation/AppNavigator';
import { useAuthStore } from '@/store/authStore';

export default function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  React.useEffect(() => {
    void initializeAuth();
  }, [initializeAuth]);

  return (
      <AppNavigator />
  );
}
