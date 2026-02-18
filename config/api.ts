import Constants from 'expo-constants';
import { Platform } from 'react-native';

const ENV_API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

function getExpoHostApiUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    // fallback for older/newer Expo runtime shapes
    (Constants as any)?.manifest2?.extra?.expoGo?.developer?.host;

  if (!hostUri || typeof hostUri !== 'string') return null;
  const host = hostUri.split(':')[0];
  if (!host) return null;
  return `http://${host}:5000/api`;
}

const expoHostApiUrl = getExpoHostApiUrl();

const FALLBACK_API_BASE_URL =
  Platform.OS === 'android'
    ? expoHostApiUrl ?? 'http://10.0.2.2:5000/api'
    : Platform.OS === 'web'
      ? 'http://localhost:5000/api'
      : expoHostApiUrl ?? 'http://127.0.0.1:5000/api';

export const API_BASE_URL =
  ENV_API_BASE_URL && ENV_API_BASE_URL.length > 0
    ? ENV_API_BASE_URL
    : FALLBACK_API_BASE_URL;
