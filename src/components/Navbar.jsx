import React from 'react';
import './Navbar.css';

export default function Navbar({ activeTab, onTabChange, tripCount = 0 }) {
  return (
    <header className="navbar-wrapper">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <div className="brand" onClick={() => onTabChange('explore')}>
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="brand-text">
            <span>Trip<span className="brand-highlight">Wise</span></span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="nav-links">
          <button
            type="button"
            className={`nav-item ${activeTab === 'explore' ? 'active' : ''}`}
            onClick={() => onTabChange('explore')}
          >
            Explore
          </button>
          <button
            type="button"
            className={`nav-item ${activeTab === 'mytrip' ? 'active' : ''}`}
            onClick={() => onTabChange('mytrip')}
          >
            <span>My Trip</span>
            <span className="nav-badge">{tripCount}</span>
          </button>
        </nav>

        {/* Action Button */}
        <div className="nav-actions">
          <button
            type="button"
            className="btn-plan-now"
            onClick={() => onTabChange('explore')}
          >
            Plan a Trip
          </button>
        </div>
      </div>
    </header>
  );
}
