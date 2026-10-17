import React from 'react';
import { handleImageFallbackError } from '../utils/imageFallbacks';
import './MyTripSection.css';

/**
 * MyTripSection
 *
 * Displays the user's saved itinerary, sourced from the PostgreSQL backend.
 *
 * Props:
 *   tripItems          – array of saved destination objects
 *   onRemoveTripItem   – called with a destination id to remove it
 *   onExploreMore      – navigates back to the Explore tab
 *   isLoading          – true while the initial API load is in flight
 *   error              – startup error message (API unreachable at load time)
 *   onRetryLoad        – retries the initial GET /api/itinerary call
 *   actionError        – transient error from a failed add/remove operation
 *   onDismissActionError – clears the action error banner
 */
export default function MyTripSection({
  tripItems,
  onRemoveTripItem,
  onExploreMore,
  onViewDetails = null,
  isLoading,
  error,
  onRetryLoad,
  actionError,
  onDismissActionError,
}) {
  const hasItems = tripItems && tripItems.length > 0;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <section className="mytrip-section">
        <div className="container">
          <div className="mytrip-header">
            <div>
              <div className="mytrip-badge">Itinerary Workspace</div>
              <h2 className="mytrip-title">My Trip Plan</h2>
              <p className="mytrip-subtitle">Loading your saved destinations…</p>
            </div>
          </div>
          <div className="trip-items-list">
            {[1, 2, 3].map((n) => (
              <div key={n} className="trip-item-card trip-item-skeleton" aria-hidden="true">
                <span className="step-number skeleton-block" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                <div className="skeleton-thumb" />
                <div className="trip-item-info">
                  <div className="skeleton-block" style={{ width: '40%', height: 14, marginBottom: 8 }} />
                  <div className="skeleton-block" style={{ width: '70%', height: 18, marginBottom: 8 }} />
                  <div className="skeleton-block" style={{ width: '90%', height: 13 }} />
                </div>
                <div className="trip-item-meta">
                  <div className="skeleton-block" style={{ width: 80, height: 22 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // ── Startup API error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <section className="mytrip-section">
        <div className="container">
          <div className="mytrip-header">
            <div>
              <div className="mytrip-badge">Itinerary Workspace</div>
              <h2 className="mytrip-title">My Trip Plan</h2>
            </div>
          </div>
          <div className="mytrip-api-error" role="alert">
            <p className="error-heading">⚠️ Could not load your itinerary</p>
            <p className="error-body">{error}</p>
            <div className="error-actions">
              <button type="button" className="btn-retry" onClick={onRetryLoad}>
                Retry
              </button>
              <button type="button" className="btn-explore-more" onClick={onExploreMore}>
                Explore Destinations
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Normal render ─────────────────────────────────────────────────────────
  return (
    <section className="mytrip-section">
      <div className="container">
        <div className="mytrip-header">
          <div>
            <div className="mytrip-badge">Itinerary Workspace</div>
            <h2 className="mytrip-title">My Trip Plan</h2>
            <p className="mytrip-subtitle">Review, adjust, and organize your saved destinations</p>
          </div>
          {hasItems && (
            <button type="button" className="btn-explore-more" onClick={onExploreMore}>
              + Add More Places
            </button>
          )}
        </div>

        {/* Transient action error (add/remove failure) */}
        {actionError && (
          <div className="action-error-banner" role="alert">
            <span>⚠️ {actionError}</span>
            <button
              type="button"
              className="action-error-dismiss"
              onClick={onDismissActionError}
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        )}

        {!hasItems ? (
          <div className="empty-trip-card">
            <div className="empty-trip-illustration">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </div>
            <h3 className="empty-title">Your itinerary is empty</h3>
            <p className="empty-desc">
              You haven't added any destinations to your trip yet. Head over to the Explore section
              to browse breathtaking spots and curate your dream route!
            </p>
            <button type="button" className="btn-start-exploring" onClick={onExploreMore}>
              Browse Destinations
            </button>
          </div>
        ) : (
          <div className="trip-items-list">
            {tripItems.map((item, index) => (
              <div key={item.id} className="trip-item-card">
                <span className="step-number">{index + 1}</span>
                <img
                  src={item.image}
                  alt={`${item.title} - ${item.category}`}
                  className="trip-item-thumb"
                  onError={(e) => handleImageFallbackError(e, item.category)}
                />
                <div className="trip-item-info">
                  <span className="trip-item-country">{item.country}</span>
                  <h4 className="trip-item-title">{item.title}</h4>
                  <p className="trip-item-snippet">{item.description}</p>
                </div>
                <div className="trip-item-meta">
                  <span className="trip-item-budget">{item.estimatedCost}</span>
                  <div className="trip-item-actions">
                    {onViewDetails && (
                      <button
                        type="button"
                        className="btn-item-details"
                        onClick={() => onViewDetails(item)}
                        title="View destination details and map"
                      >
                        Details
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-remove-item"
                      onClick={() => onRemoveTripItem(item.id)}
                      title="Remove destination"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
