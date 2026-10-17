import React from 'react';
import './HeroSection.css';

export default function HeroSection({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  onSubmitSearch,
}) {
  const categories = ['Beach', 'Mountains', 'City Breaks', 'Cultural Heritage', 'Adventure'];

  return (
    <section className="hero-section">
      <div className="container hero-container">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          <span>Next-Gen Travel Planning</span>
        </div>

        <h1 className="hero-title">
          Plan trips effortlessly, explore <span className="highlight-text">smarter</span>
        </h1>

        <p className="hero-subtitle">
          Your personal travel assistant. Discover scenic getaways, assemble custom itineraries, 
          and organize everything you love in one unified dashboard.
        </p>

        {/* Destination Search Bar */}
        <form
          className="search-bar-card"
          onSubmit={(e) => {
            e.preventDefault();
            if (onSubmitSearch) {
              onSubmitSearch();
            }
            const gridEl = document.querySelector('.destinations-section');
            if (gridEl) {
              gridEl.scrollIntoView({ behavior: 'smooth' });
            }
          }}
        >
          <div className="search-input-group">
            <span className="search-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              id="destination-search-input"
              className="search-input"
              placeholder="Search a city or region (e.g. Rome, Tokyo, New York, Zurich)"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          <button type="submit" className="search-submit-btn" id="search-destinations-btn">
            Explore
          </button>
        </form>

        {/* Quick filters/tags: separate state from search query */}
        <div className="quick-tags">
          <span className="tag-label">Filter by Category:</span>
          {categories.map((cat) => {
            const isCatActive = selectedCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                className={`tag-pill ${isCatActive ? 'active' : ''}`}
                onClick={() => onCategoryChange(isCatActive ? '' : cat)}
              >
                {cat}
              </button>
            );
          })}
          {selectedCategory && (
            <button
              type="button"
              className="tag-clear-pill"
              onClick={() => onCategoryChange('')}
              title="Clear category filter"
            >
              Clear Filter ✕
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
