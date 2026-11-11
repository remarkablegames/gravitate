import Phaser from 'phaser';

import { KEY } from '../constants';
import type { MusicKey } from '../types';

const MUSIC_VOLUME = 0.8;
const MUSIC_FADE_DURATION_MS = 1000;

const MUSIC_FILES: Record<MusicKey, string[]> = {
  [KEY.MUSIC.STARWAY]: ['music/starway.ogg', 'music/starway.mp3'],
  [KEY.MUSIC.TO_THE_SPACE]: [
    'music/to_the_space.ogg',
    'music/to_the_space.mp3',
  ],
  [KEY.MUSIC.ALIENS]: ['music/aliens.ogg', 'music/aliens.mp3'],
};

/**
 * Phaser's `BaseSound` type omits the runtime `volume` property that every
 * sound implementation provides.
 */
type MusicTrack = Phaser.Sound.BaseSound & { volume: number };

/**
 * Loads music in the background and plays the requested track as soon as it is
 * ready. Runs in parallel with the Game scene so audio never delays a level.
 */
export class Music extends Phaser.Scene {
  private currentTrack?: MusicTrack;
  private requestedKey?: MusicKey;
  private readonly pending = new Set<string>();

  constructor() {
    super(KEY.SCENE.MUSIC);
  }

  create() {
    this.registry.events.on(Phaser.Data.Events.SET_DATA, this.handleData, this);
    this.registry.events.on(
      Phaser.Data.Events.CHANGE_DATA,
      this.handleData,
      this,
    );
    this.load.on(
      Phaser.Loader.Events.FILE_LOAD_ERROR,
      this.handleLoadError,
      this,
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.registry.events.off(
        Phaser.Data.Events.SET_DATA,
        this.handleData,
        this,
      );
      this.registry.events.off(
        Phaser.Data.Events.CHANGE_DATA,
        this.handleData,
        this,
      );
      this.load.off(
        Phaser.Loader.Events.FILE_LOAD_ERROR,
        this.handleLoadError,
        this,
      );
    });

    this.handleData(
      undefined,
      KEY.DATA.MUSIC,
      this.registry.get(KEY.DATA.MUSIC) as MusicKey | undefined,
    );
  }

  private handleData = (_parent: unknown, key: string, value?: MusicKey) => {
    if (key === KEY.DATA.MUSIC && value) {
      this.requestTrack(value);
    }
  };

  private handleLoadError = (file: Phaser.Loader.File) => {
    this.pending.delete(file.key);
  };

  private requestTrack(key: MusicKey) {
    this.requestedKey = key;

    if (this.cache.audio.exists(key)) {
      this.playTrack(key);
      return;
    }

    if (this.pending.has(key)) {
      return;
    }

    this.pending.add(key);
    this.load.audio(key, MUSIC_FILES[key]);
    this.load.once(`filecomplete-audio-${key}`, () => {
      this.pending.delete(key);

      if (this.requestedKey === key) {
        this.playTrack(key);
      }
    });
    this.load.start();
  }

  private playTrack(key: MusicKey) {
    if (this.currentTrack?.key === key) {
      return;
    }

    if (this.currentTrack) {
      this.fadeOut(this.currentTrack);
    }

    const track = (this.sound.getAll(key).at(0) ??
      this.sound.add(key, { loop: true, volume: 0 })) as MusicTrack;

    this.currentTrack = track;
    this.tweens.killTweensOf(track);

    if (!track.isPlaying) {
      track.volume = 0;
      track.play();
    }

    if (Math.abs(track.volume - MUSIC_VOLUME) > 0.01) {
      this.tweens.add({
        targets: track,
        volume: MUSIC_VOLUME,
        duration: MUSIC_FADE_DURATION_MS,
      });
    }
  }

  private fadeOut(track: MusicTrack) {
    this.tweens.killTweensOf(track);
    this.tweens.add({
      targets: track,
      volume: 0,
      duration: MUSIC_FADE_DURATION_MS,
      onComplete: () => track.stop(),
    });
  }
}
