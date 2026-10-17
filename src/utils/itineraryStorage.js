/**
 * Storage utility for persisting and restoring the TripWise user itinerary.
 * Key: 'tripwise_itinerary'
 */

const STORAGE_KEY = 'tripwise_itinerary';

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

/**
 * Safely loads the saved itinerary from browser localStorage.
 * Returns an empty array if storage is empty, inaccessible, or contains corrupt JSON.
 */
export function loadSavedItinerary() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    // Sanitize items and ensure unique IDs
    const seenIds = new Set();
    const sanitized = [];

    for (const item of parsed) {
      const clean = sanitizeTripItem(item);
      if (clean && !seenIds.has(clean.id)) {
        seenIds.add(clean.id);
        sanitized.push(clean);
      }
    }

    return sanitized;
  } catch (err) {
    // Graceful error recovery: never crash the app on storage errors
    console.warn('TripWise storage warning: Could not load saved itinerary from localStorage.', err);
    return [];
  }
}

/**
 * Safely writes the current itinerary array to localStorage.
 * Catches QuotaExceededError or security exceptions silently.
 */
export function saveItinerary(tripItems) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    if (!Array.isArray(tripItems)) {
      return false;
    }

    const payload = tripItems
      .map(sanitizeTripItem)
      .filter(Boolean);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('TripWise storage warning: Could not persist itinerary to localStorage.', err);
    return false;
  }
}
