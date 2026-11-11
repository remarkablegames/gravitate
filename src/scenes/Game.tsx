import Phaser from 'phaser';
import { render, useRef } from 'phaser-jsx';

import { HelpText } from '../components';
import {
  DIRECTION,
  KEY,
  LEVELS,
  TILEMAP_LAYER,
  TILEMAP_OBJECT,
  TILESET_NAME,
} from '../constants';
import { Arrow, Exit, Player } from '../sprites';
import type { Direction, Level, TileCollisionObject } from '../types';

const GRAVITY_UPDATE_COOLDOWN_MS = 300;

export class Game extends Phaser.Scene {
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private platformsLayer!: Phaser.Tilemaps.TilemapLayer;
  private spikesLayer!: Phaser.Tilemaps.TilemapLayer;
  private platformHitboxes!: Phaser.Physics.Arcade.StaticGroup;
  private spikeHitboxes!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Player;
  private tileDebugGraphics!: Phaser.GameObjects.Graphics;

  private gravity = 500;
  private gravityDirection: Direction = DIRECTION.DOWN;
  private isPlayerDead = false;
  private lastGravityUpdate = 0;

  private level!: Level;
  private isExiting = false;

  constructor() {
    super(KEY.SCENE.GAME);
  }

  init({ level = 0 }) {
    this.level = LEVELS[level] ?? LEVELS[0];
  }

  create() {
    this.isPlayerDead = false;
    this.isExiting = false;
    this.gravity = this.physics.world.gravity.y;
    this.gravityDirection = DIRECTION.DOWN;

    this.registry.set(KEY.DATA.MUSIC, this.level.music);

    const map = this.make.tilemap({ key: this.level.tilemap });
    const tileset = map.addTilesetImage(TILESET_NAME, KEY.IMAGE.TILES)!;

    // Render background, ground, platforms, spikes, and foreground layers
    const backgroundLayer = map.createLayer(TILEMAP_LAYER.BACKGROUND, tileset);

    this.groundLayer = map.createLayer(
      TILEMAP_LAYER.GROUND,
      tileset,
      undefined,
      undefined,
      false,
    ) as Phaser.Tilemaps.TilemapLayer;

    this.platformsLayer = map.createLayer(
      TILEMAP_LAYER.PLATFORMS,
      tileset,
      undefined,
      undefined,
      false,
    ) as Phaser.Tilemaps.TilemapLayer;

    this.spikesLayer = map.createLayer(
      TILEMAP_LAYER.SPIKES,
      tileset,
      undefined,
      undefined,
      false,
    ) as Phaser.Tilemaps.TilemapLayer;

    const foregroundLayer = map.createLayer(TILEMAP_LAYER.FOREGROUND, tileset);

    // Treat every non-empty ground tile as solid
    this.groundLayer.setCollisionByExclusion([-1, 0]);

    this.renderTileDebug();

    // Render arrows
    const arrows: Arrow[] = [];
    map.getObjectLayer('Objects')?.objects.forEach((obj) => {
      if (obj.type === TILEMAP_OBJECT.ARROW) {
        arrows.push(
          new Arrow(this, obj.x!, obj.y!, obj.name.toLowerCase() as Direction),
        );
      }
    });

    // Spawn player
    const spawnPoint = map.findObject(
      TILEMAP_LAYER.OBJECTS,
      ({ name }) => name === TILEMAP_OBJECT.SPAWN,
    )!;
    this.player = new Player(this, spawnPoint.x!, spawnPoint.y!);

    // Collide player against ground layer
    this.physics.world.addCollider(this.player, this.groundLayer);

    // Collide player against platforms using each tile's collision box
    this.platformHitboxes = this.createTileHitboxes(this.platformsLayer);
    this.physics.world.addCollider(this.player, this.platformHitboxes);

    // Kill player when they touch a spike
    this.spikeHitboxes = this.createTileHitboxes(this.spikesLayer);
    this.physics.world.addOverlap(
      this.player,
      this.spikeHitboxes,
      this.killPlayer,
    );

    // Place exit
    const exits: Exit[] = [];
    map.getObjectLayer(TILEMAP_LAYER.OBJECTS)?.objects.forEach((obj) => {
      if (obj.name === TILEMAP_OBJECT.EXIT) {
        exits.push(new Exit(this, obj.x!, obj.y!, obj.rotation ?? 0));
      }
    });

    // Go to next level when player reaches exit
    this.physics.world.addOverlap(exits, this.player, this.handleExit);

    // Change gravity direction when player touches arrow
    this.physics.world.addOverlap(arrows, this.player, this.handleArrow);

    this.fitCameraToMap(map);

    this.renderHelpText(
      backgroundLayer,
      this.groundLayer,
      this.platformsLayer,
      this.spikesLayer,
      foregroundLayer,
      ...arrows,
    );
  }

  /**
   * Create invisible static bodies from the collision boxes defined for each tile in the tileset.
   *
   * @param layer - The Tilemap layer.
   * @param fallbackToTileBounds - Whether tiles without a collision hitbox should fall back to the full tile bounds.
   */
  private createTileHitboxes(
    layer: Phaser.Tilemaps.TilemapLayer,
    fallbackToTileBounds = true,
  ) {
    const hitboxes = this.physics.add.staticGroup();

    layer.forEachTile((tile) => {
      if (tile.index < 0) {
        return;
      }

      const collisionObject = this.getTileCollisionObject(tile);
      if (!collisionObject && !fallbackToTileBounds) {
        return;
      }

      const bounds = collisionObject
        ? this.getTileCollisionBounds(layer, tile, collisionObject)
        : this.getTileBounds(layer, tile);

      const hitbox = this.add.zone(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.width,
        bounds.height,
      );

      this.physics.add.existing(hitbox, true);
      hitboxes.add(hitbox);
    });

    return hitboxes;
  }

  private getTileCollisionObject(tile: Phaser.Tilemaps.Tile) {
    const tileData = tile.getTileData() as {
      objectgroup?: { objects: TileCollisionObject[] };
    } | null;

    const tileObject = tileData?.objectgroup?.objects[0];
    if (!tileObject?.width || !tileObject.height) {
      return null;
    }

    return tileObject;
  }

  private getTileCollisionBounds(
    layer: Phaser.Tilemaps.TilemapLayer,
    tile: Phaser.Tilemaps.Tile,
    tileObject: TileCollisionObject,
  ) {
    const halfWidth = tile.baseWidth / 2;
    const halfHeight = tile.baseHeight / 2;

    // Tiled collision objects are relative to the tile's top-left. Work in
    // tile-center coordinates so the box can be flipped and rotated the same
    // way the tile is rendered.
    let left = tileObject.x - halfWidth;
    let right = left + tileObject.width;
    let top = tileObject.y - halfHeight;
    let bottom = top + tileObject.height;

    if (tile.flipX) {
      [left, right] = [-right, -left];
    }

    if (tile.flipY) {
      [top, bottom] = [-bottom, -top];
    }

    if (tile.rotation !== 0) {
      const cos = Math.cos(tile.rotation);
      const sin = Math.sin(tile.rotation);
      const corners: [number, number][] = [
        [left, top],
        [right, top],
        [right, bottom],
        [left, bottom],
      ];
      const rotated = corners.map(([x, y]) => ({
        x: x * cos - y * sin,
        y: x * sin + y * cos,
      }));

      left = Math.min(...rotated.map(({ x }) => x));
      right = Math.max(...rotated.map(({ x }) => x));
      top = Math.min(...rotated.map(({ y }) => y));
      bottom = Math.max(...rotated.map(({ y }) => y));
    }

    const origin = layer.tileToWorldXY(tile.x, tile.y);

    return {
      x: origin.x + left + halfWidth,
      y: origin.y + top + halfHeight,
      width: right - left,
      height: bottom - top,
    };
  }

  private getTileBounds(
    layer: Phaser.Tilemaps.TilemapLayer,
    tile: Phaser.Tilemaps.Tile,
  ) {
    const origin = layer.tileToWorldXY(tile.x, tile.y);

    return {
      x: origin.x,
      y: origin.y,
      width: tile.baseWidth,
      height: tile.baseHeight,
    };
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

  private handleArrow = (
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

    const arrowDirection = (arrow as Arrow).direction;
    if (this.gravityDirection === arrowDirection) {
      return;
    }

    this.sound.play(KEY.AUDIO.SHIFT, { volume: 0.6 });
    this.gravityDirection = arrowDirection;

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

    this.player.setGravityDirection(this.gravityDirection);
  };

  private handleExit = () => {
    if (this.isExiting) {
      return;
    }

    this.isExiting = true;
    this.sound.stopByKey(KEY.AUDIO.WALK);
    this.sound.play(KEY.AUDIO.EXIT, { volume: 0.7 });
    this.cameras.main.fade(250, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      const nextLevel = this.level.level + 1;
      this.scene.start(KEY.SCENE.GAME, { level: nextLevel });
    });
  };

  private killPlayer = () => {
    if (this.isPlayerDead || this.isExiting) {
      return;
    }

    this.isPlayerDead = true;
    this.sound.stopByKey(KEY.AUDIO.WALK);
    this.sound.play(KEY.AUDIO.DEATH, { volume: 0.6 });
    this.cameras.main.shake(100, 0.001);
    this.cameras.main.fade(250, 0, 0, 0);

    // Freeze player to leave them on the screen while fading
    this.player.body.moves = false;

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.player.destroy();
      this.scene.restart();
    });
  };

  private renderHelpText(...ignoreList: Phaser.GameObjects.GameObject[]) {
    const helpTextRef = useRef<Phaser.GameObjects.Text>();
    render(<HelpText ref={helpTextRef} text={this.level.helpText} />, this);

    const helpText = helpTextRef.current;
    if (!helpText) {
      return;
    }

    // Keep help text at a fixed screen size regardless of camera zoom
    const uiCamera = this.cameras.add(
      0,
      0,
      this.scale.width,
      this.scale.height,
    );
    this.cameras.main.ignore(helpText);
    uiCamera.ignore(ignoreList.concat(this.player));

    // Don't draw a second copy of every body since physics debug graphic is a world-space object
    if (this.physics.world.drawDebug) {
      uiCamera.ignore(this.physics.world.debugGraphic);
      uiCamera.ignore(this.tileDebugGraphics);
    }
  }

  /**
   * Debug graphic for tile collision boxes (only draws when physics debug is enabled).
   */
  private renderTileDebug() {
    this.tileDebugGraphics = this.add.graphics();
    this.tileDebugGraphics.setVisible(false);

    // F1 toggles the tile debug overlay
    const tileDebugKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.F1,
    );

    tileDebugKey.on('down', () => {
      this.tileDebugGraphics.setVisible(!this.tileDebugGraphics.visible);

      if (this.tileDebugGraphics.visible) {
        this.tileDebugGraphics.clear();
        this.groundLayer.renderDebug(this.tileDebugGraphics);
      }
    });
  }

  update() {
    if (this.isPlayerDead || this.isExiting) {
      return;
    }

    this.player.update();

    if (this.player.y > this.groundLayer.height) {
      this.killPlayer();
    }
  }
}
