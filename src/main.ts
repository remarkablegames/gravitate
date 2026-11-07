import { Game, Scale } from 'phaser';

import * as scenes from './scenes';

new Game({
  width: 1200,
  height: 600,
  title: 'Gravitate',
  url: import.meta.env.VITE_APP_HOMEPAGE,
  version: import.meta.env.VITE_APP_VERSION,
  scene: [
    scenes.Boot,
    ...Object.values(scenes).filter((scene) => scene !== scenes.Boot),
  ],
  physics: {
    default: 'arcade',
    arcade: {
      gravity: {
        x: 0,
        y: 500,
      },
      debug: import.meta.env.DEV,
    },
  },
  disableContextMenu: true,
  backgroundColor: '#1d212d',
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  pixelArt: true,
});
