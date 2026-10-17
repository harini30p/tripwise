import React from 'react';
import { handleImageFallbackError } from '../utils/imageFallbacks';
import './DestinationGrid.css';

export default function DestinationGrid({
  destinations,
  onSelectDestination,
  onViewDetails = null,
  tripItemIds = [],
  isLoading = false,
  error = null,
  onRetry = null,
  onUseSampleData = null,
  isLive = false,
  resolvedCity = null,
  sortBy = 'default',
  onSortChange = null,
}) {
  return (
    <section className="destinations-section">
      <div className="container">
        {/* Header with Title and Mode Indicator */}
        <div className="section-header">
          <div>
            <div className="section-header-top">
              <h2 className="section-title">
                {resolvedCity ? `Destinations in ${resolvedCity.city || resolvedCity.country}` : 'Featured Destinations'}
              </h2>
              {/* Honest Data Source Badges */}
              {isLive ? (
                <span className="source-badge live" title="Live Geoapify Places & OpenStreetMap data">
                  <span className="pulse-indicator live"></span> Live Geoapify Data
                </span>
              ) : (
                <span className="source-badge fallback" title="Curated offline fallback data">
                  <span className="pulse-indicator fallback"></span> Sample Fallback Mode
                </span>
              )}
            </div>
            <p className="section-subtitle">
              {isLive
                ? `Real-time tourist attractions sourced via Geoapify & OpenStreetMap contributors`
                : `Showing curated destinations. Add a valid VITE_GEOAPIFY_API_KEY to search live cities.`}
            </p>
          </div>

          <div className="header-meta-group">
            {/* Sorting Controls */}
            {onSortChange && (
              <div className="sort-control-wrapper">
                <label htmlFor="destination-sort-select" className="sort-label">
                  Sort:
                </label>
                <select
                  id="destination-sort-select"
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                  aria-label="Sort destinations"
                >
                  <option value="default">Default</option>
                  <option value="name-asc">Name (A–Z)</option>
                  <option value="name-desc">Name (Z–A)</option>
                  <option value="rating-desc">Rating (High to Low)</option>
                </select>
              </div>
            )}

            {!isLoading && (
              <div className="results-count">
                <span>{destinations.length} places available</span>
              </div>
            )}
            {/* Optional switch to Sample Data if currently in live mode */}
            {isLive && onUseSampleData && (
              <button
                type="button"
                className="btn-switch-sample"
                onClick={onUseSampleData}
                title="Switch back to curated sample destinations"
              >
                View Sample Data
              </button>
            )}
          </div>
        </div>

        {/* Error Banner with Retry */}
        {error && (
          <div className="api-error-card">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <h4 className="error-title">Could not load live destinations</h4>
              <p className="error-message">{error}</p>
            </div>
            <div className="error-actions">
              {onRetry && (
                <button type="button" className="btn-retry" onClick={onRetry}>
                  Retry
                </button>
              )}
              {onUseSampleData && (
                <button type="button" className="btn-use-sample" onClick={onUseSampleData}>
                  Use Sample Data
                </button>
              )}
            </div>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="destination-cards-grid">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="destination-card skeleton-card">
                <div className="skeleton-image"></div>
                <div className="skeleton-content">
                  <div className="skeleton-line line-small"></div>
                  <div className="skeleton-line line-title"></div>
                  <div className="skeleton-line line-desc"></div>
                  <div className="skeleton-line line-desc-short"></div>
                  <div className="skeleton-footer"></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && destinations.length === 0 && !error && (
          <div className="no-results-card">
            <div className="no-results-icon">🔍</div>
            <h3>No destinations found</h3>
            <p>
              We couldn't find points of interest matching your search. Try searching for a major city 
              (e.g., Paris, Tokyo, Rome, New York) or clearing your category filter.
            </p>
            {onUseSampleData && (
              <button type="button" className="btn-reset-explore" onClick={onUseSampleData}>
                Load Sample Destinations
              </button>
            )}
          </div>
        )}

        {/* Live / Fallback Cards Grid */}
        {!isLoading && destinations.length > 0 && (
          <div className="destination-cards-grid">
            {destinations.map((item) => (
              <article key={item.id} className="destination-card">
                <div className="card-image-wrapper">
                  <img
                    src={item.image}
                    alt={`${item.title} - ${item.category} in ${item.country || 'destination'}`}
                    className="card-image"
                    loading="lazy"
                    onError={(e) => handleImageFallbackError(e, item.category)}
                  />
                  <div className="card-tag">{item.category}</div>
                  {/* Factual display: show rating if provided, else neutral verified place tag */}
                  {item.rating ? (
                    <div className="card-rating">
                      <span>★</span> {item.rating}
                    </div>
                  ) : (
                    <div className="card-verified-tag">
                      <span>📍</span> POI
                    </div>
                  )}
                </div>

                <div className="card-content">
                  <div className="card-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{item.country || 'Region'}</span>
                  </div>

                  <h3 className="card-title">{item.title}</h3>
                  <p className="card-description">{item.description}</p>

                  <div className="card-footer">
                    <div className="card-budget">
                      <span className="budget-label">Category / Type</span>
                      <span className="budget-value">{item.estimatedCost || 'Attraction'}</span>
                    </div>
                    <div className="card-actions-group">
                      {onViewDetails && (
                        <button
                          type="button"
                          className="card-details-btn"
                          onClick={() => onViewDetails(item)}
                          title="View destination details and map"
                        >
                          View Details
                        </button>
                      )}
                      <button
                        type="button"
                        className={`card-add-btn ${tripItemIds?.includes(item.id) ? 'added' : ''}`}
                        onClick={() => onSelectDestination(item)}
                        title={tripItemIds?.includes(item.id) ? 'Already added to your trip' : 'Add to trip'}
                      >
                        {tripItemIds?.includes(item.id) ? '✓ Added' : '+ Add to Trip'}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Data Attribution Footer Note */}
        <div className="attribution-note">
          <span>Map &amp; Place Data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></span>
          <span>•</span>
          <span>Geocoding &amp; Places powered by <a href="https://www.geoapify.com" target="_blank" rel="noopener noreferrer">Geoapify</a></span>
        </div>
      </div>
    </section>
  );
}
