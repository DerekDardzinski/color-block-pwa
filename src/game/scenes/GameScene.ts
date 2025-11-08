import Phaser from 'phaser';
import { Grid } from '../entities/Grid';
import { Block } from '../entities/Block';
import { ExitZone } from '../entities/ExitZone';
import { DragController } from '../systems/DragController';
import { CollisionDetector } from '../systems/CollisionDetector';
import { getLevel } from '../data/levels';

export class GameScene extends Phaser.Scene {
  // Game entities
  private grid!: Grid;
  private blocks: Block[] = [];
  private exitZones: ExitZone[] = [];
  private dragController!: DragController;
  private collisionDetector!: CollisionDetector;

  // Game state
  private currentLevel: number = 1;
  private timer: number = 0;
  private moveCount: number = 0;
  private isGameActive: boolean = false;
  private isPaused: boolean = false;
  private timerStarted: boolean = false;

  // UI elements
  private timerText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private moveText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Graphics;

  // Timer event
  private timerEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: { level?: number }): void {
    // Set current level
    if (data && data.level) {
      this.currentLevel = data.level;
    }

    // Load level data
    const levelData = getLevel(this.currentLevel);
    if (!levelData) {
      console.error(`Level ${this.currentLevel} not found`);
      return;
    }

    // Initialize game state
    this.timer = levelData.timeLimit;
    this.moveCount = 0;
    this.isGameActive = true;
    this.isPaused = false;
    this.timerStarted = false;
    this.blocks = [];
    this.exitZones = [];

    // Create UI
    this.createUI();

    // Calculate grid positioning
    const gameWidth = this.cameras.main.width;
    const gameHeight = this.cameras.main.height;
    const uiTopHeight = 80;
    const uiBottomHeight = 60;
    const gridMaxWidth = gameWidth * 0.95;
    const gridMaxHeight = gameHeight - uiTopHeight - uiBottomHeight;

    // Create grid
    this.grid = new Grid({
      scene: this,
      rows: levelData.gridSize.rows,
      cols: levelData.gridSize.cols,
      x: (gameWidth - gridMaxWidth) / 2,
      y: uiTopHeight + (gridMaxHeight - gridMaxHeight * 0.95) / 2,
      maxWidth: gridMaxWidth,
      maxHeight: gridMaxHeight * 0.95
    });

    // Render grid
    this.grid.render();

    // Create exit zones
    levelData.exits.forEach(exitData => {
      const exitZone = new ExitZone({
        scene: this,
        grid: this.grid,
        color: exitData.color,
        side: exitData.side,
        startCell: exitData.startCell,
        endCell: exitData.endCell
      });
      this.exitZones.push(exitZone);
    });

    // Create obstacles (render as dark gray blocks)
    levelData.obstacles.forEach(obstaclePos => {
      const worldPos = this.grid.gridToWorld(obstaclePos.row, obstaclePos.col);
      const graphics = this.add.graphics();
      graphics.fillStyle(0x2c3e50, 1);
      graphics.fillRoundedRect(
        worldPos.x + 2,
        worldPos.y + 2,
        this.grid.cellSize - 4,
        this.grid.cellSize - 4,
        this.grid.cellSize * 0.1
      );
    });

    // Create collision detector
    this.collisionDetector = new CollisionDetector(
      this.grid,
      this.blocks,
      levelData.obstacles
    );

    // Create blocks
    levelData.blocks.forEach((blockData, index) => {
      const block = new Block({
        scene: this,
        grid: this.grid,
        id: `block-${index}`,
        color: blockData.color,
        shape: blockData.shape,
        gridPosition: blockData.startPosition
      });
      this.blocks.push(block);
    });

    // Update collision detector with blocks
    this.collisionDetector.setBlocks(this.blocks);

    // Create drag controller
    this.dragController = new DragController({
      scene: this,
      grid: this.grid,
      blocks: this.blocks,
      exitZones: this.exitZones,
      collisionDetector: this.collisionDetector,
      onMoveComplete: () => this.onMoveComplete(),
      onBlockRemoved: (block) => this.onBlockRemoved(block),
      onFirstInteraction: () => this.startTimer()
    });

    // Update UI
    this.updateUI();
  }

  /**
   * Create UI elements
   */
  private createUI(): void {
    const centerX = this.cameras.main.centerX;
    const width = this.cameras.main.width;

    // Top bar background
    const topBarBg = this.add.graphics();
    topBarBg.fillStyle(0x34495e, 0.9);
    topBarBg.fillRoundedRect(10, 10, width - 20, 60, 10);

    // Level text (left)
    this.levelText = this.add.text(30, 25, `LEVEL\n${this.currentLevel}`, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0, 0);

    // Timer (center)
    this.timerText = this.add.text(centerX, 40, this.formatTime(this.timer), {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Timer label
    this.add.text(centerX, 22, 'TIME', {
      fontSize: '12px',
      color: '#bdc3c7',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5);

    // Restart button (right)
    this.restartButton = this.add.graphics();
    this.drawRestartButton();
    this.restartButton.setInteractive(
      new Phaser.Geom.Circle(width - 40, 40, 20),
      Phaser.Geom.Circle.Contains
    );
    this.restartButton.on('pointerdown', () => this.restartLevel());

    // Move counter (bottom right)
    const movesBg = this.add.graphics();
    movesBg.fillStyle(0x34495e, 0.9);
    movesBg.fillRoundedRect(width - 120, this.cameras.main.height - 50, 110, 40, 8);

    this.moveText = this.add.text(width - 65, this.cameras.main.height - 30, `Moves: ${this.moveCount}`, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  /**
   * Draw restart button icon
   */
  private drawRestartButton(): void {
    const width = this.cameras.main.width;
    this.restartButton.clear();

    // Background circle
    this.restartButton.fillStyle(0x3498db, 1);
    this.restartButton.fillCircle(width - 40, 40, 20);

    // Restart arrow
    this.restartButton.lineStyle(2, 0xffffff, 1);
    this.restartButton.beginPath();
    this.restartButton.arc(width - 40, 40, 12, -Math.PI / 2, Math.PI * 1.5, false);
    this.restartButton.strokePath();

    // Arrow head
    this.restartButton.fillStyle(0xffffff, 1);
    this.restartButton.fillTriangle(
      width - 40 + 12, 40,
      width - 40 + 8, 40 - 5,
      width - 40 + 8, 40 + 5
    );
  }

  /**
   * Update UI elements
   */
  private updateUI(): void {
    this.timerText.setText(this.formatTime(this.timer));
    this.levelText.setText(`LEVEL\n${this.currentLevel}`);
    this.moveText.setText(`Moves: ${this.moveCount}`);
  }

  /**
   * Format time in MM:SS format
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Start the countdown timer
   */
  private startTimer(): void {
    if (this.timerStarted) return;

    this.timerStarted = true;
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: this.onTimerTick,
      callbackScope: this,
      loop: true
    });
  }

  /**
   * Timer tick callback
   */
  private onTimerTick(): void {
    if (this.isPaused || !this.isGameActive) return;

    this.timer--;
    this.updateUI();

    // Change color when time is running out
    if (this.timer <= 10) {
      this.timerText.setColor('#e74c3c');
    } else if (this.timer <= 30) {
      this.timerText.setColor('#f39c12');
    }

    // Check for time up
    if (this.timer <= 0) {
      this.onTimeUp();
    }
  }

  /**
   * Handle move completion
   */
  private onMoveComplete(): void {
    this.moveCount++;
    this.updateUI();
  }

  /**
   * Handle block removal
   */
  private onBlockRemoved(_block: Block): void {
    this.moveCount++;
    this.updateUI();

    // Check for win condition
    if (this.blocks.length === 0) {
      this.onLevelComplete();
    }
  }

  /**
   * Handle level completion (win)
   */
  private onLevelComplete(): void {
    this.isGameActive = false;
    if (this.timerEvent) {
      this.timerEvent.remove();
    }

    // Show victory screen after short delay
    this.time.delayedCall(500, () => {
      this.scene.start('VictoryScene', {
        level: this.currentLevel,
        timeTaken: this.getTimeTaken(),
        moves: this.moveCount,
        timeLimit: getLevel(this.currentLevel)?.timeLimit || 0
      });
    });
  }

  /**
   * Handle time up (lose)
   */
  private onTimeUp(): void {
    this.isGameActive = false;
    if (this.timerEvent) {
      this.timerEvent.remove();
    }

    // Show defeat screen
    this.time.delayedCall(500, () => {
      this.scene.start('DefeatScene', {
        level: this.currentLevel
      });
    });
  }

  /**
   * Get time taken to complete level
   */
  private getTimeTaken(): number {
    const levelData = getLevel(this.currentLevel);
    if (!levelData) return 0;
    return levelData.timeLimit - this.timer;
  }

  /**
   * Restart current level
   */
  private restartLevel(): void {
    if (this.timerEvent) {
      this.timerEvent.remove();
    }
    this.scene.restart({ level: this.currentLevel });
  }

  /**
   * Clean up when scene shuts down
   */
  shutdown(): void {
    if (this.timerEvent) {
      this.timerEvent.remove();
    }
    if (this.dragController) {
      this.dragController.destroy();
    }
    if (this.grid) {
      this.grid.destroy();
    }
    this.exitZones.forEach(exit => exit.destroy());
    this.blocks.forEach(block => block.destroy());
  }
}
