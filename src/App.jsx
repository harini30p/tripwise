import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import DestinationGrid from './components/DestinationGrid';
import MyTripSection from './components/MyTripSection';
import { INITIAL_DESTINATIONS } from './data/destinations';
import {
  hasGeoapifyKey,
  getGeoapifyApiKey,
  searchDestinations,
} from './services/geoapifyService';
import {
  loadSavedItinerary,
  saveItinerary,
  getStableItemId,
} from './utils/itineraryStorage';
import './App.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('explore'); // 'explore' | 'mytrip'

  // Separate states for text search and category filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Itinerary state initialized directly from localStorage
  const [tripItems, setTripItems] = useState(() => loadSavedItinerary());

  // Data fetching states
  const [destinations, setDestinations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [resolvedCity, setResolvedCity] = useState(null);

  // Fallback to sample data function
  const switchToSampleData = useCallback(() => {
    setIsLive(false);
    setError(null);
    setResolvedCity(null);
    setDestinations(INITIAL_DESTINATIONS);
  }, []);

  // Fetch destinations from Geoapify or fall back cleanly
  const loadDestinations = useCallback(
    async (queryText, categoryFilter) => {
      // If no valid API key is present, fallback gracefully to initial sample data
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
        // Safe error presentation without exposing keys or crashing
        const message = err instanceof Error ? err.message : 'Failed to fetch destinations.';
        setError(message);
        // Do not overwrite previous destinations immediately so user can retry or switch to sample
      } finally {
        setIsLoading(false);
      }
    },
    [switchToSampleData]
  );

  // Initial load: fetch default destinations (or sample data if no key)
  useEffect(() => {
    loadDestinations('', '');
  }, [loadDestinations]);

  // Handle live search submission (pressing Enter or clicking Explore in Hero)
  const handleSearchSubmit = () => {
    loadDestinations(searchQuery, selectedCategory);
  };

  // Handle category pill clicks (independent filter state)
  const handleCategoryChange = (newCategory) => {
    setSelectedCategory(newCategory);
    // Trigger destination fetch with the new category
    loadDestinations(searchQuery, newCategory);
  };

  // When in fallback sample mode, perform client-side filtering
  const displayedDestinations = useMemo(() => {
    if (isLive) {
      // In live mode, destinations are already fetched with server filters
      return destinations;
    }
    // In sample mode, apply client-side text and category filtering
    const q = searchQuery.trim().toLowerCase();
    const cat = selectedCategory.trim().toLowerCase();

    return destinations.filter((item) => {
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.country.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);

      const matchesCat =
        !cat ||
        item.category.toLowerCase().includes(cat) ||
        (cat === 'city breaks' && item.category.toLowerCase().includes('city')) ||
        (cat === 'cultural heritage' && item.category.toLowerCase().includes('cultural'));

      return matchesQuery && matchesCat;
    });
  }, [isLive, destinations, searchQuery, selectedCategory]);

  // Persist itinerary to localStorage whenever tripItems change
  useEffect(() => {
    saveItinerary(tripItems);
  }, [tripItems]);

  // Handler to add a destination to the user's trip with duplicate prevention
  const handleAddToTrip = (destination) => {
    const candidateId = getStableItemId(destination);
    if (!tripItems.some((item) => getStableItemId(item) === candidateId)) {
      const preparedItem = {
        ...destination,
        id: candidateId,
      };
      setTripItems((prev) => [...prev, preparedItem]);
    }
  };

  // Handler to remove a destination from the user's trip
  const handleRemoveTripItem = (destinationId) => {
    setTripItems((prev) => prev.filter((item) => getStableItemId(item) !== destinationId));
  };

  return (
    <div className="app-layout">
      {/* Top Navigation Bar with active tab state & badge counter */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        tripCount={tripItems.length}
      />

      <main className="main-content">
        {activeTab === 'explore' ? (
          <>
            {/* Welcoming Hero section with separate search and category filter state */}
            <HeroSection
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              onSubmitSearch={handleSearchSubmit}
            />

            {/* Destination Grid with skeletons, error banner, live/fallback badges */}
            <DestinationGrid
              destinations={displayedDestinations}
              onSelectDestination={handleAddToTrip}
              tripItemIds={tripItems.map((item) => item.id)}
              isLoading={isLoading}
              error={error}
              onRetry={() => loadDestinations(searchQuery, selectedCategory)}
              onUseSampleData={switchToSampleData}
              isLive={isLive}
              resolvedCity={resolvedCity}
            />
          </>
        ) : (
          /* "My Trip" section for itinerary management */
          <MyTripSection
            tripItems={tripItems}
            onRemoveTripItem={handleRemoveTripItem}
            onExploreMore={() => setActiveTab('explore')}
          />
        )}
      </main>

      {/* Clean Footer */}
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
