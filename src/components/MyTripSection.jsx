import React from 'react';
import { handleImageFallbackError } from '../utils/imageFallbacks';
import './MyTripSection.css';

export default function MyTripSection({ tripItems, onRemoveTripItem, onExploreMore }) {
  const hasItems = tripItems && tripItems.length > 0;

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
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
