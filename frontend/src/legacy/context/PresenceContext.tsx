import React, { createContext, useContext, useEffect, useState } from 'react';
import { presenceApi } from '../api/client';

const HEARTBEAT_MS = 45_000;

// One id per browser tab, so a refresh isn't counted as a new visitor
const getSessionId = () => {
  const fresh = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  try {
    let id = sessionStorage.getItem('sn_presence_id');
    if (!id) {
      id = fresh();
      sessionStorage.setItem('sn_presence_id', id);
    }
    return id;
  } catch {
    return fresh();
  }
};

/** Live "explorers online" count (real active tabs + backend baseline), or null until known. */
const PresenceContext = createContext<number | null>(null);

export const PresenceProvider = ({ children }: { children: React.ReactNode }) => {
  const [liveCount, setLiveCount] = useState<number | null>(null);

  useEffect(() => {
    const sessionId = getSessionId();
    let cancelled = false;

    const beat = async () => {
      if (document.visibilityState !== 'visible') return;
      const count = await presenceApi.ping(sessionId);
      if (!cancelled && count !== null) setLiveCount(count);
    };

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener('visibilitychange', beat);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', beat);
    };
  }, []);

  return <PresenceContext.Provider value={liveCount}>{children}</PresenceContext.Provider>;
};

export const useLiveCount = () => useContext(PresenceContext);
