export interface Level {
  level: number;
  tilemap: string;
  helpText: string;
}

export const LEVELS: Level[] = [
  {
    level: 0,
    tilemap: 'level0',
    helpText: 'WASD or arrow keys to move',
  },

  {
    level: 1,
    tilemap: 'level1',
    helpText: 'Use arrow to shift gravity',
  },

  {
    level: 2,
    tilemap: 'level2',
    helpText: 'Break free from the chain',
  },
];
