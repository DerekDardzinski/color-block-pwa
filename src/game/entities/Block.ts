import Phaser from 'phaser';
import { Grid, GridPosition, Bounds } from './Grid';
import { ShapeType, getShapeOffsets, CellOffset } from '../data/shapes';

export interface BlockConfig {
  scene: Phaser.Scene;
  grid: Grid;
  id: string;
  color: string;
  shape: ShapeType;
  gridPosition: GridPosition;
}

export class Block extends Phaser.GameObjects.Container {
  public id: string;
  public color: string;
  public shape: ShapeType;
  public gridPosition: GridPosition;
  public shapeOffsets: CellOffset[];
  public isDragging: boolean = false;
  public dragOffset: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  public lastValidPosition: GridPosition;

  private grid: Grid;
  private cellSize: number;
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

  constructor(config: BlockConfig) {
    const worldPos = config.grid.gridToWorld(config.gridPosition.row, config.gridPosition.col);
    super(config.scene, worldPos.x, worldPos.y);

    this.id = config.id;
    this.color = config.color;
    this.shape = config.shape;
    this.gridPosition = { ...config.gridPosition };
    this.lastValidPosition = { ...config.gridPosition };
    this.grid = config.grid;
    this.cellSize = config.grid.cellSize;
    this.shapeOffsets = getShapeOffsets(config.shape);

    // Create graphics for rendering
    this.graphics = config.scene.add.graphics();
    this.add(this.graphics);

    // Render the block
    this.renderBlock();

    // Add to scene
    config.scene.add.existing(this);

    // Enable interactive with accurate hit area (only actual block cells, not bounding box)
    const maxCol = Math.max(...this.shapeOffsets.map(o => o.col));
    const maxRow = Math.max(...this.shapeOffsets.map(o => o.row));
    const hitAreaWidth = (maxCol + 1) * this.cellSize;
    const hitAreaHeight = (maxRow + 1) * this.cellSize;

    this.setSize(hitAreaWidth, hitAreaHeight);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, hitAreaWidth, hitAreaHeight),
      (_hitArea: Phaser.Geom.Rectangle, x: number, y: number) => {
        // Check if x,y falls within any of the actual shape cells
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return this.shapeOffsets.some(offset =>
          offset.row === row && offset.col === col
        );
      }
    );

    // Mark cells as occupied
    this.updateGridOccupancy();
  }

  /**
   * Get the color value for this block
   */
  private getColorValue(): number {
    return Block.colorMap[this.color.toLowerCase()] || 0xffffff;
  }

  /**
   * Get a darker shade of the color for shadows
   */
  private getDarkerColor(baseColor: number): number {
    const r = ((baseColor >> 16) & 0xff) * 0.7;
    const g = ((baseColor >> 8) & 0xff) * 0.7;
    const b = (baseColor & 0xff) * 0.7;
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Get a lighter shade of the color for highlights
   */
  private getLighterColor(baseColor: number): number {
    const r = Math.min(255, ((baseColor >> 16) & 0xff) * 1.3);
    const g = Math.min(255, ((baseColor >> 8) & 0xff) * 1.3);
    const b = Math.min(255, (baseColor & 0xff) * 1.3);
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Render the block as a continuous LEGO-style shape
   */
  private renderBlock(): void {
    this.graphics.clear();

    const cellSize = this.cellSize;
    const cornerRadius = cellSize * 0.15;
    const baseColor = this.getColorValue();
    const darkColor = this.getDarkerColor(baseColor);
    const lightColor = this.getLighterColor(baseColor);
    const studRadius = cellSize * 0.12;

    // Draw each cell WITHOUT gaps to create continuous shape
    this.shapeOffsets.forEach(offset => {
      const x = offset.col * cellSize;
      const y = offset.row * cellSize;

      // Draw main cell body (no gaps - cells touch seamlessly)
      this.graphics.fillStyle(baseColor, 1);
      this.graphics.fillRoundedRect(x, y, cellSize, cellSize, cornerRadius);
    });

    // Add shadow and highlight on top of continuous shape
    this.shapeOffsets.forEach(offset => {
      const x = offset.col * cellSize;
      const y = offset.row * cellSize;

      // Add shadow at bottom of each cell
      this.graphics.fillStyle(darkColor, 0.2);
      this.graphics.fillRoundedRect(
        x + 2,
        y + cellSize - cellSize * 0.2,
        cellSize - 4,
        cellSize * 0.15,
        cornerRadius * 0.5
      );

      // Add highlight at top of each cell
      this.graphics.fillStyle(0xffffff, 0.25);
      this.graphics.fillRoundedRect(
        x + 2,
        y + 2,
        cellSize - 4,
        cellSize * 0.2,
        cornerRadius * 0.5
      );
    });

    // Draw LEGO studs on top
    this.shapeOffsets.forEach(offset => {
      const x = offset.col * cellSize;
      const y = offset.row * cellSize;

      const studSpacing = cellSize / 3;
      const studOffsetX = studSpacing;
      const studOffsetY = studSpacing;

      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const studX = x + studOffsetX + col * studSpacing;
          const studY = y + studOffsetY + row * studSpacing;

          // Draw stud circle
          this.graphics.fillStyle(lightColor, 1);
          this.graphics.fillCircle(studX, studY, studRadius);

          // Add small highlight on stud
          this.graphics.fillStyle(0xffffff, 0.4);
          this.graphics.fillCircle(studX - studRadius * 0.3, studY - studRadius * 0.3, studRadius * 0.5);
        }
      }
    });

    // Add depth to the container if being dragged
    if (this.isDragging) {
      this.setScale(1.05);
      this.setDepth(1000);
    } else {
      this.setScale(1);
      this.setDepth(100);
    }
  }

  /**
   * Get all grid cells this block occupies
   */
  public getOccupiedCells(): GridPosition[] {
    return this.shapeOffsets.map(offset => ({
      row: this.gridPosition.row + offset.row,
      col: this.gridPosition.col + offset.col
    }));
  }

  /**
   * Get the world bounds of the block
   */
  public getWorldBounds(): Bounds {
    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;

    this.shapeOffsets.forEach(offset => {
      minRow = Math.min(minRow, offset.row);
      maxRow = Math.max(maxRow, offset.row);
      minCol = Math.min(minCol, offset.col);
      maxCol = Math.max(maxCol, offset.col);
    });

    const topLeft = this.grid.gridToWorld(
      this.gridPosition.row + minRow,
      this.gridPosition.col + minCol
    );

    return {
      left: topLeft.x,
      top: topLeft.y,
      right: topLeft.x + (maxCol - minCol + 1) * this.cellSize,
      bottom: topLeft.y + (maxRow - minRow + 1) * this.cellSize
    };
  }

  /**
   * Update grid occupancy data
   */
  public updateGridOccupancy(): void {
    // Clear previous occupancy
    this.grid.clearEntity(this);

    // Set new occupancy
    this.getOccupiedCells().forEach(cell => {
      this.grid.setCellOccupied(cell.row, cell.col, this);
    });
  }

  /**
   * Set block position in world coordinates
   */
  public setWorldPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Set block position in grid coordinates
   */
  public setGridPosition(row: number, col: number): void {
    this.gridPosition = { row, col };
    const worldPos = this.grid.gridToWorld(row, col);
    this.setWorldPosition(worldPos.x, worldPos.y);
    this.updateGridOccupancy();
    this.lastValidPosition = { row, col };
  }

  /**
   * Start dragging
   */
  public startDrag(pointer: Phaser.Input.Pointer): void {
    this.isDragging = true;
    this.dragOffset.x = this.x - pointer.x;
    this.dragOffset.y = this.y - pointer.y;
    this.grid.clearEntity(this);
    this.renderBlock();
  }

  /**
   * Update drag position
   */
  public updateDrag(x: number, y: number): void {
    if (this.isDragging) {
      this.setWorldPosition(x, y);
    }
  }

  /**
   * End dragging
   */
  public endDrag(): void {
    this.isDragging = false;
    this.renderBlock();
  }

  /**
   * Snap to nearest grid position with animation
   */
  public snapToGrid(): void {
    const gridPos = this.grid.worldToGrid(this.x, this.y);
    const worldPos = this.grid.gridToWorld(gridPos.row, gridPos.col);

    this.scene.tweens.add({
      targets: this,
      x: worldPos.x,
      y: worldPos.y,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.gridPosition = gridPos;
        this.updateGridOccupancy();
        this.lastValidPosition = { ...gridPos };
      }
    });
  }

  /**
   * Remove the block with animation
   */
  public removeBlock(): void {
    this.grid.clearEntity(this);

    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.destroy();
      }
    });
  }

  /**
   * Destroy the block
   */
  public destroy(fromScene?: boolean): void {
    this.grid.clearEntity(this);
    this.graphics.destroy();
    super.destroy(fromScene);
  }
}
