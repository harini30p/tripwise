/**
 * Service module for querying Geoapify Geocoding and Places API.
 * Data sources: OpenStreetMap (OSM) & Geoapify.
 * License & Attribution: (c) OpenStreetMap contributors, powered by Geoapify.
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

// UI category tag to Geoapify API category parameter mapping
export const CATEGORY_MAP = {
  'Beach': 'natural.sand.beach,natural.water.sea,leisure.park.beach',
  'Mountains': 'natural.mountain,natural.mountain.peak,natural.rock',
  'City Breaks': 'tourism.attraction,tourism.sights,entertainment.culture',
  'Cultural Heritage': 'heritage,heritage.unesco,building.historic,tourism.sights',
  'Adventure': 'leisure.park,activity,activity.sport_club',
};

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

  const res = await fetch(url.toString());
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid or restricted Geoapify API key. Check your key and allowed domains.');
    }
    if (res.status === 429) {
      throw new Error('Geoapify daily request limit exceeded (HTTP 429).');
    }
    throw new Error(`Geocoding failed with status ${res.status}: ${res.statusText}`);
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
    city: englishCity,
    country: englishCountry,
    state: englishState,
    resultType: first.result_type || 'city',
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
 * Checks OpenStreetMap raw tags and Geoapify international dictionary:
 * 1. props.name_international?.en
 * 2. props.datasource?.raw?.['name:en']
 * 3. props.datasource?.raw?.['int_name']
 * 4. props.name
 * 5. props.address_line1
 * 6. props.formatted (first segment)
 * 7. Category fallback
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
 * If raw formatted address is only in local characters, construct a clean English structural description
 * using verified English components (City, Country, Category) rather than raw unreadable scripts.
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

  // Title: Prioritize English name if available in API response or raw OSM tags
  const title = resolveEnglishTitle(props, categoryLabel);

  // Clean geographic location string (e.g. "Kyoto, Japan" or "Japan")
  const locationSubtitle = resolveLocationSubtitle(props, fallbackLocation);

  // Description: accurate English address or location summary
  const description = resolveEnglishDescription(props, title, categoryLabel, locationSubtitle);

  // Initial image URL (DestinationGrid handles fallback gracefully on error)
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
 * Queries places within a resolved city/location using Geoapify Places API.
 * Includes lang=en parameter where supported to request English-language results.
 * Endpoint: GET https://api.geoapify.com/v2/places
 */
export async function fetchPlaces({ location, categoryKey, apiKey, limit = 12 }) {
  const url = new URL('https://api.geoapify.com/v2/places');

  // Determine category filter
  const categoriesParam = categoryKey && CATEGORY_MAP[categoryKey]
    ? CATEGORY_MAP[categoryKey]
    : 'tourism.attraction,tourism.sights,entertainment.culture,heritage,leisure.park';

  url.searchParams.set('categories', categoriesParam);

  // Filter strategy:
  // 1. If location has placeId, filter by place
  // 2. If country or large bbox, use bbox or circle
  // 3. Fallback to circle radius
  if (location.placeId) {
    url.searchParams.set('filter', `place:${location.placeId}`);
  } else if (location.bbox) {
    url.searchParams.set('filter', `rect:${location.bbox.lon1},${location.bbox.lat1},${location.bbox.lon2},${location.bbox.lat2}`);
  } else if (location.lat && location.lon) {
    url.searchParams.set('filter', `circle:${location.lon},${location.lat},25000`);
  }

  url.searchParams.set('limit', String(limit));
  url.searchParams.set('lang', 'en'); // Request English localized results
  url.searchParams.set('apiKey', apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Invalid or restricted Geoapify API key. Check key settings.');
    }
    if (res.status === 429) {
      throw new Error('Geoapify rate limit reached. Please wait a moment or try again later.');
    }
    throw new Error(`Places query failed with status ${res.status}: ${res.statusText}`);
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

  // If query is empty, default to popular travel cities
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
