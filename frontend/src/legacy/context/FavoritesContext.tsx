import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Place } from '../types';
import { favoritesApi } from '../api/client';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: Place[];
  addFavorite: (place: Place) => Promise<void>;
  removeFavorite: (placeId: number) => Promise<void>;
  isFavorite: (placeId: number) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  // 1. Initial cache read for zero-latency first paint
  const [favorites, setFavorites] = useState<Place[]>(() => {
    const saved = localStorage.getItem('roamlocal_favorites');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // 2. SSOT Hydration: Fetch real favorites from SQLite whenever logged in
  useEffect(() => {
    if (!user?.email) return;

    let isMounted = true;
    const fetchDbFavorites = async () => {
      try {
        const dbFavs = await favoritesApi.getFavorites(user.email);
        if (isMounted && dbFavs) {
          setFavorites(dbFavs);
          localStorage.setItem('roamlocal_favorites', JSON.stringify(dbFavs));
        }
      } catch (err) {
        console.error("Failed to load favorites from SQLite:", err);
      }
    };

    fetchDbFavorites();
    return () => { isMounted = false; };
  }, [user?.email]);

  // 3. Cache backup
  useEffect(() => {
    localStorage.setItem('roamlocal_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // 4. Add favorite: Optimistic UI update + SQLite persistence
  const addFavorite = async (place: Place) => {
    setFavorites(prev => {
      if (prev.some(p => p.id === place.id)) return prev;
      const next = [...prev, place];
      localStorage.setItem('roamlocal_favorites', JSON.stringify(next));
      return next;
    });

    if (user?.email) {
      await favoritesApi.addFavorite(place.id, user.email);
    }
  };

  // 5. Remove favorite: Optimistic UI update + SQLite deletion
  const removeFavorite = async (placeId: number) => {
    setFavorites(prev => {
      const next = prev.filter(p => p.id !== placeId);
      localStorage.setItem('roamlocal_favorites', JSON.stringify(next));
      return next;
    });

    if (user?.email) {
      await favoritesApi.removeFavorite(placeId, user.email);
    }
  };

  const isFavorite = (placeId: number) => {
    return favorites.some(p => p.id === placeId);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, addFavorite, removeFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

