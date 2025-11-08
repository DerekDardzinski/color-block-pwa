import Phaser from 'phaser';

interface DefeatData {
  level: number;
}

export class DefeatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DefeatScene' });
  }

  create(data: DefeatData): void {

    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background overlay
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);

    // Defeat panel
    const panelWidth = Math.min(400, width * 0.9);
    const panelHeight = 300;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0xe74c3c, 1);
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
    this.add.text(centerX, panelY + 60, "TIME'S UP!", {
      fontSize: '36px',
      color: '#e74c3c',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Message
    this.add.text(centerX, panelY + 120, 'Out of time!', {
      fontSize: '18px',
      color: '#7f8c8d',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    this.add.text(centerX, panelY + 150, 'Try again to beat the level', {
      fontSize: '16px',
      color: '#95a5a6',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    // Buttons
    const buttonsY = panelY + panelHeight - 70;

    // Retry button
    this.createButton(centerX - 70, buttonsY, 120, 'RETRY', 0x3498db, () => {
      this.scene.start('GameScene', { level: data.level });
    });

    // Exit to level 1 button
    this.createButton(centerX + 70, buttonsY, 120, 'EXIT', 0x95a5a6, () => {
      this.scene.start('GameScene', { level: 1 });
    });
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
}
