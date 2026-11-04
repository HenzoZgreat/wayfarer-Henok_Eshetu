'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CATEGORIES, MOCK_USERS, MockUser } from '@/data/mockData';

interface HeaderProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  activeUser: MockUser;
  onSelectUser: (user: MockUser) => void;
}

export function Header({
  selectedCategory,
  onSelectCategory,
  activeUser,
  onSelectUser,
}: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md">
      <div className="w-full px-3 sm:px-6">
        {/* Top Bar: Brand, Skeleton Preview Toggle, User Switcher */}
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm font-bold text-lg">
              W
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-zinc-900">
                Wayfarer
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                City Guide
              </span>
            </div>
          </div>

          {/* Right Controls: Acting As switcher */}
          <div className="flex items-center gap-3">
            {/* Acting As User Switcher Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-zinc-200 bg-white shadow-sm hover:border-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <span className="text-xs text-zinc-500 hidden sm:inline">Acting as:</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                  {activeUser.avatar}
                </span>
                <span className="text-sm font-semibold text-zinc-900">{activeUser.name}</span>
                <svg
                  className={`w-4 h-4 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg z-50">
                  <div className="px-3 py-1.5 border-b border-zinc-100 mb-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                      Switch UI Persona
                    </span>
                  </div>
                  {MOCK_USERS.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        onSelectUser(user);
                        setDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        user.id === activeUser.id
                          ? 'bg-indigo-50 text-indigo-900 font-semibold'
                          : 'hover:bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-bold text-zinc-700">
                          {user.avatar}
                        </span>
                        <div>
                          <div>{user.name}</div>
                          <div className="text-[11px] text-zinc-400 font-normal">{user.role}</div>
                        </div>
                      </div>
                      {user.id === activeUser.id && (
                        <span className="text-indigo-600 text-xs">●</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Category Filter Pills Bar */}
        <div className="py-2.5 border-t border-zinc-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Category:
          </span>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-sm'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
