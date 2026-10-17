/**
 * Storage utility for TripWise itinerary helpers.
 *
 * The itinerary itself is now stored in PostgreSQL via the backend API.
 * This module provides:
 *  - getClientId()      : stable anonymous browser identity for the API
 *  - getStableItemId()  : deterministic ID derivation for destination objects
 *  - sanitizeTripItem() : normalises a destination for display/API submission
 */

const CLIENT_ID_KEY = 'tripwise_client_id';

/**
 * Returns a stable, anonymous client ID for this browser.
 * Creates and persists a random UUID the first time it is called.
 * Safe to call repeatedly — always returns the same ID for the same browser.
 */
export function getClientId() {
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;

    // Generate a simple UUID v4
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : 'tw-' + Math.random().toString(36).slice(2) + Date.now().toString(36);

    window.localStorage.setItem(CLIENT_ID_KEY, id);
    return id;
  } catch {
    // localStorage unavailable — return a session-only fallback
    return 'tw-session-' + Math.random().toString(36).slice(2);
  }
}

/**
 * Derives a stable, deterministic ID for any destination item.
 * Uses item.id if available, or hashes identifying fields (title + country + category).
 */
export function getStableItemId(item) {
  if (item?.id && typeof item.id === 'string' && item.id.trim()) {
    return item.id.trim();
  }
  const cleanTitle = (item?.title || 'destination').toLowerCase().replace(/\s+/g, '-');
  const cleanCountry = (item?.country || '').toLowerCase().replace(/\s+/g, '-');
  const cleanCategory = (item?.category || '').toLowerCase().replace(/\s+/g, '-');
  return `trip-${cleanTitle}-${cleanCountry}-${cleanCategory}`;
}

/**
 * Normalizes an item for storage, preserving all required display properties
 * while preventing unintended or circular bloat.
 */
export function sanitizeTripItem(item) {
  if (!item || typeof item !== 'object') return null;

  const id = getStableItemId(item);
  return {
    id,
    title: item.title || 'Saved Destination',
    country: item.country || '',
    category: item.category || 'Tourism',
    description: item.description || '',
    estimatedCost: item.estimatedCost || 'Attraction / Sight',
    image: item.image || '',
    localFallbackImage: item.localFallbackImage || '',
    rating: item.rating ?? null,
    coordinates: item.coordinates || null,
  };
}


