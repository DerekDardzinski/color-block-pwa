import './styles/main.css';
import Phaser from 'phaser';
import { gameConfig } from './game/config';

// Global error handler for resource loading
window.addEventListener('error', (event) => {
  console.error('Resource loading error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
}, true);

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

// Initialize the game when DOM is ready
window.addEventListener('load', () => {
  try {
    console.log('Initializing Color Block PWA...');

    new Phaser.Game(gameConfig);

    console.log('Game initialized successfully');
  } catch (error) {
    console.error('Failed to initialize game:', error);

    // Display error to user
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: Arial, sans-serif;
        background: #2c3e50;
        color: white;
        padding: 20px;
        text-align: center;
      ">
        <div>
          <h1>Failed to load Color Block PWA</h1>
          <p>Please check the console for details</p>
          <p style="font-size: 12px; color: #bdc3c7; margin-top: 20px;">
            Error: ${error instanceof Error ? error.message : String(error)}
          </p>
        </div>
      </div>
    `;
  }
});
