export const DIRECTION = {
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
} as const;

export type Direction = (typeof DIRECTION)[keyof typeof DIRECTION];
