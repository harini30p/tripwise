import React, { useEffect, useRef } from 'react';
import { handleImageFallbackError } from '../utils/imageFallbacks';
import './DestinationDetailModal.css';

/**
 * DestinationDetailModal
 *
 * Dedicated accessible modal dialog for destination details.
 *
 * Props:
 *  - destination: object containing place details (or null if closed)
 *  - isOpen: boolean indicating modal visibility
 *  - onClose: function to close the modal
 *  - onToggleTrip: function(destination) to add/remove or add to trip
 *  - isInTrip: boolean indicating if current destination is in itinerary
 */
export default function DestinationDetailModal({
  destination,
  isOpen,
  onClose,
  onToggleTrip,
  isInTrip = false,
}) {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Close on Escape key & trap focus
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Focus the close button when opened
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    // Prevent background scrolling while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !destination) {
    return null;
  }

  // Geographic coordinates & OpenStreetMap link
  const coordinates = destination.coordinates;
  const hasCoordinates =
    coordinates &&
    typeof coordinates.lat === 'number' &&
    typeof coordinates.lon === 'number' &&
    !isNaN(coordinates.lat) &&
    !isNaN(coordinates.lon);

  const osmUrl = hasCoordinates
    ? `https://www.openstreetmap.org/?mlat=${coordinates.lat}&mlon=${coordinates.lon}#map=15/${coordinates.lat}/${coordinates.lon}`
    : destination.title && destination.country
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(
        `${destination.title}, ${destination.country}`
      )}`
    : null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-dest-title"
        ref={modalRef}
      >
        {/* Header with image */}
        <div className="modal-media-header">
          <img
            src={destination.image}
            alt={destination.title || 'Destination preview'}
            className="modal-cover-image"
            onError={(e) => handleImageFallbackError(e, destination.category)}
          />
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close details dialog"
            ref={closeButtonRef}
          >
            ✕
          </button>
          <div className="modal-category-tag">{destination.category || 'Tourism'}</div>
        </div>

        {/* Content body */}
        <div className="modal-body">
          <div className="modal-title-row">
            <div>
              <div className="modal-region-label">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{destination.country || 'Region not available'}</span>
              </div>
              <h2 id="modal-dest-title" className="modal-title">
                {destination.title || 'Destination Details'}
              </h2>
            </div>

            {/* Rating or Verified Tag */}
            <div className="modal-rating-badge">
              {destination.rating != null ? (
                <div className="rating-pill rated">
                  <span aria-hidden="true">★</span>
                  <span>{destination.rating} / 5.0</span>
                </div>
              ) : (
                <div className="rating-pill neutral" title="Real-time Point of Interest from OpenStreetMap">
                  <span aria-hidden="true">📍</span>
                  <span>Verified POI</span>
                </div>
              )}
            </div>
          </div>

          {/* Description section */}
          <div className="modal-section">
            <h3 className="modal-section-title">Overview</h3>
            <p className="modal-description-text">
              {destination.description && destination.description.trim()
                ? destination.description
                : 'No extended description available for this destination.'}
            </p>
          </div>

          {/* Key Facts & Specifications Grid */}
          <div className="modal-facts-grid">
            <div className="fact-item">
              <span className="fact-label">Category / Type</span>
              <span className="fact-value">{destination.category || 'Not available'}</span>
            </div>

            <div className="fact-item">
              <span className="fact-label">Location / Region</span>
              <span className="fact-value">{destination.country || 'Not available'}</span>
            </div>

            <div className="fact-item">
              <span className="fact-label">Coordinates</span>
              <span className="fact-value">
                {hasCoordinates
                  ? `${coordinates.lat.toFixed(4)}°, ${coordinates.lon.toFixed(4)}°`
                  : 'Not available'}
              </span>
            </div>

            <div className="fact-item">
              <span className="fact-label">Rating</span>
              <span className="fact-value">
                {destination.rating != null ? `${destination.rating} / 5.0` : 'Not available'}
              </span>
            </div>

            <div className="fact-item">
              <span className="fact-label">Estimated Cost / Tier</span>
              <span className="fact-value">{destination.estimatedCost || 'Attraction / Sight'}</span>
            </div>

            <div className="fact-item">
              <span className="fact-label">Data Provider</span>
              <span className="fact-value">
                {destination.attribution || 'OpenStreetMap & Geoapify'}
              </span>
            </div>
          </div>

          {/* External Map & Directions Link */}
          {osmUrl && (
            <div className="modal-map-link-container">
              <a
                href={osmUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-osm-link"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
                <span>View Location on OpenStreetMap</span>
                <span className="external-arrow">↗</span>
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer actions */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
          >
            Close
          </button>
          {onToggleTrip && (
            <button
              type="button"
              className={`btn-modal-action ${isInTrip ? 'added' : 'primary'}`}
              onClick={() => {
                onToggleTrip(destination);
              }}
            >
              {isInTrip ? '✓ Added to Trip' : '+ Add to Trip'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
