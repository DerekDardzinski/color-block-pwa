import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { VictoryScene } from './scenes/VictoryScene';
import { DefeatScene } from './scenes/DefeatScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#a8d8ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
    min: {
      width: 360,
      height: 640
    },
    max: {
      width: 1080,
      height: 1920
    }
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [GameScene, VictoryScene, DefeatScene],
  input: {
    activePointers: 1
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false
  }
};
