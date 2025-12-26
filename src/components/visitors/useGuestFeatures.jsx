import React from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Importar tracking apenas quando disponível
let trackActionFn = null;
try {
  const { useVisitorTracking } = await import("../tracking/VisitorTracker");
  trackActionFn = useVisitorTracking;
} catch (e) {
  // Tracking não disponível
}

/**
 * Hook para gerir funcionalidades de visitantes não autenticados
 * Usa localStorage para persistir dados e sincroniza quando o utilizador faz login
 */
export function useGuestFeatures() {
  const [user, setUser] = React.useState(null);
  const [favorites, setFavorites] = React.useState([]);
  const [viewHistory, setViewHistory] = React.useState([]);
  const [syncedToAccount, setSyncedToAccount] = React.useState(false);

  // Load user
  React.useEffect(() => {
    base44.auth.me()
      .then(u => setUser(u))
      .catch(() => setUser(null));
  }, []);

  // Load favorites from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('guest_favorites');
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (e) {
        console.warn('Failed to parse favorites:', e);
      }
    }
  }, []);

  // Load view history from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('guest_view_history');
    if (stored) {
      try {
        setViewHistory(JSON.parse(stored));
      } catch (e) {
        console.warn('Failed to parse view history:', e);
      }
    }
  }, []);

  // Sync to account when user logs in
  React.useEffect(() => {
    if (user && favorites.length > 0 && !syncedToAccount) {
      syncFavoritesToAccount();
    }
  }, [user, favorites.length]);

  const syncFavoritesToAccount = async () => {
    if (!user || favorites.length === 0) return;

    try {
      // Get existing saved properties
      const existing = await base44.entities.SavedProperty.list();
      const existingIds = existing.map(s => s.property_id);

      // Sync only new favorites
      const toSync = favorites.filter(fav => !existingIds.includes(fav.property_id));

      if (toSync.length > 0) {
        await base44.entities.SavedProperty.bulkCreate(
          toSync.map(fav => ({
            property_id: fav.property_id,
            property_title: fav.property_title,
            property_image: fav.property_image,
            user_email: user.email
          }))
        );

        toast.success(`${toSync.length} favoritos sincronizados com a sua conta!`);
      }

      setSyncedToAccount(true);
      // Clear localStorage after sync
      localStorage.removeItem('guest_favorites');
      setFavorites([]);
    } catch (error) {
      console.warn('Failed to sync favorites:', error);
    }
  };

  const addFavorite = (property) => {
    if (user) {
      // If logged in, save to database directly
      return base44.entities.SavedProperty.create({
        property_id: property.id,
        property_title: property.title,
        property_image: property.images?.[0],
        user_email: user.email
      });
    } else {
      // Save to localStorage
      const newFav = {
        property_id: property.id,
        property_title: property.title,
        property_image: property.images?.[0],
        added_at: new Date().toISOString()
      };

      const updated = [...favorites, newFav];
      setFavorites(updated);
      localStorage.setItem('guest_favorites', JSON.stringify(updated));
      
      // Track favorite action (se disponível)
      if (trackActionFn) {
        try {
          const { trackAction } = trackActionFn();
          trackAction('favorite_added', {
            property_id: property.id,
            property_title: property.title
          });
        } catch (e) {
          // Ignorar se tracking falhar
        }
      }
      
      // Show prompt to register after 3 favorites
      if (updated.length === 3) {
        return 'prompt_register';
      }
      
      return Promise.resolve();
    }
  };

  const removeFavorite = (propertyId) => {
    if (user) {
      // Remove from database
      return base44.entities.SavedProperty.filter({ property_id: propertyId })
        .then(saved => {
          if (saved.length > 0) {
            return base44.entities.SavedProperty.delete(saved[0].id);
          }
        });
    } else {
      // Remove from localStorage
      const updated = favorites.filter(f => f.property_id !== propertyId);
      setFavorites(updated);
      localStorage.setItem('guest_favorites', JSON.stringify(updated));
      return Promise.resolve();
    }
  };

  const isFavorite = (propertyId) => {
    return favorites.some(f => f.property_id === propertyId);
  };

  const addToHistory = (property) => {
    const newEntry = {
      property_id: property.id,
      property_title: property.title,
      property_image: property.images?.[0],
      viewed_at: new Date().toISOString()
    };

    // Keep only last 20 items
    const updated = [newEntry, ...viewHistory.filter(v => v.property_id !== property.id)].slice(0, 20);
    setViewHistory(updated);
    localStorage.setItem('guest_view_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setViewHistory([]);
    localStorage.removeItem('guest_view_history');
  };

  const saveSearchFilters = (filters) => {
    localStorage.setItem('guest_search_filters', JSON.stringify(filters));
  };

  const loadSearchFilters = () => {
    const stored = localStorage.getItem('guest_search_filters');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  return {
    user,
    favorites,
    viewHistory,
    addFavorite,
    removeFavorite,
    isFavorite,
    addToHistory,
    clearHistory,
    saveSearchFilters,
    loadSearchFilters,
    favoritesCount: favorites.length,
    isGuest: !user
  };
}