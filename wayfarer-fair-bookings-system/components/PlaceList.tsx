import React from 'react';
import { Place } from '@/data/mockData';
import { PlaceCard } from './PlaceCard';

interface PlaceListProps {
  places: Place[];
  selectedPlaceId: string;
  onSelectPlace: (place: Place) => void;
  selectedSort: string;
  onSelectSort: (sort: string) => void;
}

export function PlaceList({
  places,
  selectedPlaceId,
  onSelectPlace,
  selectedSort,
  onSelectSort,
}: PlaceListProps) {
  return (
    <div className="flex flex-col h-full">
      {/* List Header with Sorting placeholder */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
        <div>
          <h2 className="text-base font-bold text-zinc-900">Landmarks &amp; Places</h2>
          <p className="text-xs text-zinc-500">{places.length} places available</p>
        </div>

        {/* Sort Placeholder */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="sort-dropdown" className="text-xs text-zinc-400 font-medium">
            Sort:
          </label>
          <select
            id="sort-dropdown"
            value={selectedSort}
            onChange={(e) => onSelectSort(e.target.value)}
            className="text-xs font-semibold bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-zinc-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="top-rated">Top rated</option>
            <option value="most-reviewed">Most reviewed</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
      </div>

      {/* Cards Scroll Container */}
      <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-13rem)] pr-1">
        {places.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-400">
            No places found under this category.
          </div>
        ) : (
          places.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isSelected={place.id === selectedPlaceId}
              onSelect={onSelectPlace}
            />
          ))
        )}
      </div>
    </div>
  );
}
