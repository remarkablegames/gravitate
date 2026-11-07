import Phaser from 'phaser';

import { DIRECTION, type Direction, KEY } from '../constants';

const ANIMATION = {
  IDLE: 'IDLE',
  RUN: 'RUN',
};

type Cursors = Record<
  'w' | 'a' | 's' | 'd' | 'up' | 'left' | 'down' | 'right',
  Phaser.Input.Keyboard.Key
>;

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private cursors: Cursors;
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
    this.createAnimations();
    this.enablePhysics();
  }

  private enablePhysics() {
    this.scene.physics.world.enable(this);

    this.setDrag(500, 0)
      .setMaxVelocity(150, 200)
      .setSize(14, 16)
      .setOffset(8, 7);

    this.scene.add.existing(this);
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
        frameRate: 3,
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
    const acceleration = this.body.blocked.down ? 300 : 100;

    // Only allow the player to jump if they are on the ground (relative to gravity)
    const isOnGround = this.isOnGround();
    const jumpKey = this.cursors.up.isDown || this.cursors.w.isDown;

    if (isOnGround && jumpKey) {
      this.jump();
    }

    // Apply horizontal acceleration when left or right are applied
    switch (true) {
      case this.cursors.left.isDown:
      case this.cursors.a.isDown:
        this.setFlipX(true);
        this.setAccelerationX(-acceleration);
        break;

      case this.cursors.right.isDown:
      case this.cursors.d.isDown:
        this.setFlipX(false);
        this.setAccelerationX(acceleration);
        break;

      default:
        this.setAccelerationX(0);
    }

    // Update the animation/texture based on the state of the player
    if (isOnGround) {
      this.anims.play(
        this.body.velocity.x ? ANIMATION.RUN : ANIMATION.IDLE,
        true,
      );
    } else {
      this.anims.stop();
      this.setTexture(KEY.SPRITESHEET.PLAYER, 10);
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
    switch (this.gravityDirection) {
      case DIRECTION.DOWN:
        this.setVelocityY(-250);
        break;
      case DIRECTION.UP:
        this.setVelocityY(250);
        break;
      case DIRECTION.LEFT:
        this.setVelocityX(250);
        break;
      case DIRECTION.RIGHT:
        this.setVelocityX(-250);
        break;
    }
  }
}
