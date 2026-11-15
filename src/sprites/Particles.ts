import Phaser from 'phaser';

import { GRAVITY, KEY } from '../constants';
import type { Direction } from '../types';

const SHIFT_STREAK_COUNT = 20;
const SHIFT_STREAK_ANGLE_SPREAD = 12;
const SHIFT_STREAK_SPEED_MIN = 50;
const SHIFT_STREAK_SPEED_MAX = 100;

const DUST = {
  COUNT: 6,
  LIFESPAN_MIN_MS: 260,
  LIFESPAN_MAX_MS: 420,
  SPEED_MIN: 18,
  SPEED_MAX: 45,
  GRAVITY: 60,
  ALPHA: 0.32,
  SCALE_MAX: 1,
  TINT: 0xc9d8de,
} as const;

const AMBIENT_DUST = {
  COUNT: 32,
  FREQUENCY_MS: 300,
  LIFESPAN_MIN_MS: 7000,
  LIFESPAN_MAX_MS: 12000,
  SPEED_MIN: 4,
  SPEED_MAX: 10,
  GRAVITY: 10,
  MAX_VELOCITY: 12,
  ALPHA: 0.14,
  SCALE_MIN: 0.4,
  SCALE_MAX: 0.7,
  TINT: 0x8fa9bd,
  ADVANCE_MS: 9000,
} as const;

export class Particles {
  private scene: Phaser.Scene;
  ambientEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  shiftEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createParticleTexture();
  }

  private createParticleTexture() {
    if (this.scene.textures.exists(KEY.TEXTURE.PARTICLE)) {
      return;
    }

    const graphics = this.scene.make.graphics({}, false);
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 2, 2);
    graphics.generateTexture(KEY.TEXTURE.PARTICLE, 2, 2);
    graphics.destroy();
  }

  private createRoomEmitZone(
    map: Phaser.Tilemaps.Tilemap,
  ): Phaser.Types.GameObjects.Particles.EmitZoneData {
    return {
      type: 'random',
      source: {
        getRandomPoint: (point: Phaser.Types.Math.Vector2Like) => {
          point.x = Phaser.Math.Between(0, map.widthInPixels - 1);
          point.y = Phaser.Math.Between(0, map.heightInPixels - 1);
        },
      },
    };
  }

  /**
   * Background air particles
   */
  createAmbientEmitter(
    map: Phaser.Tilemaps.Tilemap,
    gravityDirection: Direction,
  ) {
    const { x, y } = GRAVITY.VECTOR[gravityDirection];

    this.ambientEmitter = this.scene.add.particles(0, 0, KEY.TEXTURE.PARTICLE, {
      emitting: true,
      frequency: AMBIENT_DUST.FREQUENCY_MS,
      lifespan: {
        min: AMBIENT_DUST.LIFESPAN_MIN_MS,
        max: AMBIENT_DUST.LIFESPAN_MAX_MS,
      },
      speed: { min: AMBIENT_DUST.SPEED_MIN, max: AMBIENT_DUST.SPEED_MAX },
      angle: { min: 0, max: 360 },
      gravityX: x * AMBIENT_DUST.GRAVITY,
      gravityY: y * AMBIENT_DUST.GRAVITY,
      maxVelocityX: AMBIENT_DUST.MAX_VELOCITY,
      maxVelocityY: AMBIENT_DUST.MAX_VELOCITY,
      alpha: { start: AMBIENT_DUST.ALPHA, end: 0 },
      scale: { min: AMBIENT_DUST.SCALE_MIN, max: AMBIENT_DUST.SCALE_MAX },
      tint: AMBIENT_DUST.TINT,
      maxAliveParticles: AMBIENT_DUST.COUNT,
      advance: AMBIENT_DUST.ADVANCE_MS,
      emitZone: this.createRoomEmitZone(map),
    });
  }

  /**
   * Emit dust when player jumps/lands
   */
  createDustEmitter(gravityDirection: Direction) {
    const { x, y } = GRAVITY.VECTOR[gravityDirection];

    this.dustEmitter = this.scene.add.particles(0, 0, KEY.TEXTURE.PARTICLE, {
      emitting: false,
      lifespan: { min: DUST.LIFESPAN_MIN_MS, max: DUST.LIFESPAN_MAX_MS },
      speed: { min: DUST.SPEED_MIN, max: DUST.SPEED_MAX },
      angle: { min: 0, max: 360 },
      gravityX: x * DUST.GRAVITY,
      gravityY: y * DUST.GRAVITY,
      alpha: { start: DUST.ALPHA, end: 0 },
      scale: { start: DUST.SCALE_MAX, end: 0 },
      tint: DUST.TINT,
      maxAliveParticles: DUST.COUNT * 4,
    });
  }

  /**
   * Background air particles when gravity changes
   */
  createShiftEmitter(
    map: Phaser.Tilemaps.Tilemap,
    gravityDirection: Direction,
  ) {
    this.shiftEmitter = this.scene.add.particles(0, 0, KEY.TEXTURE.PARTICLE, {
      emitting: false,
      lifespan: { min: 240, max: 380 },
      speed: SHIFT_STREAK_SPEED_MIN,
      angle: GRAVITY.ANGLE[gravityDirection],
      alpha: { start: AMBIENT_DUST.ALPHA, end: 0 },
      scale: { start: 0.8, end: 0 },
      tint: 0x9fcdd6,
      maxAliveParticles: SHIFT_STREAK_COUNT * 2,
      emitZone: this.createRoomEmitZone(map),
    });
  }

  updateAmbientGravity(gravityDirection: Direction) {
    const { x, y } = GRAVITY.VECTOR[gravityDirection];

    this.ambientEmitter.setParticleGravity(
      x * AMBIENT_DUST.GRAVITY,
      y * AMBIENT_DUST.GRAVITY,
    );
  }

  emitPlayerDust(x: number, y: number, gravityDirection: Direction) {
    this.emitDust(DUST.COUNT, x, y, gravityDirection);
  }

  private emitDust(
    count: number,
    x: number,
    y: number,
    gravityDirection: Direction,
  ) {
    const { x: gravityX, y: gravityY } = GRAVITY.VECTOR[gravityDirection];

    this.dustEmitter.setParticleGravity(
      gravityX * DUST.GRAVITY,
      gravityY * DUST.GRAVITY,
    );
    this.dustEmitter.explode(count, x, y);
  }

  emitGravityShiftStreak(gravityDirection: Direction) {
    const angle = GRAVITY.ANGLE[gravityDirection];

    for (let index = 0; index < SHIFT_STREAK_COUNT; index++) {
      this.shiftEmitter.setEmitterAngle(
        angle +
          Phaser.Math.Between(
            -SHIFT_STREAK_ANGLE_SPREAD,
            SHIFT_STREAK_ANGLE_SPREAD,
          ),
      );
      this.shiftEmitter.setParticleSpeed(
        Phaser.Math.Between(SHIFT_STREAK_SPEED_MIN, SHIFT_STREAK_SPEED_MAX),
      );
      this.shiftEmitter.emitParticle(1);
    }
  }
}
