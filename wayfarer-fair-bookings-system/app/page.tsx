'use client';

import React, { useState, useMemo } from 'react';
import { MOCK_USERS, MOCK_PLACES, MockUser } from '@/data/mockData';
import { Header } from '@/components/Header';
import { PlaceList } from '@/components/PlaceList';
import { PlaceDetail } from '@/components/PlaceDetail';

export default function Home() {
  // 1. Active User state for the "Acting as" switcher
  const [activeUser, setActiveUser] = useState<MockUser>(MOCK_USERS[0]);

  // 2. Category filtering state
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // 3. Sorting placeholder state
  const [selectedSort, setSelectedSort] = useState<string>('top-rated');

  // 4. Selected place for the Detail View
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(MOCK_PLACES[0].id);

  // Filter places based on selected category pill
  const filteredPlaces = useMemo(() => {
    if (selectedCategory === 'All') return MOCK_PLACES;
    return MOCK_PLACES.filter((p) => p.category === selectedCategory);
  }, [selectedCategory]);

  // Active selected place object (falls back to first filtered place)
  const currentPlace = useMemo(() => {
    const found = filteredPlaces.find((p) => p.id === selectedPlaceId);
    return found || filteredPlaces[0] || MOCK_PLACES[0];
  }, [filteredPlaces, selectedPlaceId]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      {/* 1. Header with Logo, Category Pills, and Acting As Persona Switcher */}
      <Header
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        activeUser={activeUser}
        onSelectUser={setActiveUser}
      />

      {/* Main Dashboard Layout */}
      <main className="flex-1 w-full px-3 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 2. Place List View (Sidebar / Main List - Sticky on Desktop) */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm self-start">
            <PlaceList
              places={filteredPlaces}
              selectedPlaceId={currentPlace.id}
              onSelectPlace={(place) => setSelectedPlaceId(place.id)}
              selectedSort={selectedSort}
              onSelectSort={setSelectedSort}
            />
          </aside>

          {/* 3. Place Detail View */}
          <section className="lg:col-span-7">
            {currentPlace ? (
              <PlaceDetail place={currentPlace} activeUser={activeUser} />
            ) : (
              <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center text-zinc-400">
                Select a place to view its guide and tour slots.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
