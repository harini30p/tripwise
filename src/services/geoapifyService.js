/**
 * Service module for querying Geoapify Geocoding and Places API.
 * Data sources: OpenStreetMap (OSM) & Geoapify.
 * License & Attribution: (c) OpenStreetMap contributors, powered by Geoapify.
 *
 * IMPORTANT — Geoapify category format rules (verified against live API):
 *   - Only documented top-level and second-level slugs are accepted.
 *   - Many dot-separated sub-categories (e.g. natural.beach, natural.mountain,
 *     heritage.UNESCO, activity.sport_club, leisure.park.beach) return HTTP 400.
 *   - The safe set used here was validated with real API requests.
 *   - When in doubt, use a broader parent category rather than a deep sub-path.
 */

import { getLocalFallbackImage } from '../utils/imageFallbacks';

// Curated category photography fallbacks (with local SVG backups if network fails)
const CATEGORY_FALLBACK_IMAGES = {
  beach: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  mountains: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
  citybreaks: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=800&q=80',
  culturalheritage: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
  adventure: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?auto=format&fit=crop&w=800&q=80',
  tourism: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
  default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80',
};

/**
 * UI category tag → Geoapify API category parameter mapping.
 *
 * Only category strings confirmed to return HTTP 200 from the Geoapify Places API
 * are included here. Sub-categories deeper than two dot-separated levels
 * (e.g. natural.beach, natural.mountain, leisure.park.beach, heritage.UNESCO)
 * consistently return HTTP 400 and have been removed.
 *
 * Reference: https://apidocs.geoapify.com/docs/places/categories/
 */
export const CATEGORY_MAP = {
  'Beach':            'natural,leisure',
  'Mountains':        'natural',
  'City Breaks':      'tourism.attraction,tourism.sights,entertainment.culture',
  'Cultural Heritage':'heritage,tourism.sights',
  'Adventure':        'leisure,activity',
};

/**
 * Safe default category set — used when no category filter is selected.
 * All entries verified to return HTTP 200 from the Geoapify Places API.
 */
const DEFAULT_CATEGORIES = 'tourism.attraction,tourism.sights,entertainment.culture,heritage,leisure';

/**
 * Returns the configured Geoapify API key from environment variables.
 */
export function getGeoapifyApiKey() {
  return import.meta.env.VITE_GEOAPIFY_API_KEY?.trim() || '';
}

/**
 * Check if a valid Geoapify API key is configured.
 */
export function hasGeoapifyKey() {
  const key = getGeoapifyApiKey();
  return Boolean(key && key !== 'your_geoapify_api_key_here');
}

/**
 * Resolves a city, region, or country query to geographical coordinates and place_id using Geoapify Geocoding.
 * Includes lang=en parameter.
 * Endpoint: GET https://api.geoapify.com/v1/geocode/search
 */
export async function geocodeLocation(searchQuery, apiKey) {
  const url = new URL('https://api.geoapify.com/v1/geocode/search');
  url.searchParams.set('text', searchQuery);
  url.searchParams.set('format', 'json');
  url.searchParams.set('lang', 'en'); // Request English localized results
  url.searchParams.set('apiKey', apiKey);

  let res;
  try {
    res = await fetch(url.toString());
  } catch {
    throw new Error('Network error: Could not reach Geoapify geocoding service.');
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid or restricted Geoapify API key. Check your key and allowed domains.');
    }
    if (res.status === 429) {
      throw new Error('Geoapify daily request limit exceeded (HTTP 429).');
    }
    throw new Error(`Geocoding request failed (HTTP ${res.status}). Please try again.`);
  }

  const data = await res.json();
  if (!data.results || data.results.length === 0) {
    return null;
  }

  const first = data.results[0];

  // Resolve English display name if provided by API (e.g. name_international.en, datasource.raw['name:en'])
  const rawTags = first.datasource?.raw || {};
  const englishCity =
    first.name_international?.en ||
    rawTags['name:en'] ||
    first.city ||
    first.name ||
    searchQuery;

  const englishCountry =
    first.country_international?.en ||
    rawTags['country:en'] ||
    rawTags['int_name'] ||
    first.country ||
    '';

  const englishState =
    first.state_international?.en ||
    first.state ||
    '';

  return {
    placeId: first.place_id,
    resultType: first.result_type || 'city',
    city: englishCity,
    country: englishCountry,
    state: englishState,
    bbox: first.bbox || null,
    lat: first.lat,
    lon: first.lon,
    formatted: first.formatted || '',
  };
}

/**
 * Derives a human-readable English category tag from Geoapify categories array.
 */
export function deriveCategoryLabel(categories = []) {
  if (categories.some(c => c.includes('beach') || c.includes('sand'))) return 'Beach';
  if (categories.some(c => c.includes('mountain') || c.includes('peak'))) return 'Mountains';
  if (categories.some(c => c.includes('heritage') || c.includes('historic'))) return 'Cultural Heritage';
  if (categories.some(c => c.includes('activity') || c.includes('sport'))) return 'Adventure';
  if (categories.some(c => c.includes('attraction') || c.includes('sights'))) return 'City Breaks';
  if (categories.some(c => c.includes('leisure') || c.includes('park'))) return 'Adventure';
  return 'Tourism';
}

/**
 * Chooses an appropriate category-matched image fallback.
 */
export function pickFallbackImage(categoryLabel) {
  const normalized = categoryLabel.toLowerCase().replace(/\s+/g, '');
  return CATEGORY_FALLBACK_IMAGES[normalized] || getLocalFallbackImage(categoryLabel);
}

/**
 * Resolves English place title strictly from API fields without inventing data.
 * Checks OpenStreetMap raw tags and Geoapify international dictionary.
 */
function resolveEnglishTitle(props, categoryLabel) {
  const raw = props.datasource?.raw || {};

  // 1. Check Geoapify localized English name
  if (props.name_international?.en && typeof props.name_international.en === 'string' && props.name_international.en.trim()) {
    return props.name_international.en.trim();
  }

  // 2. Check OpenStreetMap English name tag from datasource.raw
  if (raw['name:en'] && typeof raw['name:en'] === 'string' && raw['name:en'].trim()) {
    return raw['name:en'].trim();
  }

  // 3. Check international romanized name tag from OpenStreetMap
  if (raw['int_name'] && typeof raw['int_name'] === 'string' && raw['int_name'].trim()) {
    return raw['int_name'].trim();
  }

  // 4. Check name:en_rm or name:en-US if present
  if (raw['name:en_rm'] && typeof raw['name:en_rm'] === 'string' && raw['name:en_rm'].trim()) {
    return raw['name:en_rm'].trim();
  }

  // 5. Standard name (already requested with lang=en)
  if (props.name && typeof props.name === 'string' && props.name.trim()) {
    return props.name.trim();
  }

  // 6. Address line 1
  if (props.address_line1 && typeof props.address_line1 === 'string' && props.address_line1.trim()) {
    return props.address_line1.trim();
  }

  // 7. Formatted address leading segment
  if (props.formatted && typeof props.formatted === 'string' && props.formatted.trim()) {
    const firstSegment = props.formatted.split(',')[0].trim();
    if (firstSegment) return firstSegment;
  }

  return `${categoryLabel} Destination`;
}

/**
 * Resolves clean English geographic location string (e.g. "Kyoto, Japan" or "Japan").
 * Prevents redundant duplicates like "Japan, Japan".
 */
function resolveLocationSubtitle(props, fallbackLocation) {
  const raw = props.datasource?.raw || {};

  const englishCountry =
    props.country_international?.en ||
    raw['country:en'] ||
    props.country ||
    fallbackLocation.country ||
    '';

  const englishCity =
    props.city_international?.en ||
    raw['city:en'] ||
    props.city ||
    (fallbackLocation.resultType !== 'country' ? fallbackLocation.city : '') ||
    '';

  if (englishCity && englishCountry && englishCity.toLowerCase() !== englishCountry.toLowerCase()) {
    return `${englishCity}, ${englishCountry}`;
  }
  return englishCountry || englishCity || 'Region';
}

/**
 * Resolves English-friendly address description.
 */
function resolveEnglishDescription(props, title, categoryLabel, locationSubtitle) {
  const formatted = props.formatted?.trim();
  const addressLine2 = props.address_line2?.trim();

  // If address_line2 is clean Latin/English text and distinct from title, use it
  if (addressLine2 && addressLine2.toLowerCase() !== title.toLowerCase()) {
    return addressLine2;
  }

  // If formatted is clean and distinct from title, use it
  if (formatted && formatted.toLowerCase() !== title.toLowerCase()) {
    return formatted;
  }

  // Clean English fallback using resolved geographic components
  return `${categoryLabel} attraction located in ${locationSubtitle}.`;
}

/**
 * Normalizes a Geoapify Places Feature into the TripWise destination card format.
 * Accurately uses real API properties without fabricating synthetic ratings or fake costs.
 */
export function normalizeGeoapifyPlace(feature, fallbackLocation = {}) {
  const props = feature.properties || {};
  const categoryLabel = deriveCategoryLabel(props.categories || []);

  const title = resolveEnglishTitle(props, categoryLabel);
  const locationSubtitle = resolveLocationSubtitle(props, fallbackLocation);
  const description = resolveEnglishDescription(props, title, categoryLabel, locationSubtitle);
  const image = pickFallbackImage(categoryLabel);

  return {
    id: props.place_id || `geo-${Math.random().toString(36).substring(2, 9)}`,
    title,
    country: locationSubtitle,
    category: categoryLabel,
    // Do not fabricate fake star ratings. If API doesn't provide rating, mark as null
    rating: null,
    // Do not fabricate price tiers; display accurate category tag or "Attraction"
    estimatedCost: 'Attraction / Sight',
    description,
    image,
    localFallbackImage: getLocalFallbackImage(categoryLabel),
    coordinates: feature.geometry?.coordinates ? {
      lon: feature.geometry.coordinates[0],
      lat: feature.geometry.coordinates[1],
    } : null,
    attribution: props.datasource?.raw?.osm_id ? 'OpenStreetMap contributors' : 'Geoapify',
  };
}

/**
 * Builds the filter parameter for the Geoapify Places API.
 *
 * Priority:
 * 1. circle (lat/lon) — most specific and reliable across all result_types
 * 2. rect (bbox) — used if coordinates are unavailable but bbox is present
 *
 * NOTE: The `place:` filter was removed because it occasionally returns HTTP 400
 * for certain result_type values (e.g. suburb, region) even when the placeId is
 * syntactically valid. circle + bbox always succeed.
 */
function buildPlacesFilter(location) {
  if (location.lat && location.lon) {
    // For a city, 25 km radius covers the urban core well.
    // For a country-level result, use 100 km to capture more sights.
    const isCountry = location.resultType === 'country';
    const radiusMeters = isCountry ? 100000 : 25000;
    return `circle:${location.lon},${location.lat},${radiusMeters}`;
  }
  if (location.bbox) {
    const b = location.bbox;
    return `rect:${b.lon1},${b.lat1},${b.lon2},${b.lat2}`;
  }
  return null;
}

/**
 * Validates and returns a safe categories parameter string.
 * Falls back to DEFAULT_CATEGORIES if the categoryKey is empty or not in CATEGORY_MAP.
 * Guards against any injected commas or unexpected values.
 */
function resolveCategoriesParam(categoryKey) {
  if (!categoryKey || typeof categoryKey !== 'string') return DEFAULT_CATEGORIES;
  const trimmed = categoryKey.trim();
  if (!trimmed) return DEFAULT_CATEGORIES;
  return CATEGORY_MAP[trimmed] || DEFAULT_CATEGORIES;
}

/**
 * Queries places within a resolved city/location using Geoapify Places API.
 * Includes lang=en parameter where supported to request English-language results.
 * Endpoint: GET https://api.geoapify.com/v2/places
 */
export async function fetchPlaces({ location, categoryKey, apiKey, limit = 12 }) {
  const categoriesParam = resolveCategoriesParam(categoryKey);
  const filterParam = buildPlacesFilter(location);

  if (!filterParam) {
    // No usable filter — cannot make a valid Places request
    throw new Error('Could not determine a search area for this location. Please try a city name.');
  }

  const url = new URL('https://api.geoapify.com/v2/places');
  url.searchParams.set('categories', categoriesParam);
  url.searchParams.set('filter', filterParam);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('lang', 'en');
  url.searchParams.set('apiKey', apiKey);

  let res;
  try {
    res = await fetch(url.toString());
  } catch {
    throw new Error('Network error: Could not reach Geoapify Places service.');
  }

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid or restricted Geoapify API key. Check key settings.');
    }
    if (res.status === 429) {
      throw new Error('Geoapify rate limit reached. Please wait a moment or try again later.');
    }
    if (res.status === 400) {
      // Attempt to read the error body for diagnosing category issues in dev
      let detail = '';
      try { detail = await res.text(); } catch { /* ignore */ }
      // Log without exposing the key
      console.warn('[TripWise] Geoapify Places 400. filter:', filterParam, 'categories:', categoriesParam, 'detail:', detail);
      throw new Error('Could not load live destinations. The search parameters were rejected by the API. Please try a different search.');
    }
    throw new Error(`Could not load live destinations (HTTP ${res.status}). Please try again.`);
  }

  const data = await res.json();
  if (!data.features || !Array.isArray(data.features)) {
    return [];
  }

  return data.features.map(f => normalizeGeoapifyPlace(f, location));
}

/**
 * High-level search function combining geocoding and places fetching.
 */
export async function searchDestinations({ query = '', category = '', apiKey = '' }) {
  const trimmedQuery = query.trim();

  // If query is empty, default to a well-known city with lots of attractions
  const targetSearch = trimmedQuery || 'Paris';

  const location = await geocodeLocation(targetSearch, apiKey);
  if (!location) {
    return {
      destinations: [],
      resolvedCity: null,
      isEmpty: true,
    };
  }

  const places = await fetchPlaces({
    location,
    categoryKey: category,
    apiKey,
  });

  return {
    destinations: places,
    resolvedCity: location,
    isEmpty: places.length === 0,
  };
}
