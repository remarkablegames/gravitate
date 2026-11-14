import Phaser from 'phaser';

const RADIUS = 5;
const COLOR = 0xffffff;
const DEPTH = 100;
const FADE_DURATION_MS = 600;

/**
 * A short-lived visual marker placed at a tap location
 * Fades out and destroys itself once the fade completes
 */
export class Marker extends Phaser.GameObjects.Arc {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, RADIUS, 0, 360, false, COLOR);

    scene.add.existing(this);
    this.setDepth(DEPTH);

    scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: FADE_DURATION_MS,
      onComplete: () => {
        this.destroy();
      },
    });
  }
}
