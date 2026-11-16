import Phaser from 'phaser';

import { KEY, RESOLUTION } from '../constants';

const BASE_WIDTH = RESOLUTION.COVER.LARGE.WIDTH;
const TILE_SIZE = 16;
const FLOOR_SCALE = 8;
const FLOOR_HEIGHT = TILE_SIZE * FLOOR_SCALE;
const PLAYER_SCALE = 14;
const PORTAL_SCALE = 8;
const PORTAL_SIZE = TILE_SIZE * PORTAL_SCALE;
const ARROW_SCALE = 0.9;
const TITLE_PADDING = 72;
const TITLE_JOIN_OFFSET = 80;

/**
 * Tileset frame indices (Tiled gid - 1)
 */
const FRAME = {
  FLOOR_LEFT: 54,
  FLOOR_MIDDLE: 55,
  FLOOR_RIGHT: 56,
  PORTAL_TOP_LEFT: 30,
  PORTAL_TOP_RIGHT: 31,
  PORTAL_BOTTOM_LEFT: 48,
  PORTAL_BOTTOM_RIGHT: 49,
  SPIKE: 66,
} as const;

const PORTAL_TILES = [
  { frame: FRAME.PORTAL_TOP_LEFT, column: 0, row: 0 },
  { frame: FRAME.PORTAL_TOP_RIGHT, column: 1, row: 0 },
  { frame: FRAME.PORTAL_BOTTOM_LEFT, column: 0, row: 1 },
  { frame: FRAME.PORTAL_BOTTOM_RIGHT, column: 1, row: 1 },
] as const;

const COLOR = {
  BACKGROUND: 0x0f131c,
  ACCENT: 0x6dfb8f,
  ACCENT_CSS: '#6dfb8f',
  TITLE: '#f4fff8',
  TAGLINE: '#b9cad8',
  MUTED: '#8ea3b4',
  SHADOW: 0x000000,
} as const;

const TEXTURE = {
  GLOW: 'COVER_GLOW',
  PORTAL_GLOW: 'COVER_PORTAL_GLOW',
  VIGNETTE: 'COVER_VIGNETTE',
} as const;

const FONT = 'monospace';

/**
 * Cover art built from the game's own tileset and sprites
 */
export class Cover extends Phaser.Scene {
  private isSmall = false;

  constructor() {
    super(KEY.SCENE.COVER);
  }

  create() {
    this.addTileFrames();

    this.cameras.main.setBackgroundColor(COLOR.BACKGROUND);

    const width = this.scale.width;
    const height = this.scale.height;
    const scale = width / BASE_WIDTH;
    const isSmall = (this.isSmall = scale < 1);
    const textScale = isSmall ? scale * 1.5 : scale;
    const playerBoost = isSmall ? 2 : 1;
    const floorHeight = FLOOR_HEIGHT * scale;
    const floorTop = height - floorHeight;

    this.addStars(scale, width, floorTop);
    this.addGrid(scale, width, floorTop);
    this.addGlow(scale, width, height);

    this.addFloor(scale, width, floorTop);

    const portalX = isSmall ? width * 0.85 : 1690 * scale;
    const playerX = isSmall ? width / 2 : 1380 * scale;

    this.addPortal(isSmall ? 0.6 : scale, portalX, floorTop);
    this.addPlayer(scale, playerX, floorTop, playerBoost);

    if (isSmall) {
      const spikeSize = PORTAL_SIZE * scale;
      this.add
        .image(playerX - spikeSize - 30, floorTop, KEY.IMAGE.TILES, FRAME.SPIKE)
        .setOrigin(1)
        .setScale(PORTAL_SCALE * scale * 1.5);
    }

    this.addArrow(scale, playerX, isSmall ? 770 * scale : 590 * scale);
    this.addText(textScale, scale);

    this.addVignette(scale, width, height);
  }

  /**
   * Reuse the existing tileset image by registering 16x16 frames on its texture at runtime
   * This keeps a single image in memory instead of loading the tileset again under a cover-specific key
   */
  private addTileFrames() {
    const texture = this.textures.get(KEY.IMAGE.TILES);
    const source = texture.getSourceImage();
    const columns = Math.floor(source.width / TILE_SIZE);
    const rows = Math.floor(source.height / TILE_SIZE);

    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const frame = row * columns + column;

        if (!texture.has(String(frame))) {
          texture.add(
            frame,
            0,
            column * TILE_SIZE,
            row * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE,
          );
        }
      }
    }
  }

  private addStars(scale: number, width: number, floorTop: number) {
    const stars = this.add.graphics();
    const random = new Phaser.Math.RandomDataGenerator(['gravitate-cover']);

    for (let index = 0; index < 90; index++) {
      stars.fillStyle(COLOR.ACCENT, random.realInRange(0.08, 0.3));
      stars.fillCircle(
        random.between(0, width),
        random.between(0, floorTop - 20 * scale),
        random.pick([1, 1, 1, 2]) * scale,
      );
    }
  }

  private addGrid(scale: number, width: number, floorTop: number) {
    const grid = this.add.graphics();

    grid.lineStyle(Math.max(1, 2 * scale), 0x5f829c, 0.08);

    const step = 64 * scale;

    for (let x = 0; x <= width; x += step) {
      grid.lineBetween(x, 0, x, floorTop);
    }

    for (let y = 0; y <= floorTop; y += step) {
      grid.lineBetween(0, y, width, y);
    }
  }

  private addGlow(scale: number, width: number, height: number) {
    if (!this.textures.exists(TEXTURE.GLOW)) {
      const texture = this.textures.createCanvas(TEXTURE.GLOW, width, height);

      if (texture) {
        const context = texture.getContext();
        const gradient = context.createRadialGradient(
          1430 * scale,
          800 * scale,
          0,
          1430 * scale,
          800 * scale,
          900 * scale,
        );

        gradient.addColorStop(0, 'rgba(74, 244, 145, 0.2)');
        gradient.addColorStop(0.45, 'rgba(48, 190, 200, 0.06)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
        texture.refresh();
      }
    }

    this.add.image(width / 2, height / 2, TEXTURE.GLOW);
  }

  private addFloor(scale: number, width: number, floorTop: number) {
    const floorHeight = FLOOR_HEIGHT * scale;
    const columns = Math.ceil(width / floorHeight);

    for (let column = 0; column < columns; column++) {
      const frame =
        column === 0
          ? FRAME.FLOOR_LEFT
          : column === columns - 1
            ? FRAME.FLOOR_RIGHT
            : FRAME.FLOOR_MIDDLE;

      this.add
        .image(column * floorHeight, floorTop, KEY.IMAGE.TILES, frame)
        .setOrigin(0)
        .setScale(FLOOR_SCALE * scale);
    }
  }

  private addPortal(scale: number, centerX: number, bottomY: number) {
    const portalSize = PORTAL_SIZE * scale;
    const left = centerX - portalSize;
    const top = bottomY - portalSize * 2;
    const centerY = top + portalSize;

    this.add.ellipse(
      centerX,
      bottomY,
      260 * scale,
      30 * scale,
      COLOR.SHADOW,
      0.4,
    );

    this.addPortalGlow(scale, centerX, centerY);

    for (const tile of PORTAL_TILES) {
      this.add
        .image(
          left + tile.column * portalSize,
          top + tile.row * portalSize,
          KEY.IMAGE.TILES,
          tile.frame,
        )
        .setOrigin(0)
        .setScale(PORTAL_SCALE * scale);
    }
  }

  private addPortalGlow(scale: number, centerX: number, centerY: number) {
    const size = 512 * scale;

    if (!this.textures.exists(TEXTURE.PORTAL_GLOW)) {
      const texture = this.textures.createCanvas(
        TEXTURE.PORTAL_GLOW,
        size,
        size,
      );

      if (texture) {
        const context = texture.getContext();
        const gradient = context.createRadialGradient(
          size / 2,
          size / 2,
          0,
          size / 2,
          size / 2,
          size / 2,
        );

        gradient.addColorStop(0, 'rgba(130, 255, 240, 0.55)');
        gradient.addColorStop(0.25, 'rgba(70, 240, 220, 0.22)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, size, size);
        texture.refresh();
      }
    }

    const glow = this.add
      .image(centerX, centerY, TEXTURE.PORTAL_GLOW)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.7, to: 1 },
      scale: 1.06,
      duration: 1800,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private addPlayer(
    scale: number,
    x: number,
    floorY: number,
    playerBoost: number,
  ) {
    // Frame 0's visible feet sit 7px below the sprite center
    const playerScale = PLAYER_SCALE * scale * playerBoost;
    const centerY = floorY - 7 * playerScale;

    this.add.ellipse(
      x,
      floorY,
      150 * scale * playerBoost,
      26 * scale * playerBoost,
      COLOR.SHADOW,
      0.38,
    );

    this.add
      .sprite(x, centerY, KEY.SPRITESHEET.PLAYER, 0)
      .setScale(playerScale)
      .setFlipX(true);
  }

  private addArrow(scale: number, x: number, y: number) {
    const arrow = this.add
      .image(x, y, KEY.IMAGE.ARROW)
      .setScale(ARROW_SCALE * scale * (this.isSmall ? 1.5 : 1))
      .setAngle(180)
      .setAlpha(0.9);

    this.tweens.add({
      targets: arrow,
      y: y - (this.isSmall ? 10 : 14) * scale,
      duration: 1400,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private addText(textScale: number, scale: number) {
    if (this.isSmall) {
      const titleStyle = {
        fontFamily: FONT,
        fontSize: 200 * textScale,
        fontStyle: 'bold',
        color: COLOR.TITLE,
        stroke: '#0b0f16',
        strokeThickness: 10 * textScale,
        letterSpacing: 2 * textScale,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: '#2fff7d',
          blur: 24 * textScale,
          stroke: true,
          fill: true,
        },
      } satisfies Phaser.Types.GameObjects.Text.TextStyle;

      this.add
        .text(
          this.scale.width / 2,
          this.scale.height * 0.2,
          'GRAVITATE',
          titleStyle,
        )
        .setOrigin(0.5);

      return;
    }

    // Accent bar above the kicker
    this.add
      .rectangle(112 * scale, 142 * scale, 55 * scale, 5 * scale, COLOR.ACCENT)
      .setOrigin(0, 0.5);

    this.add.text(112 * scale, 158 * scale, 'GRAVITY PUZZLE PLATFORMER', {
      fontFamily: FONT,
      fontSize: `${String(26 * textScale)}px`,
      color: COLOR.ACCENT_CSS,
      letterSpacing: 8 * textScale,
    });

    const titleStyle = {
      fontFamily: FONT,
      fontSize: `${String(190 * textScale)}px`,
      fontStyle: 'bold',
      color: COLOR.TITLE,
      stroke: '#0b0f16',
      strokeThickness: 10 * textScale,
      letterSpacing: 2 * textScale,
      padding: { x: TITLE_PADDING * scale, y: TITLE_PADDING * scale },
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#2fff7d',
        blur: 24 * textScale,
        stroke: true,
        fill: true,
      },
    } satisfies Phaser.Types.GameObjects.Text.TextStyle;

    const titleStart = this.add.text(
      (110 - TITLE_PADDING) * scale,
      (210 - TITLE_PADDING) * scale,
      'GRAV',
      titleStyle,
    );

    this.add.text(
      titleStart.x +
        titleStart.width -
        TITLE_PADDING * scale -
        TITLE_JOIN_OFFSET * scale,
      titleStart.y,
      'ITATE',
      {
        ...titleStyle,
        color: COLOR.ACCENT_CSS,
      },
    );

    this.add.text(
      116 * scale,
      490 * scale,
      'SHIFT GRAVITY. FIND THE WAY OUT.',
      {
        fontFamily: FONT,
        fontSize: `${String(36 * textScale)}px`,
        color: COLOR.TAGLINE,
        letterSpacing: 4 * textScale,
      },
    );

    this.add
      .rectangle(
        118 * scale,
        558 * scale,
        810 * scale,
        2 * scale,
        COLOR.ACCENT,
        0.5,
      )
      .setOrigin(0, 0.5);

    const features = [
      '15 HANDCRAFTED LEVELS',
      '4 GRAVITY DIRECTIONS',
      'ORIGINAL SCI-FI SOUNDTRACKS',
      'PLAY FREE IN YOUR BROWSER',
    ];

    features.forEach((feature, index) => {
      const y = (640 + index * 58) * scale;

      this.add
        .rectangle(
          118 * scale,
          y + 13 * scale,
          10 * scale,
          10 * scale,
          COLOR.ACCENT,
        )
        .setOrigin(0.5);

      this.add.text(148 * scale, y, feature, {
        fontFamily: FONT,
        fontSize: `${String(25 * scale)}px`,
        color: COLOR.MUTED,
        letterSpacing: 3 * scale,
      });
    });
  }

  private addVignette(scale: number, width: number, height: number) {
    if (!this.textures.exists(TEXTURE.VIGNETTE)) {
      const texture = this.textures.createCanvas(
        TEXTURE.VIGNETTE,
        width,
        height,
      );

      if (texture) {
        const context = texture.getContext();
        const gradient = context.createRadialGradient(
          width / 2,
          height / 2,
          height * 0.35 * scale,
          width / 2,
          height / 2,
          height * 0.92 * scale,
        );

        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.18)');
        gradient.addColorStop(
          1,
          this.isSmall ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.6)',
        );

        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
        texture.refresh();
      }
    }

    this.add.image(width / 2, height / 2, TEXTURE.VIGNETTE);
  }
}
