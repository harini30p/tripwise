/**
 * Mapping of category keys to local SVG placeholders in /public.
 * These are guaranteed to exist locally and never fail or cause infinite error loops.
 */
export const LOCAL_CATEGORY_PLACEHOLDERS = {
  beach: '/placeholder-beach.svg',
  mountains: '/placeholder-nature.svg',
  adventure: '/placeholder-nature.svg',
  culturalheritage: '/placeholder-culture.svg',
  citybreaks: '/placeholder-city.svg',
  tourism: '/placeholder-generic.svg',
  default: '/placeholder-generic.svg',
};

/**
 * Returns a guaranteed local SVG placeholder path for a category.
 */
export function getLocalFallbackImage(categoryLabel = '') {
  const normalized = categoryLabel.toLowerCase().replace(/\s+/g, '');
  return LOCAL_CATEGORY_PLACEHOLDERS[normalized] || LOCAL_CATEGORY_PLACEHOLDERS.default;
}

/**
 * Safe image onError handler to prevent infinite loops and gracefully fallback to local SVG.
 * @param {SyntheticEvent} e - React image error event
 * @param {string} category - Category label
 */
export function handleImageFallbackError(e, category = '') {
  const target = e.currentTarget;
  const fallbackUrl = getLocalFallbackImage(category);

  // If already pointing to the local fallback or placeholder-generic, stop to avoid loop
  if (target.src.endsWith(fallbackUrl) || target.src.endsWith('/placeholder-generic.svg')) {
    return;
  }

  target.src = fallbackUrl;
}
