import Phaser from 'phaser';

import { KEY, RESOLUTION } from '../constants';

const { WIDTH, HEIGHT } = RESOLUTION.COVER;
const TILE_SIZE = 16;
const FLOOR_SCALE = 8;
const FLOOR_HEIGHT = TILE_SIZE * FLOOR_SCALE;
const FLOOR_TOP = HEIGHT - FLOOR_HEIGHT;
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
} as const;

const PORTAL_TILES = [
  { frame: FRAME.PORTAL_TOP_LEFT, column: 0, row: 0 },
  { frame: FRAME.PORTAL_TOP_RIGHT, column: 1, row: 0 },
  { frame: FRAME.PORTAL_BOTTOM_LEFT, column: 0, row: 1 },
  { frame: FRAME.PORTAL_BOTTOM_RIGHT, column: 1, row: 1 },
] as const;

const DEPTH = {
  STARS: 1,
  GRID: 2,
  GLOW: 3,
  FLOOR: 10,
  SHADOW: 15,
  PORTAL_GLOW: 16,
  PORTAL: 20,
  PLAYER: 30,
  ARROW: 30,
  TEXT: 40,
  VIGNETTE: 50,
} as const;

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
 * 16:9 cover art built from the game's own tileset and sprites
 * Open the game with `?cover` to render it
 */
export class Cover extends Phaser.Scene {
  constructor() {
    super(KEY.SCENE.COVER);
  }

  create() {
    this.addTileFrames();

    this.cameras.main.setBackgroundColor(COLOR.BACKGROUND);

    this.addStars();
    this.addGrid();
    this.addGlow();

    this.addFloor();

    const portalX = 1690;
    const playerX = 1380;

    this.addPortal(portalX, FLOOR_TOP);
    this.addPlayer(playerX, FLOOR_TOP);
    this.addArrow(playerX, 590);
    this.addText();

    this.addVignette();
  }

  /**
   * Reuse the existing tileset image by registering 16x16 frames on its
   * texture at runtime. This keeps a single image in memory instead of loading
   * the tileset again under a cover-specific key.
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

  private addStars() {
    const stars = this.add.graphics().setDepth(DEPTH.STARS);
    const random = new Phaser.Math.RandomDataGenerator(['gravitate-cover']);

    for (let index = 0; index < 90; index++) {
      stars.fillStyle(COLOR.ACCENT, random.realInRange(0.08, 0.3));
      stars.fillCircle(
        random.between(0, WIDTH),
        random.between(0, FLOOR_TOP - 20),
        random.pick([1, 1, 1, 2]),
      );
    }
  }

  private addGrid() {
    const grid = this.add.graphics().setDepth(DEPTH.GRID);

    grid.lineStyle(2, 0x5f829c, 0.08);

    for (let x = 0; x <= WIDTH; x += 64) {
      grid.lineBetween(x, 0, x, FLOOR_TOP);
    }

    for (let y = 0; y <= FLOOR_TOP; y += 64) {
      grid.lineBetween(0, y, WIDTH, y);
    }
  }

  private addGlow() {
    if (!this.textures.exists(TEXTURE.GLOW)) {
      const texture = this.textures.createCanvas(TEXTURE.GLOW, WIDTH, HEIGHT);

      if (texture) {
        const context = texture.getContext();
        const gradient = context.createRadialGradient(
          1430,
          800,
          0,
          1430,
          800,
          900,
        );

        gradient.addColorStop(0, 'rgba(74, 244, 145, 0.2)');
        gradient.addColorStop(0.45, 'rgba(48, 190, 200, 0.06)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, WIDTH, HEIGHT);
        texture.refresh();
      }
    }

    this.add.image(WIDTH / 2, HEIGHT / 2, TEXTURE.GLOW).setDepth(DEPTH.GLOW);
  }

  private addFloor() {
    const columns = Math.ceil(WIDTH / FLOOR_HEIGHT);

    for (let column = 0; column < columns; column++) {
      const frame =
        column === 0
          ? FRAME.FLOOR_LEFT
          : column === columns - 1
            ? FRAME.FLOOR_RIGHT
            : FRAME.FLOOR_MIDDLE;

      this.add
        .image(column * FLOOR_HEIGHT, FLOOR_TOP, KEY.IMAGE.TILES, frame)
        .setOrigin(0)
        .setScale(FLOOR_SCALE)
        .setDepth(DEPTH.FLOOR);
    }
  }

  private addPortal(centerX: number, bottomY: number) {
    const left = centerX - PORTAL_SIZE;
    const top = bottomY - PORTAL_SIZE * 2;
    const centerY = top + PORTAL_SIZE;

    this.add
      .ellipse(centerX, bottomY, 260, 30, COLOR.SHADOW, 0.4)
      .setDepth(DEPTH.SHADOW);

    this.addPortalGlow(centerX, centerY);

    for (const tile of PORTAL_TILES) {
      this.add
        .image(
          left + tile.column * PORTAL_SIZE,
          top + tile.row * PORTAL_SIZE,
          KEY.IMAGE.TILES,
          tile.frame,
        )
        .setOrigin(0)
        .setScale(PORTAL_SCALE)
        .setDepth(DEPTH.PORTAL);
    }
  }

  private addPortalGlow(centerX: number, centerY: number) {
    const size = 512;

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
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.PORTAL_GLOW);

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

  private addPlayer(x: number, floorY: number) {
    // Frame 0's visible feet sit 7px below the sprite center.
    const centerY = floorY - 7 * PLAYER_SCALE;

    this.add
      .ellipse(x, floorY, 150, 26, COLOR.SHADOW, 0.38)
      .setDepth(DEPTH.SHADOW);

    this.add
      .sprite(x, centerY, KEY.SPRITESHEET.PLAYER, 0)
      .setScale(PLAYER_SCALE)
      .setFlipX(true)
      .setDepth(DEPTH.PLAYER);
  }

  private addArrow(x: number, y: number) {
    const arrow = this.add
      .image(x, y, KEY.IMAGE.ARROW)
      .setScale(ARROW_SCALE)
      .setAngle(180)
      .setAlpha(0.9)
      .setDepth(DEPTH.ARROW);

    this.tweens.add({
      targets: arrow,
      y: y - 14,
      duration: 1400,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private addText() {
    // Accent bar above the kicker.
    this.add
      .rectangle(112, 142, 55, 5, COLOR.ACCENT)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.TEXT);

    this.add
      .text(112, 158, 'GRAVITY PUZZLE PLATFORMER', {
        fontFamily: FONT,
        fontSize: '26px',
        color: COLOR.ACCENT_CSS,
        letterSpacing: 8,
      })
      .setDepth(DEPTH.TEXT);

    const titleStyle = {
      fontFamily: FONT,
      fontSize: '190px',
      fontStyle: 'bold',
      color: COLOR.TITLE,
      stroke: '#0b0f16',
      strokeThickness: 10,
      letterSpacing: 2,
      padding: { x: TITLE_PADDING, y: TITLE_PADDING },
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#2fff7d',
        blur: 24,
        stroke: true,
        fill: true,
      },
    } satisfies Phaser.Types.GameObjects.Text.TextStyle;

    const titleStart = this.add
      .text(110 - TITLE_PADDING, 210 - TITLE_PADDING, 'GRAV', titleStyle)
      .setDepth(DEPTH.TEXT);

    this.add
      .text(
        titleStart.x + titleStart.width - TITLE_PADDING - TITLE_JOIN_OFFSET,
        titleStart.y,
        'ITATE',
        {
          ...titleStyle,
          color: COLOR.ACCENT_CSS,
        },
      )
      .setDepth(DEPTH.TEXT);

    this.add
      .text(116, 490, 'SHIFT GRAVITY. FIND THE WAY OUT.', {
        fontFamily: FONT,
        fontSize: '36px',
        color: COLOR.TAGLINE,
        letterSpacing: 4,
      })
      .setDepth(DEPTH.TEXT);

    this.add
      .rectangle(118, 558, 810, 2, COLOR.ACCENT, 0.5)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH.TEXT);

    const features = [
      '15 HANDCRAFTED LEVELS',
      '4 GRAVITY DIRECTIONS',
      'ORIGINAL SCI-FI SOUNDTRACKS',
      'PLAY FREE IN YOUR BROWSER',
    ];

    features.forEach((feature, index) => {
      const y = 640 + index * 58;

      this.add
        .rectangle(118, y + 13, 10, 10, COLOR.ACCENT)
        .setOrigin(0.5)
        .setDepth(DEPTH.TEXT);

      this.add
        .text(148, y, feature, {
          fontFamily: FONT,
          fontSize: '25px',
          color: COLOR.MUTED,
          letterSpacing: 3,
        })
        .setDepth(DEPTH.TEXT);
    });
  }

  private addVignette() {
    if (!this.textures.exists(TEXTURE.VIGNETTE)) {
      const texture = this.textures.createCanvas(
        TEXTURE.VIGNETTE,
        WIDTH,
        HEIGHT,
      );

      if (texture) {
        const context = texture.getContext();
        const gradient = context.createRadialGradient(
          WIDTH / 2,
          HEIGHT / 2,
          HEIGHT * 0.35,
          WIDTH / 2,
          HEIGHT / 2,
          HEIGHT * 0.92,
        );

        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.18)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, WIDTH, HEIGHT);
        texture.refresh();
      }
    }

    this.add
      .image(WIDTH / 2, HEIGHT / 2, TEXTURE.VIGNETTE)
      .setDepth(DEPTH.VIGNETTE);
  }
}
