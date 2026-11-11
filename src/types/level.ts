import type { MusicKey } from './key';

export interface Level {
  level: number;
  tilemap: string;
  music: MusicKey;
  helpText: string;
}
