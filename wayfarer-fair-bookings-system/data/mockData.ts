export interface MockUser {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

export interface TourSlot {
  id: string;
  time: string;
  totalSeats: number;
  availableSeats: number;
  guide: string;
}

export interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Place {
  id: string;
  name: string;
  category: 'History' | 'Food' | 'Nature' | 'Culture';
  description: string;
  openingHours: string;
  starRating: number;
  reviewCount: number;
  imageUrl: string;
  tourSlots: TourSlot[];
  reviews: Review[];
}

export const MOCK_USERS: MockUser[] = [
  { id: 'u1', name: 'Sara', avatar: 'S', role: 'Explorer' },
  { id: 'u2', name: 'Abel', avatar: 'A', role: 'History Buff' },
  { id: 'u3', name: 'Liya', avatar: 'L', role: 'Food Lover' },
];

export const CATEGORIES = ['All', 'History', 'Food', 'Nature', 'Culture'] as const;

export const MOCK_PLACES: Place[] = [
  {
    id: 'p1',
    name: 'Old Town Clock Tower & Citadel',
    category: 'History',
    description:
      'A medieval stone fortress offering panoramic rampart walkways, historic armory halls, and guided ascent through the 14th-century astronomical clock chamber.',
    openingHours: '09:00 AM – 06:00 PM',
    starRating: 4.8,
    reviewCount: 312,
    imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=800&q=80',
    tourSlots: [
      { id: 's1', time: '10:00 AM – 11:30 AM', totalSeats: 10, availableSeats: 4, guide: 'Brother Thomas' },
      { id: 's2', time: '01:30 PM – 03:00 PM', totalSeats: 12, availableSeats: 1, guide: 'Elena Rostova' },
      { id: 's3', time: '04:30 PM – 06:00 PM', totalSeats: 8, availableSeats: 0, guide: 'Marc Dumont' },
    ],
    reviews: [
      {
        id: 'r1',
        userName: 'Liya',
        userAvatar: 'L',
        rating: 5,
        comment: 'The acoustic resonance inside the bell chamber is breathtaking. Wear comfortable walking shoes!',
        date: '2 days ago',
      },
      {
        id: 'r2',
        userName: 'Sara',
        userAvatar: 'S',
        rating: 5,
        comment: 'Fascinating masonry and preservation work. The guides are deeply knowledgeable.',
        date: '1 week ago',
      },
    ],
  },
  {
    id: 'p2',
    name: 'Artisan Waterfront Bakery & Roastery',
    category: 'Food',
    description:
      'Heirloom grain sourdough bakery and specialty micro-roastery housed in a restored dockside warehouse. Known for warm cardamom twists and pour-overs.',
    openingHours: '07:30 AM – 04:00 PM',
    starRating: 4.9,
    reviewCount: 184,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    tourSlots: [
      { id: 's4', time: '08:30 AM – 09:30 AM', totalSeats: 8, availableSeats: 3, guide: 'Chef Henri' },
      { id: 's5', time: '11:00 AM – 12:00 PM', totalSeats: 6, availableSeats: 0, guide: 'Maya Thorne' },
    ],
    reviews: [
      {
        id: 'r3',
        userName: 'Abel',
        userAvatar: 'A',
        rating: 5,
        comment: 'Best lamination in the city. The coffee tasting flight is an absolute must-try.',
        date: '3 days ago',
      },
    ],
  },
  {
    id: 'p3',
    name: 'Botanical Conservatories & Mist Garden',
    category: 'Nature',
    description:
      'Victorian cast-iron pavilions hosting 8,000 living plant species, cloud forest terrariums, giant Amazon water lilies, and quiet fern walkways.',
    openingHours: '09:00 AM – 05:00 PM',
    starRating: 4.7,
    reviewCount: 220,
    imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
    tourSlots: [
      { id: 's6', time: '10:30 AM – 12:00 PM', totalSeats: 15, availableSeats: 7, guide: 'Dr. Clara Higgins' },
      { id: 's7', time: '03:00 PM – 04:30 PM', totalSeats: 12, availableSeats: 2, guide: 'Mateo Ortiz' },
    ],
    reviews: [
      {
        id: 'r4',
        userName: 'Sara',
        userAvatar: 'S',
        rating: 4,
        comment: 'Peaceful escape right inside the city center. Very photogenic glasshouse domes.',
        date: '5 days ago',
      },
    ],
  },
  {
    id: 'p4',
    name: 'National Modern Arts Pavilions',
    category: 'Culture',
    description:
      'Contemporary galleries exhibiting modernist sculpture, immersive audio-visual exhibits, and seasonal outdoor installations overlooking the harbor.',
    openingHours: '10:00 AM – 07:30 PM',
    starRating: 4.6,
    reviewCount: 145,
    imageUrl: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=800&q=80',
    tourSlots: [
      { id: 's8', time: '02:00 PM – 03:30 PM', totalSeats: 15, availableSeats: 5, guide: 'Soren Lind' },
    ],
    reviews: [
      {
        id: 'r5',
        userName: 'Abel',
        userAvatar: 'A',
        rating: 5,
        comment: 'Super modern architecture and thought-provoking exhibitions.',
        date: '1 week ago',
      },
    ],
  },
];
