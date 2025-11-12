import Phaser from 'phaser';
import { Block } from '../entities/Block';
import { Grid } from '../entities/Grid';
import { ExitZone } from '../entities/ExitZone';
import { CollisionDetector } from './CollisionDetector';

export interface DragControllerConfig {
  scene: Phaser.Scene;
  grid: Grid;
  blocks: Block[];
  exitZones: ExitZone[];
  collisionDetector: CollisionDetector;
  onMoveComplete?: () => void;
  onBlockRemoved?: (block: Block) => void;
  onFirstInteraction?: () => void;
}

export class DragController {
  private scene: Phaser.Scene;
  private blocks: Block[];
  private exitZones: ExitZone[];
  private collisionDetector: CollisionDetector;
  private activeBlock: Block | null = null;
  private hasHadFirstInteraction: boolean = false;

  // Callbacks
  private onMoveComplete?: () => void;
  private onBlockRemoved?: (block: Block) => void;
  private onFirstInteraction?: () => void;

  constructor(config: DragControllerConfig) {
    this.scene = config.scene;
    this.blocks = config.blocks;
    this.exitZones = config.exitZones;
    this.collisionDetector = config.collisionDetector;
    this.onMoveComplete = config.onMoveComplete;
    this.onBlockRemoved = config.onBlockRemoved;
    this.onFirstInteraction = config.onFirstInteraction;

    this.setupDragHandlers();
  }

  /**
   * Setup drag event handlers for all blocks
   */
  private setupDragHandlers(): void {
    this.blocks.forEach(block => {
      this.setupBlockDrag(block);
    });
  }

  /**
   * Setup drag handlers for a single block
   */
  public setupBlockDrag(block: Block): void {
    // Pointer down - start drag
    block.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.onDragStart(block, pointer);
    });

    // Pointer move - update drag
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.activeBlock === block && block.isDragging) {
        this.onDrag(block, pointer);
      }
    });

    // Pointer up - end drag
    this.scene.input.on('pointerup', (_pointer: Phaser.Input.Pointer) => {
      if (this.activeBlock === block && block.isDragging) {
        this.onDragEnd(block);
      }
    });
  }

  /**
   * Handle drag start
   */
  private onDragStart(block: Block, pointer: Phaser.Input.Pointer): void {
    // Trigger first interaction callback if this is the first time
    if (!this.hasHadFirstInteraction) {
      this.hasHadFirstInteraction = true;
      if (this.onFirstInteraction) {
        this.onFirstInteraction();
      }
    }

    this.activeBlock = block;
    block.startDrag(pointer);
  }

  /**
   * Handle drag update
   */
  private onDrag(block: Block, pointer: Phaser.Input.Pointer): void {
    if (!block.isDragging) return;

    // Calculate desired position
    const desiredX = pointer.x + block.dragOffset.x;
    const desiredY = pointer.y + block.dragOffset.y;

    // Get current position
    const currentX = block.x;
    const currentY = block.y;

    // Get valid position with collision detection and sliding
    const validPos = this.collisionDetector.getValidDragPositionWithSliding(
      block,
      desiredX,
      desiredY,
      currentX,
      currentY
    );

    // Update block position
    block.updateDrag(validPos.x, validPos.y);
  }

  /**
   * Handle drag end
   */
  private onDragEnd(block: Block): void {
    if (!block.isDragging) return;

    block.endDrag();
    this.activeBlock = null;

    // FIRST: Check if block is at a valid exit (before snapping to grid)
    // We need to temporarily update the block's grid position based on current world position
    const currentGridPos = this.collisionDetector.grid.worldToGrid(block.x, block.y);
    const savedGridPos = { ...block.gridPosition };
    block.gridPosition = currentGridPos; // Temporarily update for exit check

    const exitZone = this.collisionDetector.checkExitCondition(block, this.exitZones);

    if (exitZone) {
      // Block is exiting - remove it
      block.removeBlock();

      // Remove from blocks array
      const index = this.blocks.indexOf(block);
      if (index > -1) {
        this.blocks.splice(index, 1);
      }

      // Update collision detector
      this.collisionDetector.setBlocks(this.blocks);

      // Trigger callback
      if (this.onBlockRemoved) {
        this.onBlockRemoved(block);
      }
      return;
    }

    // Restore saved grid position
    block.gridPosition = savedGridPos;

    // SECOND: If not exiting, find nearest valid grid position and snap to it
    const validGridPos = this.collisionDetector.findNearestValidGridPosition(
      block,
      block.x,
      block.y
    );

    if (validGridPos) {
      // Snap to valid grid position
      block.setGridPosition(validGridPos.row, validGridPos.col);

      // Normal move - trigger callback
      if (this.onMoveComplete) {
        this.onMoveComplete();
      }
    } else {
      // No valid position found, return to last valid position
      block.setGridPosition(block.lastValidPosition.row, block.lastValidPosition.col);
    }
  }

  /**
   * Add a new block to the controller
   */
  public addBlock(block: Block): void {
    this.blocks.push(block);
    this.setupBlockDrag(block);
    this.collisionDetector.setBlocks(this.blocks);
  }

  /**
   * Remove a block from the controller
   */
  public removeBlock(block: Block): void {
    const index = this.blocks.indexOf(block);
    if (index > -1) {
      this.blocks.splice(index, 1);
    }
    this.collisionDetector.setBlocks(this.blocks);
  }

  /**
   * Destroy the controller
   */
  public destroy(): void {
    this.scene.input.off('pointermove');
    this.scene.input.off('pointerup');
  }
}
