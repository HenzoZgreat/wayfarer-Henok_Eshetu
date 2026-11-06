import React from 'react';
import { Place } from '@/services/api';

interface PlaceCardProps {
  place: Place;
  isSelected: boolean;
  onSelect: (place: Place) => void;
}

export function PlaceCard({ place, isSelected, onSelect }: PlaceCardProps) {
  const ratingValue = Number(place.starRating) || 0;

  return (
    <div
      onClick={() => onSelect(place)}
      className={`group cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
        isSelected
          ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-1 ring-indigo-600/30'
          : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm'
      }`}
    >
      <div className="flex gap-4">
        {/* Thumbnail Image */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={place.imageUrl}
            alt={place.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        </div>

        {/* Card Meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
              {place.category}
            </span>
            <span className="text-xs text-zinc-400 font-medium truncate">
              {place.openingHours}
            </span>
          </div>

          <h3 className="mt-1 text-sm font-bold text-zinc-900 group-hover:text-indigo-600 transition-colors truncate">
            {place.name}
          </h3>

          {/* Star Rating & Review Count */}
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {/* Stars */}
            <div className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.round(ratingValue) ? 'fill-current' : 'text-zinc-200'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            <span className="font-bold text-zinc-800">{ratingValue.toFixed(1)}</span>
            <span className="text-zinc-400">({place.reviewCount} reviews)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
