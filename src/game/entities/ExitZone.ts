import Phaser from 'phaser';
import { Grid, Bounds } from './Grid';

export type ExitSide = 'top' | 'bottom' | 'left' | 'right';

export interface ExitZoneConfig {
  scene: Phaser.Scene;
  grid: Grid;
  color: string;
  side: ExitSide;
  startCell: number;
  endCell: number;
}

export class ExitZone {
  private scene: Phaser.Scene;
  private grid: Grid;
  public color: string;
  public side: ExitSide;
  public startCell: number;
  public endCell: number;
  private graphics: Phaser.GameObjects.Graphics;

  // Color string to hex mapping
  private static colorMap: { [key: string]: number } = {
    red: 0xe84c3d,
    blue: 0x3498db,
    green: 0x2ecc71,
    yellow: 0xf39c12,
    orange: 0xe67e22,
    purple: 0x9b59b6,
    cyan: 0x1abc9c,
    pink: 0xe91e63
  };

  constructor(config: ExitZoneConfig) {
    this.scene = config.scene;
    this.grid = config.grid;
    this.color = config.color;
    this.side = config.side;
    this.startCell = config.startCell;
    this.endCell = config.endCell;

    this.graphics = this.scene.add.graphics();
    this.render();
  }

  /**
   * Get the color value for this exit
   */
  private getColorValue(): number {
    return ExitZone.colorMap[this.color.toLowerCase()] || 0xffffff;
  }

  /**
   * Get the world bounds of this exit zone
   */
  public getWorldBounds(): Bounds {
    const playable = this.grid.getPlayableBounds();
    const worldBounds = this.grid.getWorldBounds();
    const cellSize = this.grid.cellSize;

    switch (this.side) {
      case 'top':
        return {
          left: playable.left + this.startCell * cellSize,
          right: playable.left + (this.endCell + 1) * cellSize,
          top: worldBounds.top,
          bottom: playable.top
        };

      case 'bottom':
        return {
          left: playable.left + this.startCell * cellSize,
          right: playable.left + (this.endCell + 1) * cellSize,
          top: playable.bottom,
          bottom: worldBounds.bottom
        };

      case 'left':
        return {
          left: worldBounds.left,
          right: playable.left,
          top: playable.top + this.startCell * cellSize,
          bottom: playable.top + (this.endCell + 1) * cellSize
        };

      case 'right':
        return {
          left: playable.right,
          right: worldBounds.right,
          top: playable.top + this.startCell * cellSize,
          bottom: playable.top + (this.endCell + 1) * cellSize
        };
    }
  }

  /**
   * Check if a block at given position and size fits within this exit
   */
  public canBlockFit(blockBounds: Bounds): boolean {
    const exitBounds = this.getWorldBounds();

    switch (this.side) {
      case 'top':
      case 'bottom':
        // For horizontal exits, check if block width fits within exit width
        return blockBounds.left >= exitBounds.left &&
               blockBounds.right <= exitBounds.right;

      case 'left':
      case 'right':
        // For vertical exits, check if block height fits within exit height
        return blockBounds.top >= exitBounds.top &&
               blockBounds.bottom <= exitBounds.bottom;
    }
  }

  /**
   * Check if a block is properly aligned with this exit
   * (i.e., positioned at the perimeter edge)
   */
  public isBlockAligned(blockBounds: Bounds, tolerance: number = 5): boolean {
    const exitBounds = this.getWorldBounds();

    switch (this.side) {
      case 'top':
        return Math.abs(blockBounds.top - exitBounds.top) <= tolerance;

      case 'bottom':
        return Math.abs(blockBounds.bottom - exitBounds.bottom) <= tolerance;

      case 'left':
        return Math.abs(blockBounds.left - exitBounds.left) <= tolerance;

      case 'right':
        return Math.abs(blockBounds.right - exitBounds.right) <= tolerance;
    }
  }

  /**
   * Render the exit zone
   */
  public render(): void {
    this.graphics.clear();

    const bounds = this.getWorldBounds();
    const colorValue = this.getColorValue();
    const cornerRadius = this.grid.wallThickness / 4;

    // Draw the colored exit zone
    this.graphics.fillStyle(colorValue, 0.9);
    this.graphics.fillRoundedRect(
      bounds.left,
      bounds.top,
      bounds.right - bounds.left,
      bounds.bottom - bounds.top,
      cornerRadius
    );

    // Add a lighter highlight for depth
    this.graphics.fillStyle(0xffffff, 0.2);
    this.graphics.fillRoundedRect(
      bounds.left + 2,
      bounds.top + 2,
      (bounds.right - bounds.left) - 4,
      (bounds.bottom - bounds.top) / 3,
      cornerRadius
    );
  }

  /**
   * Destroy the exit zone
   */
  public destroy(): void {
    this.graphics.destroy();
  }
}
