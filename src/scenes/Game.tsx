import Phaser from 'phaser';
import { render } from 'phaser-jsx';
import type { RefObject } from 'react';

import { HelpText } from '../components';
import {
  DIRECTION,
  type Direction,
  KEY,
  TILEMAP_LAYER,
  TILEMAP_OBJECT,
  TILESET_NAME,
} from '../constants';
import { Arrow, Player } from '../sprites';

const GRAVITY_UPDATE_COOLDOWN_MS = 500;

export class Game extends Phaser.Scene {
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private player!: Player;

  private gravity = 500;
  private gravityDirection: Direction = DIRECTION.DOWN;
  private isPlayerDead = false;
  private lastGravityUpdate = 0;

  constructor() {
    super(KEY.SCENE.GAME);
  }

  create() {
    this.isPlayerDead = false;

    const map = this.make.tilemap({ key: KEY.TILEMAP.LEVEL_0 });
    const tileset = map.addTilesetImage(TILESET_NAME, KEY.IMAGE.TILES)!;

    // Render background, ground, and foreground layers
    const backgroundLayer = map.createLayer(TILEMAP_LAYER.BACKGROUND, tileset);
    this.groundLayer = map.createLayer(
      TILEMAP_LAYER.GROUND,
      tileset,
      undefined,
      undefined,
      false,
    ) as Phaser.Tilemaps.TilemapLayer;
    const foregroundLayer = map.createLayer(TILEMAP_LAYER.FOREGROUND, tileset);

    this.gravity = this.physics.world.gravity.y;

    // Render arrows
    const arrows: Arrow[] = [];
    map.getObjectLayer('Objects')?.objects.forEach((obj) => {
      if (obj.type === TILEMAP_OBJECT.ARROW) {
        arrows.push(
          new Arrow(this, obj.x!, obj.y!, obj.name.toLowerCase() as Direction),
        );
      }
    });

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

    // Overlap arrows with the player to change gravity direction
    this.physics.world.addOverlap(
      arrows,
      this.player,
      this.handleArrowCollision,
    );

    this.fitCameraToMap(map);

    this.createHelpText(
      backgroundLayer,
      this.groundLayer,
      foregroundLayer,
      ...arrows,
    );
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

  private handleArrowCollision = (
    arrow:
      | Phaser.Types.Physics.Arcade.GameObjectWithBody
      | Phaser.Physics.Arcade.Body
      | Phaser.Physics.Arcade.StaticBody
      | Phaser.Tilemaps.Tile,
  ) => {
    const { now } = this.time;
    if (now - this.lastGravityUpdate < GRAVITY_UPDATE_COOLDOWN_MS) {
      return;
    }
    this.lastGravityUpdate = now;
    this.gravityDirection = (arrow as Arrow).direction;

    switch (this.gravityDirection) {
      case DIRECTION.DOWN:
        this.physics.world.gravity.set(0, this.gravity);
        break;
      case DIRECTION.UP:
        this.physics.world.gravity.set(0, -this.gravity);
        break;
      case DIRECTION.LEFT:
        this.physics.world.gravity.set(-this.gravity, 0);
        break;
      case DIRECTION.RIGHT:
        this.physics.world.gravity.set(this.gravity, 0);
        break;
    }

    this.player.gravityDirection = this.gravityDirection;
    this.player.toggleFlipY();
  };

  private createHelpText(...ignoreList: Phaser.GameObjects.GameObject[]) {
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
    uiCamera.ignore(ignoreList.concat(this.player));

    // The physics debug graphic is a world-space object, so the UI camera would
    // draw a second copy of every body at the top-left of the screen
    if (this.physics.world.drawDebug) {
      uiCamera.ignore(this.physics.world.debugGraphic);
    }
  }

  update() {
    if (this.isPlayerDead) {
      return;
    }

    this.player.update();

    if (this.player.y > this.groundLayer.height) {
      // Flag that the player is dead so that we can stop update from running
      this.isPlayerDead = true;

      this.cameras.main.shake(100, 0.05);
      this.cameras.main.fade(250, 0, 0, 0);

      // Freeze the player to leave them on the screen while fading
      this.player.body.moves = false;

      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.player.destroy();
        this.scene.restart();
      });
    }
  }
}
