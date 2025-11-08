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
   */
  public canBlockMoveTo(block: Block, worldX: number, worldY: number): boolean {
    const gridPos = this.grid.worldToGrid(worldX, worldY);

    // Check all cells the block would occupy
    for (const offset of block.shapeOffsets) {
      const checkRow = gridPos.row + offset.row;
      const checkCol = gridPos.col + offset.col;

      // Out of bounds?
      if (!this.grid.isInBounds(checkRow, checkCol)) {
        return false;
      }

      // Check if cell is occupied
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
   * Check if a grid cell contains an obstacle
   */
  private isObstacle(row: number, col: number): boolean {
    return this.obstacles.some(obs => obs.row === row && obs.col === col);
  }

  /**
   * Get valid drag position with collision detection (no pass-through)
   */
  public getValidDragPosition(
    block: Block,
    desiredX: number,
    desiredY: number,
    currentX: number,
    currentY: number
  ): { x: number; y: number } {
    // Try desired position
    if (this.canBlockMoveTo(block, desiredX, desiredY)) {
      return { x: desiredX, y: desiredY };
    }

    // If collision detected, stop all movement
    return { x: currentX, y: currentY };
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

    console.log('Checking exit for block:', {
      color: block.color,
      bounds: blockBounds,
      gridPos: block.gridPosition
    });

    for (const exit of exitZones) {
      console.log('  Checking exit:', {
        color: exit.color,
        side: exit.side
      });

      // Color must match
      if (exit.color.toLowerCase() !== block.color.toLowerCase()) {
        console.log('    ❌ Color mismatch');
        continue;
      }

      // Block must fit within exit bounds
      const fits = exit.canBlockFit(blockBounds);
      console.log('    Block fits:', fits);
      if (!fits) {
        continue;
      }

      // Block must be aligned with exit (use larger tolerance)
      const aligned = exit.isBlockAligned(blockBounds, this.grid.cellSize * 0.5);
      console.log('    Block aligned:', aligned);
      if (!aligned) {
        continue;
      }

      console.log('    ✅ Exit condition met!');
      return exit;
    }

    console.log('  No valid exit found');
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
