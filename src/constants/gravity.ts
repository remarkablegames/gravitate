import { DIRECTION } from './direction';

export const ANGLE = {
  [DIRECTION.DOWN]: 90,
  [DIRECTION.UP]: -90,
  [DIRECTION.LEFT]: 180,
  [DIRECTION.RIGHT]: 0,
} as const;

export const VECTOR = {
  [DIRECTION.DOWN]: { x: 0, y: 1 },
  [DIRECTION.UP]: { x: 0, y: -1 },
  [DIRECTION.LEFT]: { x: -1, y: 0 },
  [DIRECTION.RIGHT]: { x: 1, y: 0 },
} as const;
