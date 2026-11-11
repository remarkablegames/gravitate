import Phaser from 'phaser';

import { DIRECTION, KEY } from '../constants';
import type { Direction } from '../types';

const ANIMATION = {
  IDLE: 'IDLE',
  RUN: 'RUN',
} as const;

type Cursors = Record<
  'w' | 'a' | 's' | 'd' | 'up' | 'left' | 'down' | 'right',
  Phaser.Input.Keyboard.Key
>;

const PLAYER_VELOCITY = 250;
const LAND_MIN_AIRBORNE_MS = 150;
const WALK_SOUND_VOLUME = 0.3;

/**
 * Collision box (size and offset) for each gravity direction, aligned to the
 * player sprite after it is rotated/flipped to match the gravity.
 */
const BODY_CONFIG: Record<
  Direction,
  { width: number; height: number; offsetX: number; offsetY: number }
> = {
  [DIRECTION.DOWN]: { width: 6, height: 13, offsetX: 13, offsetY: 10 },
  [DIRECTION.UP]: { width: 6, height: 13, offsetX: 13, offsetY: 9 },
  [DIRECTION.LEFT]: { width: 13, height: 6, offsetX: 9, offsetY: 13 },
  [DIRECTION.RIGHT]: { width: 13, height: 6, offsetX: 10, offsetY: 13 },
};

const GRAVITY_ROTATION: Record<Direction, number> = {
  [DIRECTION.DOWN]: 0,
  [DIRECTION.UP]: 0,
  [DIRECTION.LEFT]: Math.PI / 2,
  [DIRECTION.RIGHT]: -Math.PI / 2,
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private cursors: Cursors;
  private walkSound: Phaser.Sound.BaseSound;
  private wasOnGround = true;
  private airborneSince = 0;
  gravityDirection: Direction = DIRECTION.DOWN;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture = KEY.SPRITESHEET.PLAYER,
    frame = 0,
  ) {
    super(scene, x, y, texture, frame);

    this.cursors = this.createCursorKeys();
    this.walkSound = scene.sound.add(KEY.AUDIO.WALK, {
      loop: true,
      volume: WALK_SOUND_VOLUME,
      rate: 0.8,
    });
    this.createAnimations();
    this.enablePhysics();
  }

  private enablePhysics() {
    this.scene.physics.world.enable(this);
    this.scene.add.existing(this);

    this.setGravityDirection(this.gravityDirection);
  }

  /**
   * Rotate/flip the sprite and resize the collision box so the player stands
   * on the surface the gravity is pulling them towards.
   */
  setGravityDirection(direction: Direction) {
    this.gravityDirection = direction;

    const isSideways =
      direction === DIRECTION.LEFT || direction === DIRECTION.RIGHT;

    this.setRotation(GRAVITY_ROTATION[direction]);
    this.setFlipX(false);
    this.setFlipY(direction === DIRECTION.UP);

    // Drag and max velocity apply to the walking axis, so swap them when the
    // walking axis is vertical.
    this.setDrag(isSideways ? 0 : 500, isSideways ? 500 : 0);
    this.setMaxVelocity(isSideways ? 200 : 150, isSideways ? 150 : 200);
    this.setAcceleration(0);

    const { width, height, offsetX, offsetY } = BODY_CONFIG[direction];
    this.body.setSize(width, height);
    this.body.setOffset(offsetX, offsetY);
  }

  private createCursorKeys() {
    return this.scene.input.keyboard!.addKeys(
      'w,a,s,d,up,left,down,right',
    ) as Cursors;
  }

  /**
   * Create the animations we need from the player spritesheet.
   */
  private createAnimations() {
    const anims = this.scene.anims;

    if (!anims.exists(ANIMATION.IDLE)) {
      anims.create({
        key: ANIMATION.IDLE,
        frames: anims.generateFrameNumbers(KEY.SPRITESHEET.PLAYER, {
          start: 0,
          end: 4,
        }),
        frameRate: 6,
        repeat: -1,
      });
    }

    if (!anims.exists(ANIMATION.RUN)) {
      anims.create({
        key: ANIMATION.RUN,
        frames: anims.generateFrameNumbers(KEY.SPRITESHEET.PLAYER, {
          start: 8,
          end: 15,
        }),
        frameRate: 12,
        repeat: -1,
      });
    }
  }

  update() {
    // Only allow the player to jump if they are on the ground (relative to gravity)
    const isOnGround = this.isOnGround();
    const acceleration = isOnGround ? 300 : 100;

    if (isOnGround && this.isJumpPressed()) {
      this.jump();
    }

    const isSideways =
      this.gravityDirection === DIRECTION.LEFT ||
      this.gravityDirection === DIRECTION.RIGHT;
    const walkDirection = this.getWalkDirection();

    // Walk along the axis perpendicular to gravity
    if (isSideways) {
      this.setAccelerationY(walkDirection * acceleration);
    } else {
      this.setAccelerationX(walkDirection * acceleration);
    }

    // Face the direction of travel along the player's local horizontal axis,
    // including when the player is rotated against a wall.
    const left = this.cursors.left.isDown || this.cursors.a.isDown;
    const right = this.cursors.right.isDown || this.cursors.d.isDown;

    if (left) {
      this.setFlipX(true);
    } else if (right) {
      this.setFlipX(false);
    }

    // Update the animation/texture based on the state of the player
    if (isOnGround) {
      const velocity = isSideways ? this.body.velocity.y : this.body.velocity.x;

      this.anims.play(velocity ? ANIMATION.RUN : ANIMATION.IDLE, true);

      if (velocity && !this.walkSound.isPlaying) {
        this.walkSound.play();
      } else if (!velocity && this.walkSound.isPlaying) {
        this.walkSound.stop();
      }

      // Only play a landing sound after a real fall, not when gravity shifts
      // and the player is grounded again a frame later.
      if (
        !this.wasOnGround &&
        this.scene.time.now - this.airborneSince > LAND_MIN_AIRBORNE_MS
      ) {
        this.scene.sound.play(KEY.AUDIO.LAND, { volume: 0.6 });
      }
    } else {
      this.anims.stop();
      this.setTexture(KEY.SPRITESHEET.PLAYER, 10);

      if (this.wasOnGround) {
        this.airborneSince = this.scene.time.now;
      }

      if (this.walkSound.isPlaying) {
        this.walkSound.stop();
      }
    }

    this.wasOnGround = isOnGround;
  }

  private isJumpPressed() {
    // Up always jumps, regardless of the gravity direction
    return this.cursors.up.isDown || this.cursors.w.isDown;
  }

  private getWalkDirection() {
    const left = this.cursors.left.isDown || this.cursors.a.isDown;
    const right = this.cursors.right.isDown || this.cursors.d.isDown;

    // Left/right move the player along their local horizontal axis. When
    // gravity pulls right, the player is rotated so their right is world up.
    switch (this.gravityDirection) {
      case DIRECTION.RIGHT:
        return Number(left) - Number(right);
      case DIRECTION.DOWN:
      case DIRECTION.UP:
      case DIRECTION.LEFT:
        return Number(right) - Number(left);
    }
  }

  private isOnGround() {
    switch (this.gravityDirection) {
      case DIRECTION.DOWN:
        return this.body.blocked.down;
      case DIRECTION.UP:
        return this.body.blocked.up;
      case DIRECTION.LEFT:
        return this.body.blocked.left;
      case DIRECTION.RIGHT:
        return this.body.blocked.right;
    }
  }

  private jump() {
    this.scene.sound.play(KEY.AUDIO.JUMP, { volume: 0.8 });

    switch (this.gravityDirection) {
      case DIRECTION.DOWN:
        this.setVelocityY(-PLAYER_VELOCITY);
        break;
      case DIRECTION.UP:
        this.setVelocityY(PLAYER_VELOCITY);
        break;
      case DIRECTION.LEFT:
        this.setVelocityX(PLAYER_VELOCITY);
        break;
      case DIRECTION.RIGHT:
        this.setVelocityX(-PLAYER_VELOCITY);
        break;
    }
  }
}
