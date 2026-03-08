import React, { createContext, useContext, useCallback, useState, useEffect } from "react";

export interface FavoriteEscort {
  id: string;
  username: string;
  city: string;
  profilePicturePath: string | null;
}

const STORAGE_KEY = "escort_favorites";

function loadFromStorage(): FavoriteEscort[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: FavoriteEscort[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface FavoritesContextType {
  favorites: FavoriteEscort[];
  isFavorite: (id: string) => boolean;
  addFavorite: (escort: FavoriteEscort) => void;
  removeFavorite: (id: string) => void;
  toggleFavorite: (escort: FavoriteEscort) => void;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  isFavorite: () => false,
  addFavorite: () => {},
  removeFavorite: () => {},
  toggleFavorite: () => {},
});

export const useFavorites = () => useContext(FavoritesContext);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteEscort[]>([]);

  useEffect(() => {
    setFavorites(loadFromStorage());
  }, []);

  const addFavorite = useCallback((escort: FavoriteEscort) => {
    setFavorites((prev) => {
      if (prev.some((f) => f.id === escort.id)) return prev;
      const next = [...prev, escort];
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites]
  );

  const toggleFavorite = useCallback((escort: FavoriteEscort) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === escort.id);
      const next = exists ? prev.filter((f) => f.id !== escort.id) : [...prev, escort];
      saveToStorage(next);
      return next;
    });
  }, []);

  return (
    <FavoritesContext.Provider
      value={{ favorites, isFavorite, addFavorite, removeFavorite, toggleFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};
