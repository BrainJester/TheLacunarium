import { ALL_ROOMS } from './rooms';
export const NAV_LINKS = [{ to: '/', label: 'Lacunarium' }, ...ALL_ROOMS.map(room => ({ to: room.route, label: room.label }))];
