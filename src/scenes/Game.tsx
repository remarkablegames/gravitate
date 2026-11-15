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
import { Arrow, Exit, Marker, Player } from '../sprites';
import type { Direction, Level, TileCollisionObject } from '../types';

const GRAVITY_UPDATE_COOLDOWN_MS = 300;
const DOUBLE_TAP_THRESHOLD_MS = 300;
const BACKGROUND_DEPTH = -3;
const AMBIENT_DUST_DEPTH = -2;
const SHIFT_EFFECT_DEPTH = -1;
const SHIFT_STREAK_COUNT = 20;
const SHIFT_STREAK_ANGLE_SPREAD = 12;
const SHIFT_STREAK_SPEED_MIN = 50;
const SHIFT_STREAK_SPEED_MAX = 100;

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

const GRAVITY_VECTOR: Record<Direction, { x: number; y: number }> = {
  [DIRECTION.DOWN]: { x: 0, y: 1 },
  [DIRECTION.UP]: { x: 0, y: -1 },
  [DIRECTION.LEFT]: { x: -1, y: 0 },
  [DIRECTION.RIGHT]: { x: 1, y: 0 },
};

const GRAVITY_STREAK_ANGLE: Record<Direction, number> = {
  [DIRECTION.DOWN]: 90,
  [DIRECTION.UP]: -90,
  [DIRECTION.LEFT]: 180,
  [DIRECTION.RIGHT]: 0,
};

export class Game extends Phaser.Scene {
  private groundLayer!: Phaser.Tilemaps.TilemapLayer;
  private platformsLayer!: Phaser.Tilemaps.TilemapLayer;
  private spikesLayer!: Phaser.Tilemaps.TilemapLayer;
  private platformHitboxes!: Phaser.Physics.Arcade.StaticGroup;
  private spikeHitboxes!: Phaser.Physics.Arcade.StaticGroup;
  private player!: Player;
  private ambientEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private shiftEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private tileDebugGraphics!: Phaser.GameObjects.Graphics;
  private uiCamera?: Phaser.Cameras.Scene2D.Camera;

  private gravity = 500;
  private gravityDirection: Direction = DIRECTION.DOWN;
  private isPlayerDead = false;
  private isShifting = false;
  private lastGravityUpdate = 0;
  private lastTap = { time: 0, x: 0, y: 0 };

  private level!: Level;
  private isExiting = false;

  constructor() {
    super(KEY.SCENE.GAME);
  }

  init({ level = 0 }) {
    this.level = LEVELS[level] ?? LEVELS[0];
  }

  preload() {
    // Make sure the current level is available. Boot loads the initial one, and
    // later levels are usually prefetched while the previous level is playing,
    // but a quick exit can shut the loader down before it finishes.
    const { tilemap } = this.level;
    if (!this.cache.tilemap.exists(tilemap)) {
      this.load.tilemapTiledJSON(tilemap, `tilemaps/${tilemap}.json`);
    }
  }

  create() {
    this.isPlayerDead = false;
    this.isExiting = false;
    this.isShifting = false;
    this.gravity = this.physics.world.gravity.y;
    this.gravityDirection = DIRECTION.DOWN;

    this.registry.set(KEY.DATA.MUSIC, this.level.music);

    // Load the next level in the background while this one is being played
    this.prefetchNextLevel();

    this.createParticleTexture();

    const map = this.make.tilemap({ key: this.level.tilemap });
    const tileset = map.addTilesetImage(TILESET_NAME, KEY.IMAGE.TILES)!;

    // Render background, ground, platforms, spikes, and foreground layers
    const backgroundLayer = map.createLayer(TILEMAP_LAYER.BACKGROUND, tileset);
    backgroundLayer.setDepth(BACKGROUND_DEPTH);

    this.createAmbientEmitter(map);
    this.createShiftEmitter(map);

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

    // Pointer (touch/mouse) input: tap to walk, double-tap to jump
    this.input.on('pointerdown', this.handlePointerDown);

    this.fitCameraToMap(map);

    this.renderHelpText(backgroundLayer, foregroundLayer, ...arrows);
  }

  /**
   * Start loading the next level's tilemap without blocking this scene.
   */
  private prefetchNextLevel() {
    const { tilemap } = LEVELS[this.level.level + 1] ?? {};
    if (!tilemap || this.cache.tilemap.exists(tilemap)) {
      return;
    }

    this.load.tilemapTiledJSON(tilemap, `tilemaps/${tilemap}.json`);
    this.load.start();
  }

  /**
   * Generate the small square texture shared by particle effects
   */
  private createParticleTexture() {
    if (this.textures.exists(KEY.TEXTURE.PARTICLE)) {
      return;
    }

    const graphics = this.make.graphics({}, false);
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, 0, 2, 2);
    graphics.generateTexture(KEY.TEXTURE.PARTICLE, 2, 2);
    graphics.destroy();
  }

  /**
   * Random emit zone covering the whole room.
   */
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
   * Always-on dust that drifts through the room and slowly follows gravity
   */
  private createAmbientEmitter(map: Phaser.Tilemaps.Tilemap) {
    const { x, y } = GRAVITY_VECTOR[this.gravityDirection];

    this.ambientEmitter = this.add.particles(0, 0, KEY.TEXTURE.PARTICLE, {
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

    this.ambientEmitter.setDepth(AMBIENT_DUST_DEPTH);
  }

  /**
   * Emitter for the dust gust that sweeps across the room when gravity shifts
   */
  private createShiftEmitter(map: Phaser.Tilemaps.Tilemap) {
    this.shiftEmitter = this.add.particles(0, 0, KEY.TEXTURE.PARTICLE, {
      emitting: false,
      lifespan: { min: 240, max: 380 },
      speed: SHIFT_STREAK_SPEED_MIN,
      angle: GRAVITY_STREAK_ANGLE[this.gravityDirection],
      alpha: { start: AMBIENT_DUST.ALPHA, end: 0 },
      scale: { start: 0.8, end: 0 },
      tint: 0x9fcdd6,
      maxAliveParticles: SHIFT_STREAK_COUNT * 2,
      emitZone: this.createRoomEmitZone(map),
    });

    this.shiftEmitter.setDepth(SHIFT_EFFECT_DEPTH);
  }

  /**
   * Point the ambient dust toward the current gravity direction
   */
  private updateAmbientGravity() {
    const { x, y } = GRAVITY_VECTOR[this.gravityDirection];

    this.ambientEmitter.setParticleGravity(
      x * AMBIENT_DUST.GRAVITY,
      y * AMBIENT_DUST.GRAVITY,
    );
  }

  /**
   * Scatter low-alpha dust across the room and pull it in the new gravity direction
   */
  private emitGravityShiftStreak() {
    const angle = GRAVITY_STREAK_ANGLE[this.gravityDirection];

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

  /**
   * Create invisible static bodies from the collision boxes defined for each tile in the tileset
   *
   * @param layer - The Tilemap layer
   * @param fallbackToTileBounds - Whether tiles without a collision hitbox should fall back to the full tile bounds
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
    if (this.isPlayerDead || this.isExiting || this.isShifting) {
      return;
    }

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

    const { x, y } = GRAVITY_VECTOR[this.gravityDirection];
    this.physics.world.gravity.set(x * this.gravity, y * this.gravity);
    this.updateAmbientGravity();

    this.isShifting = true;
    this.player.setGravityDirection(this.gravityDirection, () => {
      this.isShifting = false;
    });

    this.emitGravityShiftStreak();
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

  private handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    if (this.isPlayerDead || this.isExiting) {
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const { now } = this.time;
    const { x: worldX, y: worldY } = worldPoint;

    const isDoubleTap =
      now - this.lastTap.time < DOUBLE_TAP_THRESHOLD_MS &&
      Phaser.Math.Distance.Between(
        worldX,
        worldY,
        this.lastTap.x,
        this.lastTap.y,
      ) < 20;

    if (isDoubleTap) {
      this.lastTap.time = 0;
      this.player.jump();
      return;
    }

    this.uiCamera?.ignore(new Marker(this, worldX, worldY));
    this.player.setWalkTarget(worldX, worldY);
    this.lastTap.time = now;
    this.lastTap.x = worldX;
    this.lastTap.y = worldY;
  };

  private renderHelpText(...ignoreList: Phaser.GameObjects.GameObject[]) {
    const helpTextRef = useRef<Phaser.GameObjects.Text>();
    render(<HelpText ref={helpTextRef} text={this.level.helpText} />, this);

    const helpText = helpTextRef.current;
    if (!helpText) {
      return;
    }

    // Keep help text at a fixed screen size regardless of camera zoom
    this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height);

    // Ignore from cameras to prevent double rendering
    this.cameras.main.ignore(helpText);
    this.uiCamera.ignore(
      ignoreList.concat(
        this.player,
        this.ambientEmitter,
        this.shiftEmitter,
        this.groundLayer,
        this.platformsLayer,
        this.spikesLayer,
      ),
    );

    // Don't draw a second copy of every body since physics debug graphic is a world-space object
    if (this.physics.world.drawDebug) {
      this.uiCamera.ignore([
        this.physics.world.debugGraphic,
        this.tileDebugGraphics,
      ]);
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

    // Kill player when it's out of bounds
    const { width, height } = this.groundLayer;
    if (
      this.player.x < 0 ||
      this.player.x > width ||
      this.player.y < 0 ||
      this.player.y > height
    ) {
      this.killPlayer();
    }
  }
}
