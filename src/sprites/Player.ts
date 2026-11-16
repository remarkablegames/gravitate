import Phaser from 'phaser';

import { DIRECTION, GRAVITY, KEY } from '../constants';
import type { Game } from '../scenes/Game';
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
const LAND_SQUASH_SCALE_X = 1.1;
const LAND_SQUASH_SCALE_Y = 0.85;
const LAND_SQUASH_DURATION_MS = 80;
const DUST_FEET_OFFSET_PX = 7;
const WALK_THRESHOLD_PX = 4;
const DECELERATION_DISTANCE_PX = 40;
const WALK_SOUND_VOLUME = 0.3;
const GRAVITY_TWEEN_DURATION_MS = 180;
const GRAVITY_FLIP_SCALE = 0.05;
const CAMERA_FADE_DURATION = 250;

/**
 * Collision box (size and offset) for each gravity direction,
 * aligned to the player sprite after it's rotated/flipped to match the gravity
 */
const BODY_CONFIG = {
  [DIRECTION.DOWN]: { width: 6, height: 13, offsetX: 13, offsetY: 10 },
  [DIRECTION.UP]: { width: 6, height: 13, offsetX: 13, offsetY: 9 },
  [DIRECTION.LEFT]: { width: 13, height: 6, offsetX: 9, offsetY: 13 },
  [DIRECTION.RIGHT]: { width: 13, height: 6, offsetX: 10, offsetY: 13 },
} as const;

const GRAVITY_ROTATION = {
  [DIRECTION.DOWN]: 0,
  [DIRECTION.UP]: 0,
  [DIRECTION.LEFT]: Math.PI / 2,
  [DIRECTION.RIGHT]: -Math.PI / 2,
} as const;

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  declare scene: Game;

  isExiting = false;
  isDead = false;
  isShifting = false;

  private cursors;
  private game;
  private walkSound;
  private gravityTween?: Phaser.Tweens.Tween;
  private squashTween?: Phaser.Tweens.Tween;
  private squashBody?: {
    width: number;
    height: number;
    anchorX: number;
    anchorY: number;
  };

  private wasOnGround = true;
  private airborneSince = 0;
  private walkTarget: { x: number; y: number } | null = null;

  constructor(
    scene: Game,
    x: number,
    y: number,
    texture = KEY.SPRITESHEET.PLAYER,
    frame = 0,
  ) {
    super(scene, x, y, texture, frame);

    this.game = scene;
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
    const { gravityDirection } = this.scene;

    // Rotate/flip the sprite and resize the collision box
    // so the player stands on the surface the gravity is pulling them towards
    this.applyGravityPhysics(gravityDirection);
    this.stopGravityTween();

    this.setRotation(GRAVITY_ROTATION[gravityDirection]);
    this.setFlipX(false);
    this.setFlipY(gravityDirection === DIRECTION.UP);
  }

  /**
   * Apply the new gravity physics and animate the visual rotation/flip
   *
   * @param previousDirection - The previous gravity direction
   * @param newDirection - The new gravity direction
   */
  setGravityDirection(previousDirection: Direction, newDirection: Direction) {
    if (previousDirection === newDirection) {
      return;
    }

    this.stopSquash();
    this.applyGravityPhysics(newDirection);
    this.stopGravityTween();

    this.isShifting = true;
    this.setFlipX(false);

    const targetRotation = GRAVITY_ROTATION[newDirection];
    const targetFlipY = newDirection === DIRECTION.UP;

    const onComplete = () => {
      this.setRotation(targetRotation);
      this.setFlipY(targetFlipY);
      this.isShifting = false;
      this.gravityTween = undefined;
    };

    // Up and down share the same rotation, so fold the sprite to make the
    // flip read clearly instead of snapping it upside down
    const shouldFold =
      (previousDirection === DIRECTION.UP ||
        previousDirection === DIRECTION.DOWN) &&
      targetRotation === 0 &&
      this.rotation === 0;

    if (shouldFold) {
      this.gravityTween = this.scene.tweens.add({
        targets: this,
        scaleY: GRAVITY_FLIP_SCALE,
        duration: GRAVITY_TWEEN_DURATION_MS / 2,
        ease: 'Sine.InOut',
        yoyo: true,
        onYoyo: () => this.setFlipY(targetFlipY),
        onComplete,
      });
      return;
    }

    this.setFlipY(targetFlipY);
    this.gravityTween = this.scene.tweens.add({
      targets: this,
      rotation: targetRotation,
      duration: GRAVITY_TWEEN_DURATION_MS,
      ease: 'Sine.InOut',
      onComplete,
    });
  }

  /**
   * Configure drag, velocity, and collision bounds for the new gravity direction
   */
  private applyGravityPhysics(direction: Direction) {
    const isSideways =
      direction === DIRECTION.LEFT || direction === DIRECTION.RIGHT;

    // Drag and max velocity apply to the walking axis, so swap them when the
    // walking axis is vertical
    this.setDrag(isSideways ? 0 : 500, isSideways ? 500 : 0);
    this.setMaxVelocity(isSideways ? 200 : 150, isSideways ? 150 : 200);
    this.setAcceleration(0);

    const { width, height, offsetX, offsetY } = BODY_CONFIG[direction];
    this.body.setSize(width, height);
    this.body.setOffset(offsetX, offsetY);
  }

  private stopGravityTween() {
    this.gravityTween?.stop();
    this.gravityTween = undefined;
    this.isShifting = false;
  }

  setWalkTarget(x: number, y: number) {
    this.walkTarget = { x, y };
  }

  clearWalkTarget() {
    this.walkTarget = null;
  }

  private createCursorKeys() {
    return this.scene.input.keyboard!.addKeys(
      'w,a,s,d,up,left,down,right',
    ) as Cursors;
  }

  /**
   * Create the animations from the player spritesheet
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

  private isJumpPressed() {
    // Up always jumps, regardless of the gravity direction
    return this.cursors.up.isDown || this.cursors.w.isDown;
  }

  private getWalkDirection() {
    const left = this.cursors.left.isDown || this.cursors.a.isDown;
    const right = this.cursors.right.isDown || this.cursors.d.isDown;

    // Left/right move the player along their local horizontal axis
    // When gravity pulls right, the player is rotated so their right is world up
    switch (this.scene.gravityDirection) {
      case DIRECTION.RIGHT:
        return Number(left) - Number(right);

      case DIRECTION.DOWN:
      case DIRECTION.UP:
      case DIRECTION.LEFT:
        return Number(right) - Number(left);
    }
  }

  private getWalkDirectionToTarget() {
    if (!this.walkTarget) {
      return 0;
    }

    switch (this.scene.gravityDirection) {
      case DIRECTION.LEFT:
      case DIRECTION.RIGHT:
        return (
          Number(this.walkTarget.y > this.y) -
          Number(this.walkTarget.y < this.y)
        );

      case DIRECTION.DOWN:
      case DIRECTION.UP:
        return (
          Number(this.walkTarget.x > this.x) -
          Number(this.walkTarget.x < this.x)
        );
    }
  }

  private isOnGround() {
    switch (this.scene.gravityDirection) {
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

  /**
   * Emit dust particles when the player jumps/lands
   */
  private emitDust() {
    const { x, y } = this.getFeetPosition();
    this.scene.particles.emitPlayerDust(x, y, this.scene.gravityDirection);
  }

  private getFeetPosition() {
    const { x, y } = GRAVITY.VECTOR[this.scene.gravityDirection];
    return {
      x: this.body.center.x + x * DUST_FEET_OFFSET_PX,
      y: this.body.center.y + y * DUST_FEET_OFFSET_PX,
    };
  }

  /**
   * Squash the sprite on landing
   */
  private squash() {
    if (this.isShifting || this.gravityTween) {
      return;
    }

    this.stopSquash();

    // Arcade bodies scale with their sprite,
    // so pin the body's world size and position while the visual scale animates
    const { width, height } = this.body;
    this.squashBody = {
      width,
      height,
      anchorX: this.body.offset.x - this.displayOriginX,
      anchorY: this.body.offset.y - this.displayOriginY,
    };

    this.setScale(LAND_SQUASH_SCALE_X, LAND_SQUASH_SCALE_Y);
    this.syncSquashBody();

    this.squashTween = this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: LAND_SQUASH_DURATION_MS,
      ease: 'Quad.Out',
      onUpdate: () => {
        this.syncSquashBody();
      },
      onComplete: () => {
        this.squashTween = undefined;
        this.restoreSquashBody();
      },
    });
  }

  private stopSquash() {
    if (!this.squashBody) {
      return;
    }

    this.squashTween?.stop();
    this.squashTween = undefined;
    this.setScale(1);
    this.restoreSquashBody();
  }

  /**
   * Keep the physics body at its pre-squash size and position
   */
  private syncSquashBody() {
    const body = this.squashBody;
    if (!body) {
      return;
    }

    const scaleX = Math.abs(this.scaleX);
    const scaleY = Math.abs(this.scaleY);
    this.body.setSize(body.width / scaleX, body.height / scaleY, false);
    this.body.setOffset(
      this.displayOriginX + body.anchorX / scaleX,
      this.displayOriginY + body.anchorY / scaleY,
    );
  }

  private restoreSquashBody() {
    const body = this.squashBody;
    if (!body) {
      return;
    }

    this.squashBody = undefined;
    this.body.setSize(body.width, body.height, false);
    this.body.setOffset(
      this.displayOriginX + body.anchorX,
      this.displayOriginY + body.anchorY,
    );
  }

  jump() {
    if (!this.isOnGround()) {
      return;
    }

    this.stopSquash();
    this.scene.sound.play(KEY.AUDIO.JUMP, { volume: 0.8 });
    this.emitDust();

    switch (this.scene.gravityDirection) {
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

  /**
   * Player dies when it collides with spikes or is out of bounds
   */
  kill = () => {
    if (this.isDead || this.isExiting) {
      return;
    }

    this.isDead = true;
    this.setTintMode(Phaser.TintModes.FILL);
    this.scene.sound.stopByKey(KEY.AUDIO.WALK);
    this.scene.sound.play(KEY.AUDIO.DEATH, { volume: 0.6 });
    this.scene.cameras.main.shake(100, 0.001);
    this.scene.cameras.main.fade(CAMERA_FADE_DURATION, 0, 0, 0);

    // Freeze player to leave them on the screen while fading
    this.body.moves = false;

    this.scene.cameras.main.once('camerafadeoutcomplete', () => {
      this.destroy();
      this.game.scene.restart();
    });
  };

  /**
   * Player beats level when it reaches the blue portal
   */
  exit = () => {
    if (this.isDead || this.isExiting) {
      return;
    }

    this.isExiting = true;

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: CAMERA_FADE_DURATION / 2,
    });

    this.scene.sound.stopByKey(KEY.AUDIO.WALK);
    this.scene.sound.play(KEY.AUDIO.EXIT, { volume: 0.7 });
    this.scene.cameras.main.fade(CAMERA_FADE_DURATION, 0, 0, 0);

    this.scene.cameras.main.once('camerafadeoutcomplete', () => {
      const nextLevel = this.scene.level.level + 1;
      this.game.scene.start(KEY.SCENE.GAME, { level: nextLevel });
    });
  };

  /**
   * Update lifecycle
   */
  update() {
    // Allow the player to jump if they're on the ground (relative to gravity)
    const isOnGround = this.isOnGround();
    const acceleration = isOnGround ? 300 : 100;

    if (this.isJumpPressed()) {
      this.jump();
    }

    const { gravityDirection } = this.scene;
    const isSideways =
      gravityDirection === DIRECTION.LEFT ||
      gravityDirection === DIRECTION.RIGHT;
    const walkDirection = this.walkTarget
      ? this.getWalkDirectionToTarget()
      : this.getWalkDirection();

    // Ease into the target: scale down acceleration as the player approaches,
    // so they settle on the marker instead of overshooting it due to momentum
    let targetAcceleration = walkDirection * acceleration;
    if (this.walkTarget) {
      const distance = isSideways
        ? Math.abs(this.y - this.walkTarget.y)
        : Math.abs(this.x - this.walkTarget.x);
      const ease = Phaser.Math.Clamp(distance / DECELERATION_DISTANCE_PX, 0, 1);
      targetAcceleration *= ease;
    }

    // Walk along the axis perpendicular to gravity
    if (isSideways) {
      this.setAccelerationY(targetAcceleration);
    } else {
      this.setAccelerationX(targetAcceleration);
    }

    // Clear the walk target once the player reaches it on the walking axis,
    // zeroing walking-axis velocity so they stop on the marker
    if (this.walkTarget) {
      const reached = isSideways
        ? Math.abs(this.y - this.walkTarget.y) <= WALK_THRESHOLD_PX
        : Math.abs(this.x - this.walkTarget.x) <= WALK_THRESHOLD_PX;
      if (reached) {
        if (isSideways) {
          this.setVelocityY(0);
        } else {
          this.setVelocityX(0);
        }
        this.clearWalkTarget();
      }
    }

    // Face the direction of travel along the player's local horizontal axis, including when the player is rotated against a wall
    // Skip this while the gravity tween is running so the sprite doesn't flip mid-rotation
    if (!this.isShifting) {
      const left = this.cursors.left.isDown || this.cursors.a.isDown;
      const right = this.cursors.right.isDown || this.cursors.d.isDown;

      if (
        gravityDirection === DIRECTION.DOWN ||
        gravityDirection === DIRECTION.UP
      ) {
        let travelDirection = right ? 1 : left ? -1 : 0;

        if (this.walkTarget) {
          travelDirection =
            this.walkTarget.x > this.x
              ? 1
              : this.walkTarget.x < this.x
                ? -1
                : 0;
        }

        switch (travelDirection) {
          case 1:
            this.setFlipX(false);
            break;

          case -1:
            this.setFlipX(true);
            break;
        }
      } else {
        if (this.walkTarget) {
          const travelDirection =
            this.walkTarget.y > this.y
              ? 1
              : this.walkTarget.y < this.y
                ? -1
                : 0;

          if (gravityDirection === DIRECTION.LEFT) {
            switch (travelDirection) {
              case 1:
                this.setFlipX(false);
                break;

              case -1:
                this.setFlipX(true);
                break;
            }
          } else {
            switch (travelDirection) {
              case 1:
                this.setFlipX(true);
                break;

              case -1:
                this.setFlipX(false);
                break;
            }
          }
        } else if (left) {
          this.setFlipX(true);
        } else if (right) {
          this.setFlipX(false);
        }
      }
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
      // and the player is grounded again a frame later
      if (
        !this.wasOnGround &&
        this.scene.time.now - this.airborneSince > LAND_MIN_AIRBORNE_MS
      ) {
        this.scene.sound.play(KEY.AUDIO.LAND, { volume: 0.6 });
        this.emitDust();
        this.squash();
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
}
