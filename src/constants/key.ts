export const AUDIO = {
  DEATH: 'DEATH',
  EXIT: 'EXIT',
  JUMP: 'JUMP',
  LAND: 'LAND',
  SHIFT: 'SHIFT',
  WALK: 'WALK',
} as const;

export const MUSIC = {
  STARWAY: 'STARWAY',
  TO_THE_SPACE: 'TO_THE_SPACE',
  ALIENS: 'ALIENS',
} as const;

export type MusicKey = (typeof MUSIC)[keyof typeof MUSIC];

export const DATA = {
  MUSIC: 'MUSIC',
} as const;

export const IMAGE = {
  TILES: 'TILES',
  ARROW: 'ARROW',
} as const;

export const SCENE = {
  BOOT: 'BOOT',
  GAME: 'GAME',
  MUSIC: 'MUSIC',
} as const;

export const SPRITESHEET = {
  PLAYER: 'PLAYER',
} as const;
