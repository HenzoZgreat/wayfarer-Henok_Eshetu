/**
 * Wayfarer API Service
 * Connects the frontend to the Express/PostgreSQL backend API.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface User {
  id: number;
  name: string;
  avatar: string;
  role: string;
}

export interface TourSlot {
  id: number;
  time: string;
  totalSeats: number;
  availableSeats: number;
  guide: string;
  bookedUserIds?: number[];
}

export interface Review {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface BookingResponse {
  message: string;
  booking: {
    id: number;
    slot_id: number;
    user_id: number;
    seats: number;
    created_at: string;
  };
  remaining_seats: number;
}

export interface Place {
  id: number;
  name: string;
  category: string;
  description: string;
  openingHours: string;
  starRating: number;
  reviewCount: number;
  weightedScore?: number;
  imageUrl: string;
  tourSlots: TourSlot[];
  reviews: Review[];
}

// User persona titles
const USER_ROLES: Record<string, string> = {
  Sara: 'Explorer',
  Abel: 'History Buff',
  Liya: 'Food Lover',
};

// Curated high-res images for known seeded places & category fallbacks
const PLACE_IMAGES: Record<string, string> = {
  cathedral: 'https://images.unsplash.com/photo-1548625361-19597e74dc48?auto=format&fit=crop&w=800&q=80',
  bakery: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  espresso: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
  nook: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
  conservatories: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
  citadel: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
  clock: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
  fish: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
  market: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
  cove: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  aqueduct: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
  trattoria: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=800&q=80',
  overlook: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
};

const CATEGORY_IMAGES: Record<string, string> = {
  History: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
  Food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  Nature: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
  Culture: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=800&q=80',
};

export function resolvePlaceImage(name: string, category: string): string {
  const lowerName = name.toLowerCase();
  for (const [key, url] of Object.entries(PLACE_IMAGES)) {
    if (lowerName.includes(key)) {
      return url;
    }
  }
  return CATEGORY_IMAGES[category] || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80';
}

export function formatSlotDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatReviewDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoString;
  }
}

/**
 * 1. Fetch all users from database
 * GET /api/users
 */
export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/users`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch users: ${res.statusText}`);
  }
  const data = await res.json();
  return (data.users || []).map((u: { id: number; name: string }) => ({
    id: u.id,
    name: u.name,
    avatar: u.name.charAt(0).toUpperCase(),
    role: USER_ROLES[u.name] || 'Traveler',
  }));
}

/**
 * 2. Fetch places list with category and sort query parameters
 * GET /api/places?category=...&sort=...
 */
export async function fetchPlaces(
  category?: string,
  sort?: string
): Promise<Place[]> {
  const params = new URLSearchParams();
  if (category && category !== 'All') {
    params.set('category', category);
  }
  if (sort) {
    // Backend supports top_rated / top-rated, most_reviewed / most-reviewed, name
    params.set('sort', sort);
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/places${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch places: ${res.statusText}`);
  }

  const data = await res.json();
  return (data.places || []).map(
    (p: {
      id: number;
      name: string;
      category: string;
      description: string;
      opening_hours: string;
      review_count: number;
      average_rating: number;
      weighted_score: number;
    }) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      description: p.description,
      openingHours: p.opening_hours,
      starRating: p.average_rating || 0,
      reviewCount: p.review_count || 0,
      weightedScore: p.weighted_score,
      imageUrl: resolvePlaceImage(p.name, p.category),
      tourSlots: [],
      reviews: [],
    })
  );
}

/**
 * 3. Fetch single place with full details, reviews, and tour slots
 * GET /api/places/:id
 */
export async function fetchPlaceById(id: number | string): Promise<Place> {
  const res = await fetch(`${API_BASE_URL}/places/${id}`, {
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch place #${id}: ${res.statusText}`);
  }

  const data = await res.json();
  const p = data.place;

  return {
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    openingHours: p.opening_hours,
    starRating: p.average_rating || 0,
    reviewCount: p.review_count || 0,
    imageUrl: resolvePlaceImage(p.name, p.category),
    tourSlots: (p.tour_slots || []).map(
      (s: {
        id: number;
        starts_at: string;
        capacity: number;
        booked_seats: number;
        available_seats: number;
        booked_user_ids?: number[];
      }) => ({
        id: s.id,
        time: formatSlotDateTime(s.starts_at),
        totalSeats: s.capacity,
        availableSeats: s.available_seats,
        guide: 'Wayfarer Guide',
        bookedUserIds: s.booked_user_ids || [],
      })
    ),
    reviews: (p.reviews || []).map(
      (r: {
        id: number;
        rating: number;
        body: string;
        created_at: string;
        user_id: number;
        user_name: string;
      }) => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userAvatar: r.user_name.charAt(0).toUpperCase(),
        rating: r.rating,
        comment: r.body,
        date: formatReviewDate(r.created_at),
      })
    ),
  };
}

/**
 * 4. Book a tour slot with concurrency safety
 * POST /api/places/:id/book
 */
export async function bookTourSlot(
  placeId: number | string,
  slotId: number,
  userId: number,
  seats: number = 1
): Promise<BookingResponse> {
  const res = await fetch(`${API_BASE_URL}/places/${placeId}/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      slot_id: slotId,
      user_id: userId,
      seats,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to complete booking');
  }

  return data as BookingResponse;
}

export interface ReviewResponse {
  message?: string;
  review: {
    id: number;
    place_id: number;
    user_id: number;
    rating: number;
    body: string;
    created_at: string;
  };
}

/**
 * 5. Submit or update a visitor review
 * POST /api/places/:id/reviews
 */
export async function submitReview(
  placeId: number | string,
  userId: number,
  rating: number,
  body: string
): Promise<ReviewResponse> {
  const res = await fetch(`${API_BASE_URL}/places/${placeId}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: userId,
      rating,
      body,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit review');
  }

  return data as ReviewResponse;
}
