import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import DestinationGrid from './components/DestinationGrid';
import MyTripSection from './components/MyTripSection';
import DestinationDetailModal from './components/DestinationDetailModal';
import { INITIAL_DESTINATIONS } from './data/destinations';
import {
  hasGeoapifyKey,
  getGeoapifyApiKey,
  searchDestinations,
} from './services/geoapifyService';
import {
  getClientId,
  getStableItemId,
  sanitizeTripItem,
} from './utils/itineraryStorage';
import {
  fetchItinerary,
  saveDestination,
  removeDestination,
} from './services/itineraryApi';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'mytrip'

  // Separate states for text search and category filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  // Sorting state: 'default' | 'name-asc' | 'name-desc' | 'rating-desc'
  const [sortBy, setSortBy] = useState('default');

  // Dedicated Destination Details Modal state
  const [modalDestination, setModalDestination] = useState(null);

  // ── Itinerary state ────────────────────────────────────────────────────────
  // tripItems: the displayed list, always sourced from the server
  const [tripItems, setTripItems] = useState([]);
  // itineraryLoading: true while GET /api/itinerary is in flight
  const [itineraryLoading, setItineraryLoading] = useState(true);
  // itineraryError: message to show if the API is unreachable on startup
  const [itineraryError, setItineraryError] = useState(null);
  // actionError: transient error for a failed add/remove (not startup)
  const [actionError, setActionError] = useState(null);

  // Stable client ID for the API — generated once per browser, never changes
  const clientId = useMemo(() => getClientId(), []);

  // ── Destination / search state ────────────────────────────────────────────
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [resolvedCity, setResolvedCity] = useState(null);

  // ── Destination fetching (Geoapify / sample) ──────────────────────────────
  const switchToSampleData = useCallback(() => {
    setIsLive(false);
    setError(null);
    setResolvedCity(null);
    setDestinations(INITIAL_DESTINATIONS);
  }, []);

  const loadDestinations = useCallback(
    async (queryText, categoryFilter) => {
      if (!hasGeoapifyKey()) {
        switchToSampleData();
        return;
      }

      const apiKey = getGeoapifyApiKey();
      setIsLoading(true);
      setError(null);

      try {
        const result = await searchDestinations({
          query: queryText,
          category: categoryFilter,
          apiKey,
        });

        setDestinations(result.destinations);
        setResolvedCity(result.resolvedCity);
        setIsLive(true);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch destinations.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [switchToSampleData]
  );

  // Initial destination load
  useEffect(() => {
    loadDestinations('', '');
  }, [loadDestinations]);

  const handleSearchSubmit = () => {
    loadDestinations(searchQuery, selectedCategory);
  };

  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    loadDestinations(searchQuery, newCategory);
  };

  // Client-side filtering & sorting without mutating original arrays
  const displayedDestinations = useMemo(() => {
    let list;

    if (isLive) {
      list = [...destinations];
    } else {
      const q = searchQuery.trim().toLowerCase();
      const cat = selectedCategory.trim().toLowerCase();

      list = destinations.filter((item) => {
        const matchesQuery =
          !q ||
          item.title.toLowerCase().includes(q) ||
          item.country.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q);

        const matchesCat =
          !cat ||
          item.category.toLowerCase().includes(cat) ||
          (cat === 'city breaks' && item.category.toLowerCase().includes('city')) ||
          (cat === 'cultural heritage' &&
            item.category.toLowerCase().includes('cultural'));

        return matchesQuery && matchesCat;
      });
    }

    // Apply sorting to a shallow copy
    if (sortBy === 'name-asc') {
      return [...list].sort((a, b) =>
        (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' })
      );
    }

    if (sortBy === 'name-desc') {
      return [...list].sort((a, b) =>
        (b.title || '').localeCompare(a.title || '', undefined, { sensitivity: 'base' })
      );
    }

    if (sortBy === 'rating-desc') {
      return [...list].sort((a, b) => {
        const rA = typeof a.rating === 'number' && !isNaN(a.rating) ? a.rating : -1;
        const rB = typeof b.rating === 'number' && !isNaN(b.rating) ? b.rating : -1;

        // If both have ratings, higher rating comes first
        if (rA >= 0 && rB >= 0) return rB - rA;
        // Destinations with ratings come before unrated destinations
        if (rA >= 0) return -1;
        if (rB >= 0) return 1;
        // If neither has a rating, preserve alphabetical or original stability
        return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
      });
    }

    return list;
  }, [isLive, destinations, searchQuery, selectedCategory, sortBy]);

  // ── Itinerary: load from server on mount ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadItinerary() {
      setItineraryLoading(true);
      setItineraryError(null);
      try {
        const items = await fetchItinerary(clientId);
        if (!cancelled) setTripItems(items);
      } catch (err) {
        if (!cancelled) {
          setItineraryError(
            err instanceof Error
              ? err.message
              : 'Could not load your itinerary. Please try again.'
          );
          setTripItems([]); // show empty rather than crashing
        }
      } finally {
        if (!cancelled) setItineraryLoading(false);
      }
    }

    loadItinerary();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // ── Itinerary: add destination ─────────────────────────────────────────────
  const handleAddToTrip = useCallback(
    async (destination) => {
      const candidateId = getStableItemId(destination);

      // Prevent duplicate additions
      if (tripItems.some((item) => getStableItemId(item) === candidateId)) return;

      const preparedItem = sanitizeTripItem({ ...destination, id: candidateId });
      if (!preparedItem) return;

      // Optimistic update — add immediately so the UI feels fast
      setTripItems((prev) => [...prev, preparedItem]);
      setActionError(null);

      try {
        const saved = await saveDestination(clientId, preparedItem);
        // Replace optimistic item with server-confirmed version if IDs match
        setTripItems((prev) =>
          prev.map((item) =>
            getStableItemId(item) === candidateId ? { ...preparedItem, ...saved } : item
          )
        );
      } catch (err) {
        // Roll back the optimistic addition
        setTripItems((prev) =>
          prev.filter((item) => getStableItemId(item) !== candidateId)
        );
        setActionError(
          err instanceof Error ? err.message : 'Failed to save destination. Please try again.'
        );
      }
    },
    [tripItems, clientId]
  );

  // ── Itinerary: remove destination ─────────────────────────────────────────
  const handleRemoveTripItem = useCallback(
    async (destinationId) => {
      // Snapshot the item before removing for potential rollback
      const removed = tripItems.find((item) => getStableItemId(item) === destinationId);
      if (!removed) return;

      // Optimistic remove
      setTripItems((prev) =>
        prev.filter((item) => getStableItemId(item) !== destinationId)
      );
      setActionError(null);

      try {
        await removeDestination(clientId, destinationId);
      } catch (err) {
        // Rollback: put the item back
        setTripItems((prev) => {
          const ids = new Set(prev.map((i) => getStableItemId(i)));
          return ids.has(getStableItemId(removed)) ? prev : [...prev, removed];
        });
        setActionError(
          err instanceof Error ? err.message : 'Failed to remove destination. Please try again.'
        );
      }
    },
    [tripItems, clientId]
  );

  return (
    <div className="app-layout">
      {/* Top Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        tripCount={tripItems.length}
      />

      <main className="main-content">
        {activeTab === 'explore' ? (
          <>
            <HeroSection
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              onSubmitSearch={handleSearchSubmit}
            />

            {/* Transient action error banner (add/remove failures) */}
            {actionError && (
              <div className="container">
                <div className="action-error-banner" role="alert">
                  <span>⚠️ {actionError}</span>
                  <button
                    type="button"
                    className="action-error-dismiss"
                    onClick={() => setActionError(null)}
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <DestinationGrid
              destinations={displayedDestinations}
              onSelectDestination={handleAddToTrip}
              onViewDetails={(item) => setModalDestination(item)}
              tripItemIds={tripItems.map((item) => getStableItemId(item))}
              isLoading={isLoading}
              error={error}
              onRetry={() => loadDestinations(searchQuery, selectedCategory)}
              onUseSampleData={switchToSampleData}
              isLive={isLive}
              resolvedCity={resolvedCity}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          </>
        ) : (
          <MyTripSection
            tripItems={tripItems}
            onRemoveTripItem={handleRemoveTripItem}
            onExploreMore={() => setActiveTab('explore')}
            onViewDetails={(item) => setModalDestination(item)}
            isLoading={itineraryLoading}
            error={itineraryError}
            onRetryLoad={() => {
              setItineraryError(null);
              setItineraryLoading(true);
              fetchItinerary(clientId)
                .then(setTripItems)
                .catch((err) =>
                  setItineraryError(
                    err instanceof Error ? err.message : 'Could not load your itinerary.'
                  )
                )
                .finally(() => setItineraryLoading(false));
            }}
            actionError={actionError}
            onDismissActionError={() => setActionError(null)}
          />
        )}
      </main>

      {/* Dedicated Destination Details Modal View */}
      <DestinationDetailModal
        destination={modalDestination}
        isOpen={Boolean(modalDestination)}
        onClose={() => setModalDestination(null)}
        onToggleTrip={handleAddToTrip}
        isInTrip={
          modalDestination
            ? tripItems.some(
                (item) => getStableItemId(item) === getStableItemId(modalDestination)
              )
            : false
        }
      />

      {/* Footer */}
      <footer className="app-footer">
        <div className="container footer-container">
          <p>© {new Date().getFullYear()} TripWise. Built for AWS Student Builder Group Web Development.</p>
          <div className="footer-links">
            <span>Powered by Geoapify &amp; OpenStreetMap</span>
            <span>•</span>
            <span>Track 1: Frontend Development</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
