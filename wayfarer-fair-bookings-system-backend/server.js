const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS & JSON parsing
app.use(cors());
app.use(express.json());

// Seed 3 Mock Users
const USERS = [
  {
    id: 'usr_sara',
    name: 'Sara Jenkins',
    email: 'sara.jenkins@wayfarer.app',
    avatar: 'SJ',
    role: 'Architecture Enthusiast',
  },
  {
    id: 'usr_abel',
    name: 'Abel Tesfaye',
    email: 'abel.tesfaye@wayfarer.app',
    avatar: 'AT',
    role: 'Culinary Traveler',
  },
  {
    id: 'usr_liya',
    name: 'Liya Chen',
    email: 'liya.chen@wayfarer.app',
    avatar: 'LC',
    role: 'History Scholar',
  },
];

// Seed In-Memory Places
let PLACES = [
  {
    id: 'p-1',
    name: 'Grand Metropolitan Cathedral',
    category: 'History',
    tagline: '14th-century Gothic cathedral with breathtaking spire views',
    description:
      'Standing proud in the historical heart of the city, this Gothic masterpiece has weathered centuries of change. Marvel at the intricate stained glass windows, explore the stone-vaulted crypt, and climb 300 steps up the south tower for panoramic views of the city skyline.',
    openingHours: '08:30 AM – 06:00 PM',
    isOpenNow: true,
    address: '14 St. Jude Plaza, Old Quarter',
    imageUrl:
      'https://images.unsplash.com/photo-1548625361-12503901b046?auto=format&fit=crop&w=1200&q=80',
    averageRating: 4.86,
    reviewCount: 342,
    tourSlots: [
      {
        id: 'slot-101',
        title: 'Morning Crypt & Rooftop Tour',
        startTime: '09:30 AM',
        endTime: '11:00 AM',
        totalSeats: 12,
        availableSeats: 4,
        guideName: 'Brother Thomas',
        bookedUserIds: ['usr_abel'],
      },
      {
        id: 'slot-102',
        title: 'Gothic Architecture In-Depth',
        startTime: '02:00 PM',
        endTime: '03:30 PM',
        totalSeats: 15,
        availableSeats: 1,
        guideName: 'Elena Rostova',
        bookedUserIds: [],
      },
      {
        id: 'slot-103',
        title: 'Candlelight Evening Echoes',
        startTime: '05:30 PM',
        endTime: '07:00 PM',
        totalSeats: 10,
        availableSeats: 0,
        guideName: 'Marc Dumont',
        bookedUserIds: ['usr_sara', 'usr_liya'],
      },
    ],
    reviews: [
      {
        id: 'rev-1',
        userId: 'usr_liya',
        userName: 'Liya Chen',
        userAvatar: 'LC',
        rating: 5,
        comment:
          'Incredible preservation. The acoustics during the midday organ rehearsal were spiritual. Wear comfortable shoes for the tower climb!',
        createdAt: '2026-10-24T14:15:00Z',
      },
      {
        id: 'rev-2',
        userId: 'usr_sara',
        userName: 'Sara Jenkins',
        userAvatar: 'SJ',
        rating: 5,
        comment:
          'The flying buttresses and ribbed vaults are textbook masterpieces. Don’t miss the treasury museum in the south transept.',
        createdAt: '2026-10-18T10:30:00Z',
      },
    ],
  },
  {
    id: 'p-2',
    name: 'Old Mill Artisan Bakery & Bistro',
    category: 'Food',
    tagline: 'Freshly baked sourdough pastries and heirloom single-origin roast',
    description:
      'Converted from an 18th-century watermill along the river, this artisanal bakery serves stone-ground pastries, wood-fired tartines, and world-class pour-over coffees roasted on site. Arrive early for the cardamom buns before they sell out.',
    openingHours: '07:00 AM – 03:30 PM',
    isOpenNow: true,
    address: '42 Riverbank Way, Mill District',
    imageUrl:
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80',
    averageRating: 4.91,
    reviewCount: 185,
    tourSlots: [
      {
        id: 'slot-201',
        title: 'Behind the Scenes: Sourdough Masterclass',
        startTime: '08:00 AM',
        endTime: '09:30 AM',
        totalSeats: 8,
        availableSeats: 3,
        guideName: 'Chef Henri',
        bookedUserIds: ['usr_liya'],
      },
    ],
    reviews: [
      {
        id: 'rev-3',
        userId: 'usr_abel',
        userName: 'Abel Tesfaye',
        userAvatar: 'AT',
        rating: 5,
        comment:
          'Easily the crispest lamination I have tasted in this region. The fermented wild yeast gives their sourdough unmatched depth.',
        createdAt: '2026-10-29T09:12:00Z',
      },
    ],
  },
  {
    id: 'p-3',
    name: 'The Nook Coffee Hole (Tiny Popup)',
    category: 'Food',
    tagline: 'A two-stool espresso hatch tucked in an alleyway',
    description:
      'A tiny one-man operation operating through an alley window. Pulls decent espresso shots, but has almost no seating or menu variety. Often highlighted by one or two enthusiastic influencers.',
    openingHours: '08:00 AM – 01:00 PM',
    isOpenNow: false,
    address: 'Alley 9, off Market Square',
    imageUrl:
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    averageRating: 5.0, // 1 review only
    reviewCount: 1,
    tourSlots: [
      {
        id: 'slot-301',
        title: 'Brief Alley Barista Demo',
        startTime: '10:00 AM',
        endTime: '10:30 AM',
        totalSeats: 4,
        availableSeats: 2,
        guideName: 'Leo Vance',
        bookedUserIds: [],
      },
    ],
    reviews: [
      {
        id: 'rev-4',
        userId: 'usr_sara',
        userName: 'Sara Jenkins',
        userAvatar: 'SJ',
        rating: 5,
        comment: 'Cute hole in the wall with quick macchiatos on the run.',
        createdAt: '2026-11-01T11:00:00Z',
      },
    ],
  },
  {
    id: 'p-4',
    name: 'Botanical Conservatories & Sunken Gardens',
    category: 'Nature',
    tagline: 'Victorian glasshouses filled with rare cloud-forest flora and orchids',
    description:
      'Spread across 35 lush acres, the city Botanical Conservatories host over 9,000 living plant species. Walk through the temperate mist house, gaze upon exotic water lilies in the tropical pond pavilion, and unwind in the Japanese zen rock garden.',
    openingHours: '09:00 AM – 05:00 PM',
    isOpenNow: true,
    address: '108 Arboretum Avenue, Green Belt',
    imageUrl:
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80',
    averageRating: 4.82,
    reviewCount: 228,
    tourSlots: [
      {
        id: 'slot-401',
        title: 'Morning Orchid & Fern Guided Walk',
        startTime: '09:30 AM',
        endTime: '11:00 AM',
        totalSeats: 14,
        availableSeats: 8,
        guideName: 'Dr. Clara Higgins',
        bookedUserIds: [],
      },
    ],
    reviews: [
      {
        id: 'rev-5',
        userId: 'usr_abel',
        userName: 'Abel Tesfaye',
        userAvatar: 'AT',
        rating: 5,
        comment: 'A quiet sanctuary away from the hustle. The scent inside the citrus pavilion alone is worth it.',
        createdAt: '2026-10-15T15:45:00Z',
      },
    ],
  },
  {
    id: 'p-5',
    name: 'National Museum of Contemporary Arts',
    category: 'Culture',
    tagline: 'Modernist exhibits, sculptural courtyards, and multimedia halls',
    description:
      'Designed by renowned architects, the Contemporary Museum showcases cutting-edge global installations, dynamic light rooms, and permanent collections from modern masters.',
    openingHours: '10:00 AM – 08:00 PM',
    isOpenNow: true,
    address: '77 Dockside Boulevard, Waterfront',
    imageUrl:
      'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=1200&q=80',
    averageRating: 4.74,
    reviewCount: 310,
    tourSlots: [
      {
        id: 'slot-501',
        title: 'Curator’s Highlights: 21st Century Visions',
        startTime: '11:00 AM',
        endTime: '12:30 PM',
        totalSeats: 15,
        availableSeats: 5,
        guideName: 'Soren Lind',
        bookedUserIds: [],
      },
    ],
    reviews: [
      {
        id: 'rev-7',
        userId: 'usr_sara',
        userName: 'Sara Jenkins',
        userAvatar: 'SJ',
        rating: 5,
        comment: 'Brutalist cantilever structure seamlessly blends with minimalist galleries.',
        createdAt: '2026-10-20T16:00:00Z',
      },
    ],
  },
];

// Bayesian Weighted Rating Formula:
// W = (v / (v + m)) * R + (m / (v + m)) * C
const M_THRESHOLD = 15;
const DEFAULT_PRIOR_C = 4.5;

function computeWeightedScore(place, priorMean = DEFAULT_PRIOR_C) {
  const v = place.reviewCount;
  const R = place.averageRating;
  const m = M_THRESHOLD;
  const C = priorMean;

  if (v === 0) return C;
  return Number(((v / (v + m)) * R + (m / (v + m)) * C).toFixed(3));
}

// Helper middleware to extract user from X-User-Id header
function getAuthUser(req) {
  const userId = req.headers['x-user-id'] || req.body?.userId;
  return USERS.find((u) => u.id === userId) || USERS[0];
}

// Routes

// 1. Get mock users
app.get('/api/users', (req, res) => {
  res.json({ users: USERS });
});

// 2. Get places (with category & sort)
app.get('/api/places', (req, res) => {
  const { category, sort } = req.query;
  let result = [...PLACES];

  if (category && category !== 'All') {
    result = result.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase()
    );
  }

  // Attach weighted score
  result = result.map((p) => ({
    ...p,
    weightedScore: computeWeightedScore(p),
  }));

  if (sort === 'weighted-rating') {
    result.sort((a, b) => b.weightedScore - a.weightedScore || b.reviewCount - a.reviewCount);
  } else if (sort === 'highest-rating') {
    result.sort((a, b) => b.averageRating - a.averageRating);
  } else if (sort === 'most-reviewed') {
    result.sort((a, b) => b.reviewCount - a.reviewCount);
  } else if (sort === 'name-asc') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  }

  res.json({ places: result });
});

// 3. Get single place details
app.get('/api/places/:id', (req, res) => {
  const place = PLACES.find((p) => p.id === req.params.id);
  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }
  res.json({
    place: {
      ...place,
      weightedScore: computeWeightedScore(place),
    },
  });
});

// 4. Book a tour slot (uses X-User-Id)
app.post('/api/places/:id/book', (req, res) => {
  const user = getAuthUser(req);
  const { slotId } = req.body;

  const place = PLACES.find((p) => p.id === req.params.id);
  if (!place) return res.status(404).json({ error: 'Place not found' });

  const slot = place.tourSlots.find((s) => s.id === slotId);
  if (!slot) return res.status(404).json({ error: 'Tour slot not found' });

  if (slot.bookedUserIds.includes(user.id)) {
    return res.status(400).json({ error: `User ${user.name} already booked this slot.` });
  }

  if (slot.availableSeats <= 0) {
    return res.status(400).json({ error: 'Tour slot is fully booked.' });
  }

  slot.availableSeats -= 1;
  slot.bookedUserIds.push(user.id);

  res.json({
    success: true,
    message: `Reservation confirmed for ${user.name}!`,
    slot,
  });
});

// 5. Submit a review (uses X-User-Id)
app.post('/api/places/:id/reviews', (req, res) => {
  const user = getAuthUser(req);
  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Valid star rating (1-5) is required.' });
  }
  if (!comment || !comment.trim()) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  const place = PLACES.find((p) => p.id === req.params.id);
  if (!place) return res.status(404).json({ error: 'Place not found' });

  const newReview = {
    id: `rev-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    rating: Number(rating),
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
  };

  const newCount = place.reviewCount + 1;
  const newAverage = Number(
    ((place.averageRating * place.reviewCount + rating) / newCount).toFixed(2)
  );

  place.reviewCount = newCount;
  place.averageRating = newAverage;
  place.reviews.unshift(newReview);

  res.status(201).json({
    success: true,
    message: 'Review published successfully.',
    review: newReview,
    place: {
      id: place.id,
      averageRating: place.averageRating,
      reviewCount: place.reviewCount,
      weightedScore: computeWeightedScore(place),
    },
  });
});

app.listen(PORT, () => {
  console.log(`Wayfarer API server listening on http://localhost:${PORT}`);
});
