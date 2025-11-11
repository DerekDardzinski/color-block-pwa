import { ShapeType } from './shapes';
import { ExitSide } from '../entities/ExitZone';
import { GridPosition } from '../entities/Grid';

export interface BlockData {
  color: string;
  shape: ShapeType;
  startPosition: GridPosition;
}

export interface ExitData {
  color: string;
  side: ExitSide;
  startCell: number;
  endCell: number;
}

export interface LevelData {
  id: number;
  gridSize: { rows: number; cols: number };
  timeLimit: number; // in seconds
  blocks: BlockData[];
  obstacles: GridPosition[];
  exits: ExitData[];
}

export const LEVELS: LevelData[] = [
  // Level 1: Tutorial - Simple introduction with 2 blocks
  {
    id: 1,
    gridSize: { rows: 6, cols: 6 },
    timeLimit: 120, // 2 minutes
    blocks: [
      {
        color: 'blue',
        shape: '1x2',
        startPosition: { row: 2, col: 1 }
      },
      {
        color: 'red',
        shape: '1x2',
        startPosition: { row: 3, col: 4 }
      },
      {
        color: 'yellow',
        shape: 'Cross',
        startPosition: { row: 0, col: 2 }
      }
    ],
    obstacles: [],
    exits: [
      {
        color: 'blue',
        side: 'left',
        startCell: 2,
        endCell: 2
      },
      {
        color: 'red',
        side: 'right',
        startCell: 3,
        endCell: 3
      }
    ]
  },

  // Level 2: Easy - 3 blocks with basic shapes
  {
    id: 2,
    gridSize: { rows: 7, cols: 7 },
    timeLimit: 150, // 2.5 minutes
    blocks: [
      {
        color: 'blue',
        shape: '2x2',
        startPosition: { row: 1, col: 1 }
      },
      {
        color: 'red',
        shape: '1x3',
        startPosition: { row: 4, col: 2 }
      },
      {
        color: 'green',
        shape: '1x2',
        startPosition: { row: 2, col: 5 }
      }
    ],
    obstacles: [
      { row: 3, col: 3 }
    ],
    exits: [
      {
        color: 'blue',
        side: 'top',
        startCell: 1,
        endCell: 2
      },
      {
        color: 'red',
        side: 'bottom',
        startCell: 2,
        endCell: 4
      },
      {
        color: 'green',
        side: 'right',
        startCell: 2,
        endCell: 3
      }
    ]
  },

  // Level 3: Medium - 4 blocks with L-shapes
  {
    id: 3,
    gridSize: { rows: 8, cols: 8 },
    timeLimit: 180, // 3 minutes
    blocks: [
      {
        color: 'blue',
        shape: 'L_90',
        startPosition: { row: 1, col: 1 }
      },
      {
        color: 'red',
        shape: 'L_0',
        startPosition: { row: 5, col: 5 }
      },
      {
        color: 'yellow',
        shape: '2x2',
        startPosition: { row: 3, col: 2 }
      },
      {
        color: 'green',
        shape: '1x3',
        startPosition: { row: 1, col: 5 }
      }
    ],
    obstacles: [
      { row: 4, col: 4 },
      { row: 3, col: 5 }
    ],
    exits: [
      {
        color: 'blue',
        side: 'left',
        startCell: 1,
        endCell: 1
      },
      {
        color: 'red',
        side: 'bottom',
        startCell: 5,
        endCell: 6
      },
      {
        color: 'yellow',
        side: 'top',
        startCell: 2,
        endCell: 3
      },
      {
        color: 'green',
        side: 'right',
        startCell: 1,
        endCell: 3
      }
    ]
  },

  // Level 4: Hard - 5 blocks with T-shapes and more obstacles
  {
    id: 4,
    gridSize: { rows: 8, cols: 8 },
    timeLimit: 200, // 3:20
    blocks: [
      {
        color: 'purple',
        shape: 'T_0',
        startPosition: { row: 1, col: 2 }
      },
      {
        color: 'orange',
        shape: 'T_90',
        startPosition: { row: 5, col: 1 }
      },
      {
        color: 'cyan',
        shape: '2x3',
        startPosition: { row: 1, col: 5 }
      },
      {
        color: 'pink',
        shape: 'L_180',
        startPosition: { row: 4, col: 5 }
      },
      {
        color: 'yellow',
        shape: '1x2',
        startPosition: { row: 3, col: 3 }
      }
    ],
    obstacles: [
      { row: 2, col: 4 },
      { row: 4, col: 2 },
      { row: 6, col: 6 }
    ],
    exits: [
      {
        color: 'purple',
        side: 'top',
        startCell: 2,
        endCell: 4
      },
      {
        color: 'orange',
        side: 'left',
        startCell: 5,
        endCell: 6
      },
      {
        color: 'cyan',
        side: 'right',
        startCell: 1,
        endCell: 3
      },
      {
        color: 'pink',
        side: 'bottom',
        startCell: 5,
        endCell: 6
      },
      {
        color: 'yellow',
        side: 'left',
        startCell: 3,
        endCell: 4
      }
    ]
  },

  // Level 5: Challenge - Complex arrangement with multiple block types
  {
    id: 5,
    gridSize: { rows: 9, cols: 9 },
    timeLimit: 240, // 4 minutes
    blocks: [
      {
        color: 'red',
        shape: 'Cross',
        startPosition: { row: 3, col: 3 }
      },
      {
        color: 'blue',
        shape: 'L_270',
        startPosition: { row: 1, col: 1 }
      },
      {
        color: 'green',
        shape: 'T_180',
        startPosition: { row: 6, col: 1 }
      },
      {
        color: 'yellow',
        shape: '2x2',
        startPosition: { row: 1, col: 6 }
      },
      {
        color: 'purple',
        shape: 'L_90',
        startPosition: { row: 6, col: 6 }
      },
      {
        color: 'orange',
        shape: '1x3',
        startPosition: { row: 4, col: 7 }
      }
    ],
    obstacles: [
      { row: 2, col: 5 },
      { row: 4, col: 4 },
      { row: 5, col: 2 },
      { row: 7, col: 7 }
    ],
    exits: [
      {
        color: 'red',
        side: 'top',
        startCell: 3,
        endCell: 5
      },
      {
        color: 'blue',
        side: 'left',
        startCell: 1,
        endCell: 2
      },
      {
        color: 'green',
        side: 'bottom',
        startCell: 1,
        endCell: 3
      },
      {
        color: 'yellow',
        side: 'right',
        startCell: 1,
        endCell: 2
      },
      {
        color: 'purple',
        side: 'bottom',
        startCell: 6,
        endCell: 8
      },
      {
        color: 'orange',
        side: 'right',
        startCell: 4,
        endCell: 6
      }
    ]
  }
];

/**
 * Get a level by ID
 */
export function getLevel(id: number): LevelData | undefined {
  return LEVELS.find(level => level.id === id);
}

/**
 * Get the total number of levels
 */
export function getTotalLevels(): number {
  return LEVELS.length;
}

/**
 * Check if a level exists
 */
export function hasLevel(id: number): boolean {
  return getLevel(id) !== undefined;
}
