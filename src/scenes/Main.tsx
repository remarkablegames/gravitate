import Phaser from 'phaser';
import { render } from 'phaser-jsx';
import type { RefObject } from 'react';

import { HelpText } from '../components';
import { KEY, TILEMAP_LAYER, TILEMAP_OBJECT, TILESET_NAME } from '../constants';
import { Player } from '../sprites';

export class Main extends Phaser.Scene {
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private player!: Player;
  private isPlayerDead = false;

  constructor() {
    super(KEY.SCENE.MAIN);
  }

  create() {
    this.isPlayerDead = false;

    const map = this.make.tilemap({ key: KEY.TILEMAP.LEVEL_0 });
    const tileset = map.addTilesetImage(TILESET_NAME, KEY.IMAGE.TILES)!;

    const backgroundLayer = map.createLayer(TILEMAP_LAYER.BACKGROUND, tileset);
    this.groundLayer = map.createLayer(
      TILEMAP_LAYER.GROUND,
      tileset,
      undefined,
      undefined,
      false,
    ) as Phaser.Tilemaps.TilemapLayer;
    const foregroundLayer = map.createLayer(TILEMAP_LAYER.FOREGROUND, tileset);

    // Treat every non-empty Ground tile as solid
    this.groundLayer.setCollisionByExclusion([-1, 0]);

    // Instantiate a player instance at the location of the "Spawn" object in the Tiled map
    const spawnPoint = map.findObject(
      TILEMAP_LAYER.OBJECTS,
      ({ name }) => name === TILEMAP_OBJECT.SPAWN,
    )!;
    this.player = new Player(this, spawnPoint.x!, spawnPoint.y!);

    // Collide the player against the ground layer
    this.physics.world.addCollider(this.player, this.groundLayer);

    this.fitCameraToMap(map);

    this.createHelpText(backgroundLayer, foregroundLayer);
  }

  private fitCameraToMap(map: Phaser.Tilemaps.Tilemap) {
    const camera = this.cameras.main;
    const fitZoom = Math.min(
      this.scale.width / map.widthInPixels,
      this.scale.height / map.heightInPixels,
    );
    const zoom = Phaser.Math.Clamp(fitZoom, 1, 4);

    camera.setZoom(zoom);

    if (fitZoom >= 1) {
      camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
    } else {
      camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
      camera.startFollow(this.player);
    }
  }

  private createHelpText(
    backgroundLayer: Phaser.GameObjects.GameObject,
    foregroundLayer: Phaser.GameObjects.GameObject,
  ) {
    const helpTextRef: RefObject<Phaser.GameObjects.Text | null> = {
      current: null,
    };
    render(<HelpText ref={helpTextRef} />, this);

    const helpText = helpTextRef.current;
    if (!helpText) {
      return;
    }

    // Keep the help text at a fixed screen size regardless of the camera zoom
    const uiCamera = this.cameras.add(
      0,
      0,
      this.scale.width,
      this.scale.height,
    );
    this.cameras.main.ignore(helpText);
    uiCamera.ignore([
      backgroundLayer,
      this.groundLayer,
      foregroundLayer,
      this.player,
    ]);
  }

  update() {
    if (this.isPlayerDead) {
      return;
    }

    this.player.update();

    if (this.player.y > this.groundLayer.height) {
      // Flag that the player is dead so that we can stop update from running in the future
      this.isPlayerDead = true;

      this.cameras.main.shake(100, 0.05);
      this.cameras.main.fade(250, 0, 0, 0);

      // Freeze the player to leave them on screen while fading but remove the marker immediately
      this.player.freeze();

      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.player.destroy();
        this.scene.restart();
      });
    }
  }
}
