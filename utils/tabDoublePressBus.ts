import type { AppTabParamList } from '@/navigation/AppNavigator';

type TabName = keyof AppTabParamList;
type Listener = () => void;

const listeners = new Map<TabName, Set<Listener>>();

export function subscribeTabDoublePress(tab: TabName, listener: Listener) {
  const current = listeners.get(tab) ?? new Set<Listener>();
  current.add(listener);
  listeners.set(tab, current);

  return () => {
    const next = listeners.get(tab);
    if (!next) return;
    next.delete(listener);
    if (next.size === 0) {
      listeners.delete(tab);
    }
  };
}

export function emitTabDoublePress(tab: TabName) {
  const set = listeners.get(tab);
  if (!set) return;
  set.forEach((listener) => listener());
}
