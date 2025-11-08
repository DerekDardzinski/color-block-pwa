import './styles/main.css';
import Phaser from 'phaser';
import { gameConfig } from './game/config';

// Initialize the game when DOM is ready
window.addEventListener('load', () => {
  new Phaser.Game(gameConfig);
});
