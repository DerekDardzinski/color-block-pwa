/**
 * Shape definitions for polyomino blocks
 * Each shape is defined as an array of (row, col) offsets from the origin (top-left)
 */

export interface CellOffset {
  row: number;
  col: number;
}

export type ShapeType =
  // Rectangles
  | '1x1' | '1x2' | '1x3' | '2x2' | '2x3' | '3x3'
  // L-shapes (4 rotations)
  | 'L_0' | 'L_90' | 'L_180' | 'L_270'
  // T-shapes (4 rotations)
  | 'T_0' | 'T_90' | 'T_180' | 'T_270'
  // Cross
  | 'Cross';

export const SHAPES: Record<ShapeType, CellOffset[]> = {
  // Rectangle Shapes
  '1x1': [
    { row: 0, col: 0 }
  ],

  '1x2': [
    { row: 0, col: 0 },
    { row: 0, col: 1 }
  ],

  '1x3': [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 }
  ],

  '2x2': [
    { row: 0, col: 0 }, { row: 0, col: 1 },
    { row: 1, col: 0 }, { row: 1, col: 1 }
  ],

  '2x3': [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
  ],

  '3x3': [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
    { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 }
  ],

  // L-Shapes (4 rotations)
  // L_0: ⌞
  'L_0': [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 }, { row: 2, col: 1 }
  ],

  // L_90: ⌜
  'L_90': [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
    { row: 1, col: 0 }
  ],

  // L_180: ⌝
  'L_180': [
    { row: 0, col: 0 }, { row: 0, col: 1 },
                        { row: 1, col: 1 },
                        { row: 2, col: 1 }
  ],

  // L_270: ⌟
  'L_270': [
                                            { row: 0, col: 2 },
    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
  ],

  // T-Shapes (4 rotations)
  // T_0: ⊤
  'T_0': [
                        { row: 0, col: 1 },
    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }
  ],

  // T_90: ⊣
  'T_90': [
    { row: 0, col: 0 },
    { row: 1, col: 0 }, { row: 1, col: 1 },
    { row: 2, col: 0 }
  ],

  // T_180: ⊥
  'T_180': [
    { row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 },
                        { row: 1, col: 1 }
  ],

  // T_270: ⊢
  'T_270': [
                        { row: 0, col: 1 },
    { row: 1, col: 0 }, { row: 1, col: 1 },
                        { row: 2, col: 1 }
  ],

  // Cross Shape: +
  'Cross': [
                        { row: 0, col: 1 },
    { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 },
                        { row: 2, col: 1 }
  ]
};

/**
 * Get the bounding box dimensions for a shape
 */
export function getShapeDimensions(shape: ShapeType): { width: number; height: number } {
  const offsets = SHAPES[shape];
  let maxRow = 0;
  let maxCol = 0;

  offsets.forEach(offset => {
    maxRow = Math.max(maxRow, offset.row);
    maxCol = Math.max(maxCol, offset.col);
  });

  return {
    width: maxCol + 1,
    height: maxRow + 1
  };
}

/**
 * Get all cell offsets for a shape
 */
export function getShapeOffsets(shape: ShapeType): CellOffset[] {
  return SHAPES[shape];
}
