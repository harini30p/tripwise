/**
 * itineraryApi.js
 *
 * Thin client for the TripWise backend itinerary REST API.
 * Endpoint base is read from the VITE_API_BASE_URL env variable,
 * defaulting to http://localhost:5000 for local development.
 *
 * All functions throw a plain Error with a safe, user-readable message
 * on failure so that calling code can display it without exposing
 * internal server details.
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

/**
 * Fetches the full itinerary for the given clientId.
 * @param {string} clientId
 * @returns {Promise<Array>} Array of sanitised destination objects
 */
export async function fetchItinerary(clientId) {
  const url = `${BASE_URL}/api/itinerary?clientId=${encodeURIComponent(clientId)}`;

  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Could not reach the TripWise server. Check your connection and try again.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to load itinerary (${response.status}). ${text ? text.slice(0, 120) : ''}`);
  }

  const data = await response.json();
  // The API returns { clientId, count, items: [...] }
  if (!Array.isArray(data.items)) {
    throw new Error('Unexpected response format from itinerary API.');
  }
  return data.items;
}

/**
 * Saves a destination to the backend itinerary.
 * Uses POST with upsert semantics — safe to call multiple times for the same place.
 * @param {string} clientId
 * @param {object} destination  A sanitised destination object with at minimum title and id/place_id
 * @returns {Promise<object>}   The saved item as returned by the server
 */
export async function saveDestination(clientId, destination) {
  const url = `${BASE_URL}/api/itinerary`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, destination }),
    });
  } catch {
    throw new Error('Could not reach the TripWise server. The destination was not saved.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to save destination (${response.status}). ${text ? text.slice(0, 120) : ''}`);
  }

  const data = await response.json();
  // The API returns { message, item: {...} }
  return data.item;
}

/**
 * Removes a destination from the backend itinerary.
 * @param {string} clientId
 * @param {string} placeId    The stable place_id / id of the destination to remove
 * @returns {Promise<void>}
 */
export async function removeDestination(clientId, placeId) {
  const url = `${BASE_URL}/api/itinerary/${encodeURIComponent(placeId)}?clientId=${encodeURIComponent(clientId)}`;

  let response;
  try {
    response = await fetch(url, { method: 'DELETE' });
  } catch {
    throw new Error('Could not reach the TripWise server. The destination was not removed.');
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to remove destination (${response.status}). ${text ? text.slice(0, 120) : ''}`);
  }
  // 200 OK with { message, removedPlaceId } — no return value needed
}
