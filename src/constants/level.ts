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
    helpText: 'Shift gravity with green arrow',
  },
];
