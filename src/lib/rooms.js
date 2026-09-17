// Shared catalog: tower, navigation and game labels.
export const GAMES = [
  { id: 'piece-and-quiet', label: 'Piece & Quiet', route: '/piece-and-quiet', url: '/assets/2cec16cb96041ed6.png', record: 'mass_record', recordLabel: 'Island size', leaderboard: 'getTopMassRecords' },
  { id: 'red-queen', label: 'Red Queen', route: '/red-queen', url: '/assets/6d3bd9873dd8a1a5.png', record: 'red_queen_record', recordLabel: 'Hearts earned', leaderboard: 'getTopRedQueenRecords' },
];
export const GROUND_ROOMS = [
  { id: 'games', label: 'Games', url: '/assets/73e512a3c6883716.png', floor: 1 },
  { id: 'profile', label: 'Profile', url: '/assets/32455b3c157f5251.png', route: '/profile' },
  { id: 'hq', label: 'HQ', url: '/assets/dff4e99b545a3597.png', route: '/hq' },
  { id: 'dots', label: "Dot’s Room", url: '/assets/53781b30788fd50b.png', route: '/dots-room' },
  { id: 'apartments', label: 'Apartments', url: '/assets/06c8ee181badaf34.png', soon: true },
];
const FUTURE_ROOMS = [1, 2, 3].map(n => ({ id: `future-${n}`, label: 'Coming soon', soon: true }));
export function getFloorRooms(floor) { return floor === 0 ? GROUND_ROOMS : floor === 1 ? GAMES : FUTURE_ROOMS; }
export const ALL_ROOMS = [...GROUND_ROOMS.filter(r => r.route), ...GAMES];
export function floorLabel(floor) { return floor === 0 ? 'Ground floor' : floor === 1 ? 'Games' : 'New creations'; }
