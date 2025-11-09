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
  private shapeOriginOffset: CellOffset; // Offset from gridPosition to actual top-left cell

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
    // Get shape offsets and find the minimum to normalize
    const rawOffsets = getShapeOffsets(config.shape);
    const minRow = Math.min(...rawOffsets.map(o => o.row));
    const minCol = Math.min(...rawOffsets.map(o => o.col));

    // Position container at the actual top-left cell position (accounting for shape offset)
    const worldPos = config.grid.gridToWorld(
      config.gridPosition.row + minRow,
      config.gridPosition.col + minCol
    );
    super(config.scene, worldPos.x, worldPos.y);

    this.id = config.id;
    this.color = config.color;
    this.shape = config.shape;
    this.gridPosition = { ...config.gridPosition };
    this.lastValidPosition = { ...config.gridPosition };
    this.grid = config.grid;
    this.cellSize = config.grid.cellSize;

    // Store the shape origin offset for later use
    this.shapeOriginOffset = { row: minRow, col: minCol };

    // Normalize offsets so they start from (0, 0) relative to container
    this.shapeOffsets = rawOffsets.map(offset => ({
      row: offset.row - minRow,
      col: offset.col - minCol
    }));

    // Create graphics for rendering
    this.graphics = config.scene.add.graphics();
    this.add(this.graphics);

    // Render the block
    this.renderBlock();

    // Add to scene
    config.scene.add.existing(this);

    // Enable interactive with accurate hit area (only actual block cells, not bounding box)
    // After normalization, shapeOffsets always start at (0, 0)
    const hitMaxCol = Math.max(...this.shapeOffsets.map(o => o.col));
    const hitMaxRow = Math.max(...this.shapeOffsets.map(o => o.row));
    const hitAreaWidth = (hitMaxCol + 1) * this.cellSize;
    const hitAreaHeight = (hitMaxRow + 1) * this.cellSize;

    this.setSize(hitAreaWidth, hitAreaHeight);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, hitAreaWidth, hitAreaHeight),
      Phaser.Geom.Rectangle.Contains
    );

    // Override hitTestPointer for precise shape-based detection
    if (this.input) {
      this.input.hitAreaCallback = (_hitArea: Phaser.Geom.Rectangle, x: number, y: number) => {
        // Check if x,y falls within any of the actual shape cells
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return this.shapeOffsets.some(offset =>
          offset.row === row && offset.col === col
        );
      };
    }

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
    const cornerRadius = cellSize * 0.2;
    const baseColor = this.getColorValue();
    const darkColor = this.getDarkerColor(baseColor);
    const lightColor = this.getLighterColor(baseColor);
    const studRadius = cellSize * 0.12;

    // Draw continuous polygon shape
    this.drawContinuousShape(baseColor, cornerRadius);

    // Add subtle shadow gradient at bottom
    const maxRow = Math.max(...this.shapeOffsets.map(o => o.row));
    const maxCol = Math.max(...this.shapeOffsets.map(o => o.col));
    const width = (maxCol + 1) * cellSize;
    const height = (maxRow + 1) * cellSize;

    // Bottom shadow gradient
    this.graphics.fillGradientStyle(darkColor, darkColor, 0x000000, 0x000000, 0.15, 0.15, 0, 0.05);
    this.graphics.fillRect(0, height * 0.75, width, height * 0.25);

    // Top highlight
    this.graphics.fillGradientStyle(0xffffff, 0xffffff, 0xffffff, 0xffffff, 0.3, 0.3, 0.1, 0.1);
    this.graphics.fillRect(cornerRadius, cornerRadius, width - cornerRadius * 2, height * 0.15);

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
   * Draw the shape as a continuous polygon with rounded outer edges
   */
  private drawContinuousShape(color: number, cornerRadius: number): void {
    const cellSize = this.cellSize;

    // Create a cell occupancy map for quick lookup
    const cellMap = new Set(this.shapeOffsets.map(o => `${o.row},${o.col}`));
    const hasCell = (row: number, col: number) => cellMap.has(`${row},${col}`);

    // Build list of all edge segments
    interface EdgeSegment {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      type: 'horizontal' | 'vertical';
    }

    const edges: EdgeSegment[] = [];

    this.shapeOffsets.forEach(({ row, col }) => {
      const x = col * cellSize;
      const y = row * cellSize;

      // Top edge (if no cell above)
      if (!hasCell(row - 1, col)) {
        edges.push({ x1: x, y1: y, x2: x + cellSize, y2: y, type: 'horizontal' });
      }
      // Bottom edge (if no cell below)
      if (!hasCell(row + 1, col)) {
        edges.push({ x1: x, y1: y + cellSize, x2: x + cellSize, y2: y + cellSize, type: 'horizontal' });
      }
      // Left edge (if no cell to left)
      if (!hasCell(row, col - 1)) {
        edges.push({ x1: x, y1: y, x2: x, y2: y + cellSize, type: 'vertical' });
      }
      // Right edge (if no cell to right)
      if (!hasCell(row, col + 1)) {
        edges.push({ x1: x + cellSize, y1: y, x2: x + cellSize, y2: y + cellSize, type: 'vertical' });
      }
    });

    // For now, use a simpler approach: draw filled rectangles then merge
    // This creates the continuous shape effect without complex path tracing
    this.graphics.fillStyle(color, 1);
    this.graphics.beginPath();

    this.shapeOffsets.forEach(({ row, col }) => {
      const x = col * cellSize;
      const y = row * cellSize;
      this.graphics.fillRect(x, y, cellSize, cellSize);
    });

    // Draw rounded corners at outer corners only
    this.shapeOffsets.forEach(({ row, col }) => {
      const x = col * cellSize;
      const y = row * cellSize;

      // Check if this cell has an outer corner
      const hasLeft = hasCell(row, col - 1);
      const hasRight = hasCell(row, col + 1);
      const hasTop = hasCell(row - 1, col);
      const hasBottom = hasCell(row + 1, col);
      const hasTopLeft = hasCell(row - 1, col - 1);
      const hasTopRight = hasCell(row - 1, col + 1);
      const hasBottomLeft = hasCell(row + 1, col - 1);
      const hasBottomRight = hasCell(row + 1, col + 1);

      // Draw rounded corners at outer convex corners
      if (!hasTop && !hasLeft) {
        // Top-left outer corner
        this.graphics.fillStyle(color, 1);
        this.graphics.beginPath();
        this.graphics.arc(x + cornerRadius, y + cornerRadius, cornerRadius, Math.PI, Math.PI * 1.5);
        this.graphics.lineTo(x + cornerRadius, y + cornerRadius);
        this.graphics.closePath();
        this.graphics.fillPath();
      }

      if (!hasTop && !hasRight) {
        // Top-right outer corner
        this.graphics.fillStyle(color, 1);
        this.graphics.beginPath();
        this.graphics.arc(x + cellSize - cornerRadius, y + cornerRadius, cornerRadius, Math.PI * 1.5, 0);
        this.graphics.lineTo(x + cellSize - cornerRadius, y + cornerRadius);
        this.graphics.closePath();
        this.graphics.fillPath();
      }

      if (!hasBottom && !hasLeft) {
        // Bottom-left outer corner
        this.graphics.fillStyle(color, 1);
        this.graphics.beginPath();
        this.graphics.arc(x + cornerRadius, y + cellSize - cornerRadius, cornerRadius, Math.PI * 0.5, Math.PI);
        this.graphics.lineTo(x + cornerRadius, y + cellSize - cornerRadius);
        this.graphics.closePath();
        this.graphics.fillPath();
      }

      if (!hasBottom && !hasRight) {
        // Bottom-right outer corner
        this.graphics.fillStyle(color, 1);
        this.graphics.beginPath();
        this.graphics.arc(x + cellSize - cornerRadius, y + cellSize - cornerRadius, cornerRadius, 0, Math.PI * 0.5);
        this.graphics.lineTo(x + cellSize - cornerRadius, y + cellSize - cornerRadius);
        this.graphics.closePath();
        this.graphics.fillPath();
      }

      // Fill in inner concave corners
      if (hasTop && hasLeft && !hasTopLeft) {
        this.graphics.fillStyle(color, 1);
        this.graphics.fillCircle(x, y, cornerRadius * 0.5);
      }
      if (hasTop && hasRight && !hasTopRight) {
        this.graphics.fillStyle(color, 1);
        this.graphics.fillCircle(x + cellSize, y, cornerRadius * 0.5);
      }
      if (hasBottom && hasLeft && !hasBottomLeft) {
        this.graphics.fillStyle(color, 1);
        this.graphics.fillCircle(x, y + cellSize, cornerRadius * 0.5);
      }
      if (hasBottom && hasRight && !hasBottomRight) {
        this.graphics.fillStyle(color, 1);
        this.graphics.fillCircle(x + cellSize, y + cellSize, cornerRadius * 0.5);
      }
    });
  }

  /**
   * Get all grid cells this block occupies
   */
  public getOccupiedCells(): GridPosition[] {
    // Add back the shape origin offset since shapeOffsets are normalized
    return this.shapeOffsets.map(offset => ({
      row: this.gridPosition.row + offset.row + this.shapeOriginOffset.row,
      col: this.gridPosition.col + offset.col + this.shapeOriginOffset.col
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

    // Add back shape origin offset since offsets are normalized
    const topLeft = this.grid.gridToWorld(
      this.gridPosition.row + minRow + this.shapeOriginOffset.row,
      this.gridPosition.col + minCol + this.shapeOriginOffset.col
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
    // Position container at actual top-left cell (accounting for shape offset)
    const worldPos = this.grid.gridToWorld(
      row + this.shapeOriginOffset.row,
      col + this.shapeOriginOffset.col
    );
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
