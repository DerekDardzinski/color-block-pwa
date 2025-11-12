import { Block } from '../entities/Block';
import { Grid, Bounds, GridPosition } from '../entities/Grid';
import { ExitZone } from '../entities/ExitZone';

export interface CollisionInfo {
  hasCollision: boolean;
  collidesX: boolean;
  collidesY: boolean;
  validPosition: { x: number; y: number };
}

export class CollisionDetector {
  public grid: Grid;
  private obstacles: GridPosition[];

  constructor(grid: Grid, _blocks: Block[], obstacles: GridPosition[] = []) {
    this.grid = grid;
    this.obstacles = obstacles;
  }

  /**
   * Update the blocks array (called when blocks are added/removed)
   */
  public setBlocks(_blocks: Block[]): void {
    // Blocks are tracked via grid occupancy, no need to store them
  }

  /**
   * Check if a block can move to a position (world coordinates)
   * Uses AABB + world-space cell overlap detection for accurate collision
   *
   * TODO: Future optimization - Replace grid-based block iteration with spatial hash
   * for O(1) lookup instead of checking 3x3 grid cells per dragged cell.
   */
  public canBlockMoveTo(block: Block, worldX: number, worldY: number): boolean {
    const COLLISION_BUFFER = 2; // blocks should be flush with no overlap

    // Get world-space cell bounds for the dragged block at desired position
    const draggedCells = block.getWorldCellPositionsAt(worldX, worldY);

    // Phase 1: Calculate AABB for dragged block
    const draggedAABB = this.calculateAABB(draggedCells);

    // Phase 2: Check against all other blocks (via grid occupancy)
    const checkedBlocks = new Set<any>();

    for (const draggedCell of draggedCells) {
      // Check if entire cell is within playable bounds (not just center)
      const playableLeft = this.grid.x + this.grid.wallThickness;
      const playableTop = this.grid.y + this.grid.wallThickness;
      const playableRight = playableLeft + (this.grid.cols * this.grid.cellSize);
      const playableBottom = playableTop + (this.grid.rows * this.grid.cellSize);

      if (draggedCell.left < playableLeft ||
          draggedCell.right > playableRight ||
          draggedCell.top < playableTop ||
          draggedCell.bottom > playableBottom) {
        return false; // Cell extends outside playable area
      }

      // Convert cell center to grid position to find nearby blocks
      const centerX = (draggedCell.left + draggedCell.right) / 2;
      const centerY = (draggedCell.top + draggedCell.bottom) / 2;
      const gridPos = this.grid.worldToGrid(centerX, centerY);

      // Check grid occupancy in a small area around this cell
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const checkRow = gridPos.row + dr;
          const checkCol = gridPos.col + dc;

          if (!this.grid.isInBounds(checkRow, checkCol)) continue;

          const occupant = this.grid.getCellOccupant(checkRow, checkCol);
          if (occupant && occupant !== block && !checkedBlocks.has(occupant)) {
            checkedBlocks.add(occupant);

            // Do AABB test first (fast rejection)
            const occupantAABB = occupant.getWorldBounds();
            if (!this.aabbsOverlap(draggedAABB, occupantAABB)) {
              continue; // No overlap, skip cell-level check
            }

            // AABB overlap detected - check cell-level collision
            const occupantCells = occupant.getWorldCellPositionsAt(occupant.x, occupant.y);
            if (this.cellsOverlap(draggedCells, occupantCells, COLLISION_BUFFER)) {
              return false; // Collision detected
            }
          }

          // Check obstacles
          if (this.isObstacle(checkRow, checkCol)) {
            // Get obstacle cell bounds
            const obstacleCell = this.getObstacleCellBounds(checkRow, checkCol);

            // Check if dragged cell overlaps with obstacle cell (with buffer)
            if (this.boundsOverlap(draggedCell, obstacleCell, COLLISION_BUFFER)) {
              return false; // Collision with obstacle
            }
          }
        }
      }
    }

    return true; // No collision detected
  }

  /**
   * Check if a grid cell contains an obstacle
   */
  private isObstacle(row: number, col: number): boolean {
    return this.obstacles.some(obs => obs.row === row && obs.col === col);
  }

  /**
   * Calculate AABB (Axis-Aligned Bounding Box) from array of cell bounds
   */
  private calculateAABB(cells: Bounds[]): Bounds {
    let minLeft = Infinity, minTop = Infinity;
    let maxRight = -Infinity, maxBottom = -Infinity;

    cells.forEach(cell => {
      minLeft = Math.min(minLeft, cell.left);
      minTop = Math.min(minTop, cell.top);
      maxRight = Math.max(maxRight, cell.right);
      maxBottom = Math.max(maxBottom, cell.bottom);
    });

    return {
      left: minLeft,
      top: minTop,
      right: maxRight,
      bottom: maxBottom
    };
  }

  /**
   * Check if two AABBs overlap
   */
  private aabbsOverlap(a: Bounds, b: Bounds): boolean {
    return !(a.right < b.left || a.left > b.right ||
             a.bottom < b.top || a.top > b.bottom);
  }

  /**
   * Check if any cells from two arrays overlap (with buffer tolerance)
   */
  private cellsOverlap(cells1: Bounds[], cells2: Bounds[], buffer: number): boolean {
    for (const cell1 of cells1) {
      for (const cell2 of cells2) {
        if (this.boundsOverlap(cell1, cell2, buffer)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if two bounds overlap (with buffer tolerance)
   * Buffer creates a gap for smooth dragging
   */
  private boundsOverlap(a: Bounds, b: Bounds, buffer: number): boolean {
    return !(a.right - buffer < b.left + buffer ||
             a.left + buffer > b.right - buffer ||
             a.bottom - buffer < b.top + buffer ||
             a.top + buffer > b.bottom - buffer);
  }

  /**
   * Get world-space bounds for an obstacle cell
   */
  private getObstacleCellBounds(row: number, col: number): Bounds {
    const worldPos = this.grid.gridToWorld(row, col);
    return {
      left: worldPos.x,
      top: worldPos.y,
      right: worldPos.x + this.grid.cellSize,
      bottom: worldPos.y + this.grid.cellSize
    };
  }

  /**
   * Get valid drag position with swept collision detection (prevents pass-through)
   */
  public getValidDragPosition(
    block: Block,
    desiredX: number,
    desiredY: number,
    currentX: number,
    currentY: number
  ): { x: number; y: number } {
    // Calculate movement delta
    const dx = desiredX - currentX;
    const dy = desiredY - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If not moving, return current position
    if (distance < 0.1) {
      return { x: currentX, y: currentY };
    }

    // Step size for swept collision detection (smaller = more accurate but slower)
    const stepSize = Math.min(this.grid.cellSize * 0.5, distance);
    const steps = Math.ceil(distance / stepSize);

    // Check intermediate positions along the path
    let lastValidX = currentX;
    let lastValidY = currentY;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const testX = currentX + dx * t;
      const testY = currentY + dy * t;

      if (this.canBlockMoveTo(block, testX, testY)) {
        lastValidX = testX;
        lastValidY = testY;
      } else {
        // Hit a collision, return last valid position
        return { x: lastValidX, y: lastValidY };
      }
    }

    // No collision detected along the path
    return { x: desiredX, y: desiredY };
  }

  /**
   * Binary search to find exact collision point between valid and invalid positions
   * Returns the closest valid position to the collision boundary
   */
  private binarySearchCollisionPoint(
    block: Block,
    validX: number,
    validY: number,
    invalidX: number,
    invalidY: number,
    tolerance: number
  ): { x: number; y: number } {
    let iterations = 0;
    const maxIterations = 10;

    while (iterations < maxIterations) {
      const dx = invalidX - validX;
      const dy = invalidY - validY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < tolerance) {
        break;
      }

      const midX = (validX + invalidX) / 2;
      const midY = (validY + invalidY) / 2;

      if (this.canBlockMoveTo(block, midX, midY)) {
        validX = midX;
        validY = midY;
      } else {
        invalidX = midX;
        invalidY = midY;
      }

      iterations++;
    }

    return { x: validX, y: validY };
  }

  /**
   * Helper: Try swept movement along a path
   * Returns last valid position and whether destination was reached
   */
  private trySweptMovement(
    block: Block,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): { lastValidX: number; lastValidY: number; reached: boolean } {
    const dx = endX - startX;
    const dy = endY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If not moving, return start position
    if (distance < 0.1) {
      return { lastValidX: startX, lastValidY: startY, reached: true };
    }

    // Step size for swept collision (same as current implementation)
    const stepSize = Math.min(this.grid.cellSize * 0.5, distance);
    const steps = Math.ceil(distance / stepSize);

    let lastValidX = startX;
    let lastValidY = startY;

    // Test intermediate positions
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const testX = startX + dx * t;
      const testY = startY + dy * t;

      if (this.canBlockMoveTo(block, testX, testY)) {
        lastValidX = testX;
        lastValidY = testY;
      } else {
        // Hit collision - use binary search to find exact collision point
        const refined = this.binarySearchCollisionPoint(
          block,
          lastValidX,
          lastValidY,
          testX,
          testY,
          0.5
        );
        return { lastValidX: refined.x, lastValidY: refined.y, reached: false };
      }
    }

    // Reached destination without collision
    return { lastValidX: endX, lastValidY: endY, reached: true };
  }

  /**
   * Get valid drag position with axis-independent sliding support
   * When diagonal movement is blocked, tries to slide along free axis
   *
   * Priority: Full movement > X-only > Y-only > No movement
   */
  public getValidDragPositionWithSliding(
    block: Block,
    desiredX: number,
    desiredY: number,
    currentX: number,
    currentY: number
  ): { x: number; y: number } {
    // Calculate movement deltas
    const dx = desiredX - currentX;
    const dy = desiredY - currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If not moving, return current position
    if (distance < 0.1) {
      return { x: currentX, y: currentY };
    }

    // PHASE 1: Try full diagonal movement first (best case)
    const fullResult = this.trySweptMovement(block, currentX, currentY, desiredX, desiredY);
    if (fullResult.reached) {
      return { x: desiredX, y: desiredY };
    }

    // PHASE 2: Full movement blocked - try axis decomposition
    // Calculate how far we got along the diagonal
    const diagonalProgress = {
      x: fullResult.lastValidX,
      y: fullResult.lastValidY
    };

    // Calculate remaining deltas from last valid diagonal position
    const remainingDX = desiredX - diagonalProgress.x;
    const remainingDY = desiredY - diagonalProgress.y;

    // Try X-only movement from last valid diagonal position
    const xOnlyResult = this.trySweptMovement(
      block,
      diagonalProgress.x,
      diagonalProgress.y,
      diagonalProgress.x + remainingDX,
      diagonalProgress.y  // Keep Y constant
    );

    // Try Y-only movement from last valid diagonal position
    const yOnlyResult = this.trySweptMovement(
      block,
      diagonalProgress.x,
      diagonalProgress.y,
      diagonalProgress.x,  // Keep X constant
      diagonalProgress.y + remainingDY
    );

    // Calculate total distance gained for each option
    const xOnlyDistance = Math.abs(xOnlyResult.lastValidX - currentX) +
                          Math.abs(xOnlyResult.lastValidY - currentY);
    const yOnlyDistance = Math.abs(yOnlyResult.lastValidX - currentX) +
                          Math.abs(yOnlyResult.lastValidY - currentY);

    // PHASE 3: Choose the axis that gives most movement
    if (xOnlyDistance > yOnlyDistance) {
      // Try X-axis movement, then add any Y movement possible
      const finalX = xOnlyResult.lastValidX;
      const finalY = xOnlyResult.lastValidY;

      // After X movement, try adding Y movement
      const yAfterXResult = this.trySweptMovement(
        block,
        finalX,
        finalY,
        finalX,
        finalY + remainingDY
      );

      return { x: finalX, y: yAfterXResult.lastValidY };
    } else {
      // Try Y-axis movement, then add any X movement possible
      const finalX = yOnlyResult.lastValidX;
      const finalY = yOnlyResult.lastValidY;

      // After Y movement, try adding X movement
      const xAfterYResult = this.trySweptMovement(
        block,
        finalX,
        finalY,
        finalX + remainingDX,
        finalY
      );

      return { x: xAfterYResult.lastValidX, y: finalY };
    }
  }

  /**
   * Find the nearest valid grid position for a block
   */
  public findNearestValidGridPosition(block: Block, worldX: number, worldY: number): GridPosition | null {
    const gridPos = this.grid.worldToGrid(worldX, worldY);

    // Try the nearest position first
    if (this.isValidGridPosition(block, gridPos.row, gridPos.col)) {
      return gridPos;
    }

    // Try nearby positions in a spiral pattern
    const maxDistance = 3;
    for (let distance = 1; distance <= maxDistance; distance++) {
      for (let dRow = -distance; dRow <= distance; dRow++) {
        for (let dCol = -distance; dCol <= distance; dCol++) {
          if (Math.abs(dRow) === distance || Math.abs(dCol) === distance) {
            const testRow = gridPos.row + dRow;
            const testCol = gridPos.col + dCol;

            if (this.isValidGridPosition(block, testRow, testCol)) {
              return { row: testRow, col: testCol };
            }
          }
        }
      }
    }

    // No valid position found
    return null;
  }

  /**
   * Check if a block can be placed at a grid position
   */
  public isValidGridPosition(block: Block, row: number, col: number): boolean {
    // Check all cells the block would occupy
    for (const offset of block.shapeOffsets) {
      const checkRow = row + offset.row;
      const checkCol = col + offset.col;

      // Out of bounds?
      if (!this.grid.isInBounds(checkRow, checkCol)) {
        return false;
      }

      // Check if cell is occupied by another block
      const occupant = this.grid.getCellOccupant(checkRow, checkCol);
      if (occupant !== null && occupant !== block) {
        return false;
      }

      // Check obstacles
      if (this.isObstacle(checkRow, checkCol)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a block is at a valid exit
   */
  public checkExitCondition(block: Block, exitZones: ExitZone[]): ExitZone | null {
    const blockBounds = block.getWorldBounds();

    for (const exit of exitZones) {
      // Color must match
      if (exit.color.toLowerCase() !== block.color.toLowerCase()) {
        continue;
      }

      // Block must fit within exit bounds
      if (!exit.canBlockFit(blockBounds)) {
        continue;
      }

      // Block must be aligned with exit (use larger tolerance)
      if (!exit.isBlockAligned(blockBounds, this.grid.cellSize * 0.5)) {
        continue;
      }

      return exit;
    }

    return null;
  }

  /**
   * Get block bounds at a specific position
   */
  public getBlockBoundsAt(block: Block, worldX: number, worldY: number): Bounds {
    const gridPos = this.grid.worldToGrid(worldX, worldY);
    const worldPos = this.grid.gridToWorld(gridPos.row, gridPos.col);

    let minRow = Infinity, maxRow = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;

    block.shapeOffsets.forEach(offset => {
      minRow = Math.min(minRow, offset.row);
      maxRow = Math.max(maxRow, offset.row);
      minCol = Math.min(minCol, offset.col);
      maxCol = Math.max(maxCol, offset.col);
    });

    return {
      left: worldPos.x + minCol * this.grid.cellSize,
      right: worldPos.x + (maxCol + 1) * this.grid.cellSize,
      top: worldPos.y + minRow * this.grid.cellSize,
      bottom: worldPos.y + (maxRow + 1) * this.grid.cellSize
    };
  }
}
