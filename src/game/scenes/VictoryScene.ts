import Phaser from 'phaser';
import { getTotalLevels } from '../data/levels';

interface VictoryData {
  level: number;
  timeTaken: number;
  moves: number;
  timeLimit: number;
}

export class VictoryScene extends Phaser.Scene {
  private levelData!: VictoryData;

  constructor() {
    super({ key: 'VictoryScene' });
  }

  create(data: VictoryData): void {
    this.levelData = data;

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    // Victory panel
    const panelWidth = Math.min(400, width * 0.9);
    const panelHeight = 350;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x2ecc71, 1);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 20);

    // Inner panel
    panel.fillStyle(0xffffff, 1);
    panel.fillRoundedRect(
      panelX + 10,
      panelY + 10,
      panelWidth - 20,
      panelHeight - 20,
      15
    );

    // Title
    this.add.text(centerX, panelY + 50, 'LEVEL COMPLETE!', {
      fontSize: '32px',
      color: '#2ecc71',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Stars (simple placeholder)
    const starY = panelY + 110;
    this.drawStars(centerX, starY, this.calculateStars());

    // Stats
    const statsY = panelY + 170;
    this.add.text(centerX, statsY, 'STATS', {
      fontSize: '18px',
      color: '#34495e',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Time
    this.add.text(centerX - 80, statsY + 40, 'Time:', {
      fontSize: '16px',
      color: '#7f8c8d',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0, 0.5);

    this.add.text(centerX + 80, statsY + 40, this.formatTime(data.timeTaken), {
      fontSize: '16px',
      color: '#2c3e50',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    // Moves
    this.add.text(centerX - 80, statsY + 70, 'Moves:', {
      fontSize: '16px',
      color: '#7f8c8d',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0, 0.5);

    this.add.text(centerX + 80, statsY + 70, `${data.moves}`, {
      fontSize: '16px',
      color: '#2c3e50',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5);

    // Buttons
    const buttonsY = panelY + panelHeight - 70;

    // Check if there's a next level
    const hasNextLevel = data.level < getTotalLevels();

    if (hasNextLevel) {
      // Next Level button
      this.createButton(centerX - 80, buttonsY, 150, 'NEXT', 0x3498db, () => {
        this.scene.start('GameScene', { level: data.level + 1 });
      });

      // Retry button
      this.createButton(centerX + 80, buttonsY, 70, 'RETRY', 0x95a5a6, () => {
        this.scene.start('GameScene', { level: data.level });
      });
    } else {
      // Game completed - show restart from level 1
      this.createButton(centerX, buttonsY, 200, 'PLAY AGAIN', 0x3498db, () => {
        this.scene.start('GameScene', { level: 1 });
      });
    }
  }

  /**
   * Calculate stars based on performance
   */
  private calculateStars(): number {
    const timePercent = this.levelData.timeTaken / this.levelData.timeLimit;

    if (timePercent <= 0.5 && this.levelData.moves <= 10) {
      return 3; // Fast and efficient
    } else if (timePercent <= 0.75) {
      return 2; // Good time
    } else {
      return 1; // Completed
    }
  }

  /**
   * Draw stars
   */
  private drawStars(centerX: number, y: number, count: number): void {
    const starSpacing = 60;
    const startX = centerX - ((count - 1) * starSpacing) / 2;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * starSpacing;
      const filled = i < count;

      this.drawStar(x, y, filled);
    }
  }

  /**
   * Draw a single star
   */
  private drawStar(x: number, y: number, filled: boolean): void {
    const graphics = this.add.graphics();
    const color = filled ? 0xf39c12 : 0xbdc3c7;

    graphics.fillStyle(color, 1);
    graphics.lineStyle(2, filled ? 0xe67e22 : 0x95a5a6, 1);

    // Draw star shape
    const points: number[] = [];
    const outerRadius = 20;
    const innerRadius = 10;

    for (let i = 0; i < 5; i++) {
      const angle1 = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const angle2 = ((i * 2 + 1) * Math.PI) / 5 - Math.PI / 2;

      points.push(x + Math.cos(angle1) * outerRadius);
      points.push(y + Math.sin(angle1) * outerRadius);
      points.push(x + Math.cos(angle2) * innerRadius);
      points.push(y + Math.sin(angle2) * innerRadius);
    }

    graphics.beginPath();
    graphics.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      graphics.lineTo(points[i], points[i + 1]);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  /**
   * Create a button
   */
  private createButton(
    x: number,
    y: number,
    width: number,
    text: string,
    color: number,
    callback: () => void
  ): void {
    const height = 45;
    const graphics = this.add.graphics();

    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, 8);

    // Button shadow
    graphics.fillStyle(0x000000, 0.2);
    graphics.fillRoundedRect(
      x - width / 2,
      y - height / 2 + height - 5,
      width,
      5,
      8
    );

    const buttonText = this.add.text(x, y, text, {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    graphics.setInteractive(
      new Phaser.Geom.Rectangle(x - width / 2, y - height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );

    graphics.on('pointerdown', callback);

    // Hover effect
    graphics.on('pointerover', () => {
      buttonText.setScale(1.05);
    });

    graphics.on('pointerout', () => {
      buttonText.setScale(1);
    });
  }

  /**
   * Format time in MM:SS format
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
