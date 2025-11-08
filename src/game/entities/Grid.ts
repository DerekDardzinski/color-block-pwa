import Phaser from 'phaser';

export interface GridConfig {
  scene: Phaser.Scene;
  rows: number;
  cols: number;
  x: number;
  y: number;
  maxWidth: number;
  maxHeight: number;
}

export interface GridPosition {
  row: number;
  col: number;
}

export interface WorldPosition {
  x: number;
  y: number;
}

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export class Grid {
  private scene: Phaser.Scene;
  public rows: number;
  public cols: number;
  public cellSize: number;
  public x: number;
  public y: number;
  public wallThickness: number;

  // Track which cells are occupied and by what
  private cells: Array<Array<any>>;

  // Graphics object for rendering
  private graphics: Phaser.GameObjects.Graphics;

  constructor(config: GridConfig) {
    this.scene = config.scene;
    this.rows = config.rows;
    this.cols = config.cols;
    this.x = config.x;
    this.y = config.y;

    // Calculate wall thickness and cell size properly
    // We need to account for walls in the calculation
    const tempCellSize = Math.min(
      config.maxWidth / (this.cols + 0.67),
      config.maxHeight / (this.rows + 0.67)
    );
    this.wallThickness = Math.floor(tempCellSize / 3);

    // Now calculate actual cell size with wall thickness known
    this.cellSize = this.calculateCellSize(config.maxWidth, config.maxHeight);

    // Initialize cell occupancy tracking
    this.cells = [];
    for (let row = 0; row < this.rows; row++) {
      this.cells[row] = [];
      for (let col = 0; col < this.cols; col++) {
        this.cells[row][col] = null;
      }
    }

    // Create graphics object for rendering
    this.graphics = this.scene.add.graphics();
  }

  private calculateCellSize(maxWidth: number, maxHeight: number): number {
    // Account for wall thickness on all sides
    const availableWidth = maxWidth - this.wallThickness * 2;
    const availableHeight = maxHeight - this.wallThickness * 2;

    // Calculate cell size based on grid dimensions
    const cellWidth = availableWidth / this.cols;
    const cellHeight = availableHeight / this.rows;

    // Use the smaller dimension to ensure grid fits
    return Math.floor(Math.min(cellWidth, cellHeight));
  }

  /**
   * Convert world coordinates to grid position
   */
  public worldToGrid(worldX: number, worldY: number): GridPosition {
    const relativeX = worldX - (this.x + this.wallThickness);
    const relativeY = worldY - (this.y + this.wallThickness);

    const col = Math.floor(relativeX / this.cellSize);
    const row = Math.floor(relativeY / this.cellSize);

    return { row, col };
  }

  /**
   * Convert grid position to world coordinates (top-left of cell)
   */
  public gridToWorld(row: number, col: number): WorldPosition {
    const x = this.x + this.wallThickness + (col * this.cellSize);
    const y = this.y + this.wallThickness + (row * this.cellSize);

    return { x, y };
  }

  /**
   * Check if a grid position is within bounds
   */
  public isInBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  /**
   * Check if a cell is occupied
   */
  public isCellOccupied(row: number, col: number): boolean {
    if (!this.isInBounds(row, col)) {
      return true; // Out of bounds = occupied
    }
    return this.cells[row][col] !== null;
  }

  /**
   * Get what occupies a cell (null if empty)
   */
  public getCellOccupant(row: number, col: number): any {
    if (!this.isInBounds(row, col)) {
      return null;
    }
    return this.cells[row][col];
  }

  /**
   * Set a cell as occupied by an entity
   */
  public setCellOccupied(row: number, col: number, occupant: any): void {
    if (this.isInBounds(row, col)) {
      this.cells[row][col] = occupant;
    }
  }

  /**
   * Clear a cell
   */
  public clearCell(row: number, col: number): void {
    if (this.isInBounds(row, col)) {
      this.cells[row][col] = null;
    }
  }

  /**
   * Clear all cells occupied by a specific entity
   */
  public clearEntity(entity: any): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (this.cells[row][col] === entity) {
          this.cells[row][col] = null;
        }
      }
    }
  }

  /**
   * Get the world bounds of the grid (including walls)
   */
  public getWorldBounds(): Bounds {
    return {
      left: this.x,
      right: this.x + this.wallThickness * 2 + this.cols * this.cellSize,
      top: this.y,
      bottom: this.y + this.wallThickness * 2 + this.rows * this.cellSize
    };
  }

  /**
   * Get the playable area bounds (excluding walls)
   */
  public getPlayableBounds(): Bounds {
    return {
      left: this.x + this.wallThickness,
      right: this.x + this.wallThickness + this.cols * this.cellSize,
      top: this.y + this.wallThickness,
      bottom: this.y + this.wallThickness + this.rows * this.cellSize
    };
  }

  /**
   * Render the grid (called after construction and on updates)
   */
  public render(): void {
    this.graphics.clear();

    const bounds = this.getWorldBounds();
    const playable = this.getPlayableBounds();

    // Draw perimeter wall (dark gray rounded rectangle)
    this.graphics.fillStyle(0x2c3e50, 1);
    this.graphics.fillRoundedRect(
      bounds.left,
      bounds.top,
      bounds.right - bounds.left,
      bounds.bottom - bounds.top,
      this.wallThickness / 2
    );

    // Draw playable area (lighter background)
    this.graphics.fillStyle(0x34495e, 0.3);
    this.graphics.fillRect(
      playable.left,
      playable.top,
      playable.right - playable.left,
      playable.bottom - playable.top
    );

    // Draw grid lines
    this.graphics.lineStyle(1, 0x7f8c8d, 0.3);

    // Vertical lines
    for (let col = 0; col <= this.cols; col++) {
      const x = playable.left + col * this.cellSize;
      this.graphics.lineBetween(x, playable.top, x, playable.bottom);
    }

    // Horizontal lines
    for (let row = 0; row <= this.rows; row++) {
      const y = playable.top + row * this.cellSize;
      this.graphics.lineBetween(playable.left, y, playable.right, y);
    }
  }

  /**
   * Destroy the grid
   */
  public destroy(): void {
    this.graphics.destroy();
  }
}
