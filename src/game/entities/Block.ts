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
        // Phaser centers hit areas on Containers, requiring dynamic offset compensation
        // Formula: offset = -(hitArea size / 2 + cellSize / 2)
        // This works for all block shapes automatically
        const adjustedX = x - (hitAreaWidth / 2 + this.cellSize / 2);
        const adjustedY = y - (hitAreaHeight / 2 + this.cellSize / 2);

        // Use Math.round to handle cell boundaries correctly (not Math.floor)
        const col = Math.round(adjustedX / this.cellSize);
        const row = Math.round(adjustedY / this.cellSize);

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
    const r = ((baseColor >> 16) & 0xff) * 0.6;
    const g = ((baseColor >> 8) & 0xff) * 0.6;
    const b = (baseColor & 0xff) * 0.6;
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Get a lighter shade of the color for highlights
   */
  private getLighterColor(baseColor: number): number {
    const r = Math.min(255, ((baseColor >> 16) & 0xff) * 1.4);
    const g = Math.min(255, ((baseColor >> 8) & 0xff) * 1.4);
    const b = Math.min(255, (baseColor & 0xff) * 1.4);
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Get a very light shade for strong highlights
   */
  private getHighlightColor(baseColor: number): number {
    const r = Math.min(255, ((baseColor >> 16) & 0xff) + 80);
    const g = Math.min(255, ((baseColor >> 8) & 0xff) + 80);
    const b = Math.min(255, (baseColor & 0xff) + 80);
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
    const studRadius = cellSize * 0.13;

    // Draw layers in order (back to front)
    this.drawDropShadow();
    this.drawContinuousShape(baseColor, cornerRadius);
    this.drawStuds(baseColor, studRadius);

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
   * Draw a rounded path using marching squares for grid-based shapes
   * Checks 2×2 cell patterns to determine corner types with fixed angles
   */
  private drawRoundedPath(
    points: { x: number; y: number }[],
    cornerRadius: number,
    offsetX: number = 0,
    offsetY: number = 0
  ): void {
    if (points.length < 3) return;

    const cellSize = this.cellSize;
    const cellMap = new Set(this.shapeOffsets.map(o => `${o.row},${o.col}`));
    const hasCell = (row: number, col: number) => cellMap.has(`${row},${col}`);

    this.graphics.beginPath();
    let isFirstPoint = true;

    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];

      // Convert corner point to grid coordinates
      const gridRow = Math.round(curr.y / cellSize);
      const gridCol = Math.round(curr.x / cellSize);

      // Check 2×2 block of cells around this corner point
      // Corner (gridRow, gridCol) is surrounded by:
      const hasNW = hasCell(gridRow - 1, gridCol - 1); // Northwest cell
      const hasNE = hasCell(gridRow - 1, gridCol);     // Northeast cell
      const hasSW = hasCell(gridRow, gridCol - 1);     // Southwest cell
      const hasSE = hasCell(gridRow, gridCol);         // Southeast cell

      const cellCount = (hasNW ? 1 : 0) + (hasNE ? 1 : 0) + (hasSW ? 1 : 0) + (hasSE ? 1 : 0);

      // Skip interior points (4 cells) or empty points (0 cells)
      if (cellCount === 0 || cellCount === 4) {
        if (isFirstPoint) {
          this.graphics.moveTo(curr.x + offsetX, curr.y + offsetY);
          isFirstPoint = false;
        } else {
          this.graphics.lineTo(curr.x + offsetX, curr.y + offsetY);
        }
        continue;
      }

      const radius = cornerRadius;
      const PI = Math.PI;

      // Determine corner type and draw appropriate arc
      // CONVEX CORNERS (1 cell) - outer corners
      if (cellCount === 1) {
        let arcCenterX, arcCenterY, startAngle, endAngle, t1x, t1y;

        if (hasSE) { // Only SE cell exists → convex corner at NW
          arcCenterX = curr.x + radius;
          arcCenterY = curr.y + radius;
          startAngle = PI;       // 180° (pointing left)
          endAngle = PI * 1.5;   // 270° (pointing up)
          t1x = curr.x;
          t1y = curr.y + radius;
        } else if (hasSW) { // Only SW cell exists → convex corner at NE
          arcCenterX = curr.x - radius;
          arcCenterY = curr.y + radius;
          startAngle = PI * 1.5; // 270° (pointing up)
          endAngle = 0;          // 0° (pointing right)
          t1x = curr.x - radius;
          t1y = curr.y;
        } else if (hasNE) { // Only NE cell exists → convex corner at SW
          arcCenterX = curr.x + radius;
          arcCenterY = curr.y - radius;
          startAngle = PI * 0.5; // 90° (pointing down)
          endAngle = PI;         // 180° (pointing left)
          t1x = curr.x + radius;
          t1y = curr.y;
        } else { // hasNW - Only NW cell exists → convex corner at SE
          arcCenterX = curr.x - radius;
          arcCenterY = curr.y - radius;
          startAngle = 0;        // 0° (pointing right)
          endAngle = PI * 0.5;   // 90° (pointing down)
          t1x = curr.x;
          t1y = curr.y - radius;
        }

        if (isFirstPoint) {
          this.graphics.moveTo(t1x + offsetX, t1y + offsetY);
          isFirstPoint = false;
        } else {
          this.graphics.lineTo(t1x + offsetX, t1y + offsetY);
        }
        this.graphics.arc(arcCenterX + offsetX, arcCenterY + offsetY, radius, startAngle, endAngle, false);
      }
      // CONCAVE CORNERS (3 cells) - inner corners
      else if (cellCount === 3) {
        let arcCenterX, arcCenterY, startAngle, endAngle, t1x, t1y;

        if (!hasNW) { // Missing NW → concave corner pointing SE
          arcCenterX = curr.x - radius;
          arcCenterY = curr.y - radius;
          startAngle = PI * 0.5;  // 90° (down)
          endAngle = 0;           // 0° (right)
          t1x = curr.x - radius;
          t1y = curr.y;
        } else if (!hasNE) { // Missing NE → concave corner pointing SW
          arcCenterX = curr.x + radius;
          arcCenterY = curr.y - radius;
          startAngle = PI;        // 180° (left)
          endAngle = PI * 0.5;    // 90° (down)
          t1x = curr.x;
          t1y = curr.y - radius;
        } else if (!hasSW) { // Missing SW → concave corner pointing NE
          arcCenterX = curr.x - radius;
          arcCenterY = curr.y + radius;
          startAngle = 0;         // 0° (right)
          endAngle = PI * 1.5;    // 270° (up)
          t1x = curr.x;
          t1y = curr.y + radius; 
        } else { // !hasSE - Missing SE → concave corner pointing NW
          arcCenterX = curr.x + radius;
          arcCenterY = curr.y + radius;
          startAngle = PI * 1.5;       // 270° (pointing down)
          endAngle = PI;   // 180° (pointing left)
          t1x = curr.x + radius;
          t1y = curr.y;
        }

        if (isFirstPoint) {
          this.graphics.moveTo(t1x + offsetX, t1y + offsetY);
          isFirstPoint = false;
        } else {
          this.graphics.lineTo(t1x + offsetX, t1y + offsetY);
        }
        this.graphics.arc(arcCenterX + offsetX, arcCenterY + offsetY, radius, startAngle, endAngle, true);
      }
      // STRAIGHT EDGES (2 adjacent cells) - just draw line
      else {
        if (isFirstPoint) {
          this.graphics.moveTo(curr.x + offsetX, curr.y + offsetY);
          isFirstPoint = false;
        } else {
          this.graphics.lineTo(curr.x + offsetX, curr.y + offsetY);
        }
      }
    }

    this.graphics.closePath();
  }

  /**
   * Draw drop shadow beneath the block using rounded path
   */
  private drawDropShadow(): void {
    const shadowOffset = 4;
    const cornerRadius = this.cellSize * 0.15;

    // Build the outer edge path
    const edgePath = this.buildOuterEdgePath();

    // Draw shadow with offset
    this.graphics.fillStyle(0x000000, 0.25);
    this.drawRoundedPath(edgePath, cornerRadius, shadowOffset, shadowOffset);
    this.graphics.fillPath();
  }

  /**
   * Draw 3D-looking LEGO studs
   */
  private drawStuds(baseColor: number, studRadius: number): void {
    const cellSize = this.cellSize;
    const lightColor = this.getLighterColor(baseColor);
    const highlightColor = this.getHighlightColor(baseColor);
    const shadowColor = this.getDarkerColor(baseColor);

    this.shapeOffsets.forEach(offset => {
      const x = offset.col * cellSize;
      const y = offset.row * cellSize;

      const studSpacing = cellSize / 2;
      const studOffsetX = cellSize / 4;
      const studOffsetY = cellSize / 4;

      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const studX = x + studOffsetX + col * studSpacing;
          const studY = y + studOffsetY + row * studSpacing;

          // Draw stud shadow first (slightly offset down-right)
          this.graphics.fillStyle(shadowColor, 0.6);
          this.graphics.fillCircle(studX + 1, studY + 1, studRadius * 0.9);

          // Draw main stud with gradient (fake 3D sphere)
          // Outer ring (shadow)
          this.graphics.fillStyle(baseColor, 1);
          this.graphics.fillCircle(studX, studY, studRadius);

          // Middle ring (lighter)
          this.graphics.fillStyle(lightColor, 1);
          this.graphics.fillCircle(studX, studY, studRadius * 0.8);

          // Inner highlight (off-center for lighting direction)
          this.graphics.fillStyle(highlightColor, 1);
          this.graphics.fillCircle(studX - studRadius * 0.3, studY - studRadius * 0.3, studRadius * 0.5);

          // Bright spot
          this.graphics.fillStyle(0xffffff, 0.7);
          this.graphics.fillCircle(studX - studRadius * 0.4, studY - studRadius * 0.4, studRadius * 0.25);
        }
      }
    });
  }

  /**
   * Build the outer edge path for the block shape
   * Returns an ordered array of points tracing the perimeter clockwise
   */
  private buildOuterEdgePath(): { x: number; y: number }[] {
    const cellSize = this.cellSize;
    const cellMap = new Set(this.shapeOffsets.map(o => `${o.row},${o.col}`));
    const hasCell = (row: number, col: number) => cellMap.has(`${row},${col}`);

    // Collect all edge segments (each edge is defined by two vertices)
    interface EdgeSegment {
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      direction: 'N' | 'E' | 'S' | 'W';
    }

    const edges: EdgeSegment[] = [];

    // For each cell, find perimeter edges
    this.shapeOffsets.forEach(({ row, col }) => {
      const x = col * cellSize;
      const y = row * cellSize;

      // Top edge (if no cell above)
      if (!hasCell(row - 1, col)) {
        edges.push({ x1: x, y1: y, x2: x + cellSize, y2: y, direction: 'N' });
      }
      // Right edge (if no cell to right)
      if (!hasCell(row, col + 1)) {
        edges.push({ x1: x + cellSize, y1: y, x2: x + cellSize, y2: y + cellSize, direction: 'E' });
      }
      // Bottom edge (if no cell below)
      if (!hasCell(row + 1, col)) {
        edges.push({ x1: x + cellSize, y1: y + cellSize, x2: x, y2: y + cellSize, direction: 'S' });
      }
      // Left edge (if no cell to left)
      if (!hasCell(row, col - 1)) {
        edges.push({ x1: x, y1: y + cellSize, x2: x, y2: y, direction: 'W' });
      }
    });

    // Build continuous path by connecting edges
    const path: { x: number; y: number }[] = [];
    const visited = new Set<number>();

    // Start with the first edge
    if (edges.length === 0) return [];

    let currentEdge = edges[0];
    visited.add(0);
    path.push({ x: currentEdge.x1, y: currentEdge.y1 });

    // Follow the path by finding connecting edges
    while (visited.size < edges.length) {
      const endX = currentEdge.x2;
      const endY = currentEdge.y2;

      path.push({ x: endX, y: endY });

      // Find next edge that starts where current edge ends
      let foundNext = false;
      for (let i = 0; i < edges.length; i++) {
        if (visited.has(i)) continue;

        const edge = edges[i];
        const dist = Math.abs(edge.x1 - endX) + Math.abs(edge.y1 - endY);

        if (dist < 0.1) {
          currentEdge = edge;
          visited.add(i);
          foundNext = true;
          break;
        }
      }

      if (!foundNext) break;
    }

    // Close the polygon by adding the first point at the end
    if (path.length > 0) {
      path.push({ x: path[0].x, y: path[0].y });
    }

    return path;
  }

  /**
   * Draw the shape as a continuous rounded polygon
   */
  private drawContinuousShape(color: number, _cornerRadius: number): void {
    const cornerRadius = this.cellSize * 0.15;

    // Build the outer edge path
    const edgePath = this.buildOuterEdgePath();

    const lightColor = this.getLighterColor(color);

    // Draw base shape
    this.graphics.fillStyle(color, 1);
    this.drawRoundedPath(edgePath, cornerRadius);
    this.graphics.fillPath();

    // Optional: Add subtle edge highlight for 3D effect
    this.graphics.lineStyle(2, lightColor, 0.2);
    this.drawRoundedPath(edgePath, cornerRadius);
    this.graphics.strokePath();
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
   * Get world-space bounding boxes for each cell at a specific position
   * Used for precise collision detection during dragging
   */
  public getWorldCellPositionsAt(worldX: number, worldY: number): Bounds[] {
    const cellBounds: Bounds[] = [];

    // For each cell in the shape, calculate its world bounds
    this.shapeOffsets.forEach(offset => {
      const cellWorldX = worldX + offset.col * this.cellSize;
      const cellWorldY = worldY + offset.row * this.cellSize;

      cellBounds.push({
        left: cellWorldX,
        top: cellWorldY,
        right: cellWorldX + this.cellSize,
        bottom: cellWorldY + this.cellSize
      });
    });

    return cellBounds;
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
