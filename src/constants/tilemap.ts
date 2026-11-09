export const TILESET_NAME = 'tileset';

export const TILEMAP_LAYER = {
  BACKGROUND: 'Background',
  GROUND: 'Ground',
  SPIKES: 'Spikes',
  FOREGROUND: 'Foreground',
  OBJECTS: 'Objects',
} as const;

export const TILEMAP_OBJECT = {
  SPAWN: 'Spawn',
  EXIT: 'Exit',
  ARROW: 'Arrow',
} as const;
