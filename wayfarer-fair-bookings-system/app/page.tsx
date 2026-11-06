'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Place,
  fetchUsers,
  fetchPlaces,
  fetchPlaceById,
} from '@/services/api';
import { Header } from '@/components/Header';
import { PlaceList } from '@/components/PlaceList';
import { PlaceDetail } from '@/components/PlaceDetail';

export default function Home() {
  // 1. Users state from backend GET /api/users
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  // 2. Category & Sort filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSort, setSelectedSort] = useState<string>('top_rated');

  // 3. Places list from backend GET /api/places
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<number | null>(null);

  // 4. Detailed place data (with reviews & tour slots) from GET /api/places/:id
  const [placeDetail, setPlaceDetail] = useState<Place | null>(null);

  // 5. Loading and Error states
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(true);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState<boolean>(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load users once on mount
  useEffect(() => {
    let isMounted = true;
    async function loadUsers() {
      setIsLoadingUsers(true);
      try {
        const fetchedUsers = await fetchUsers();
        if (isMounted) {
          setUsers(fetchedUsers);
          if (fetchedUsers.length > 0) {
            setActiveUser(fetchedUsers[0]);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to load users:', err);
        if (isMounted) {
          setApiError(
            'Unable to connect to the backend server. Please verify it is running on port 5000.'
          );
        }
      } finally {
        if (isMounted) setIsLoadingUsers(false);
      }
    }
    loadUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load places whenever category or sort changes
  const loadPlaces = useCallback(async () => {
    setIsLoadingPlaces(true);
    setApiError(null);
    try {
      const fetchedPlaces = await fetchPlaces(selectedCategory, selectedSort);
      setPlaces(fetchedPlaces);

      // If no place is currently selected or current selection is not in list, select first place
      if (fetchedPlaces.length > 0) {
        setSelectedPlaceId((prevId) => {
          const exists = fetchedPlaces.some((p) => p.id === prevId);
          return exists ? prevId : fetchedPlaces[0].id;
        });
      } else {
        setSelectedPlaceId(null);
        setPlaceDetail(null);
      }
    } catch (err: unknown) {
      console.error('Failed to load places:', err);
      setApiError(
        'Unable to load places from the database. Please ensure backend is running.'
      );
    } finally {
      setIsLoadingPlaces(false);
    }
  }, [selectedCategory, selectedSort]);

  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

  // Load single place details (reviews & tour slots) whenever selectedPlaceId changes
  useEffect(() => {
    if (!selectedPlaceId) return;

    let isMounted = true;
    async function loadDetail() {
      setIsLoadingDetail(true);
      try {
        const detail = await fetchPlaceById(selectedPlaceId as number);
        if (isMounted) {
          setPlaceDetail(detail);
        }
      } catch (err: unknown) {
        console.error(`Failed to load details for place #${selectedPlaceId}:`, err);
      } finally {
        if (isMounted) setIsLoadingDetail(false);
      }
    }

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [selectedPlaceId]);

  // Refresh current place details after mutations like booking
  const refreshCurrentPlace = useCallback(async () => {
    if (!selectedPlaceId) return;
    try {
      const detail = await fetchPlaceById(selectedPlaceId);
      setPlaceDetail(detail);
    } catch (err: unknown) {
      console.error('Failed to refresh place details:', err);
    }
  }, [selectedPlaceId]);

  // Refresh both place details and global ranking after review submission
  const handleReviewSuccess = useCallback(async () => {
    await refreshCurrentPlace();
    await loadPlaces();
  }, [refreshCurrentPlace, loadPlaces]);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      {/* 1. Header with Brand, Category Pills, and Acting As Persona Switcher */}
      <Header
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        users={users}
        activeUser={activeUser}
        onSelectUser={setActiveUser}
      />

      {/* Backend connection banner if error occurs */}
      {apiError && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-3 text-xs font-semibold text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{apiError}</span>
          </div>
          <button
            onClick={() => loadPlaces()}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-medium transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Dashboard Layout */}
      <main className="flex-1 w-full px-3 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* 2. Place List View (Sidebar / Main List - Sticky on Desktop) */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-white p-5 rounded-3xl border border-zinc-200 shadow-sm self-start">
            <PlaceList
              places={places}
              selectedPlaceId={selectedPlaceId}
              onSelectPlace={(place) => setSelectedPlaceId(place.id)}
              selectedSort={selectedSort}
              onSelectSort={setSelectedSort}
              isLoading={isLoadingPlaces}
            />
          </aside>

          {/* 3. Place Detail View */}
          <section className="lg:col-span-7">
            {placeDetail ? (
              <PlaceDetail
                place={placeDetail}
                activeUser={activeUser}
                isLoading={isLoadingDetail}
                onBookingSuccess={refreshCurrentPlace}
                onReviewSuccess={handleReviewSuccess}
              />
            ) : isLoadingPlaces ? (
              <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center text-zinc-400 animate-pulse">
                Loading place details...
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center text-zinc-400">
                Select a place from the list to view its guide and tour slots.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
