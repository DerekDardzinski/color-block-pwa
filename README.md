# Color Block PWA

A Progressive Web App puzzle game where you slide colorful LEGO-style blocks to matching colored exit zones.

## Features

- 🎮 5 progressively challenging levels
- 🎨 Colorful LEGO-style block graphics
- ⏱️ Time-based challenges
- 📱 Mobile-first responsive design
- 🔄 Drag and drop mechanics with collision detection
- 💾 Offline support via Service Worker
- 📲 Installable as a PWA

## Tech Stack

- **Build Tool:** Vite
- **Language:** TypeScript (strict mode)
- **Game Engine:** Phaser 3
- **PWA:** vite-plugin-pwa
- **Deployment:** GitHub Pages

## Development

### Prerequisites

- Node.js 18 or higher
- npm

### Setup

```bash
# Install dependencies
npm install

# Generate app icons
node scripts/generate-icons.js

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Game Instructions

1. **Objective:** Move all colored blocks to their matching colored exit zones
2. **Controls:** Click/tap and drag blocks to move them
3. **Rules:**
   - Blocks can only exit through matching colored zones
   - Blocks cannot overlap each other or obstacles
   - Complete the level before time runs out
4. **Winning:** Remove all blocks from the board

## Level Progression

- **Level 1:** Tutorial (2 blocks, simple shapes)
- **Level 2:** Easy (3 blocks, basic shapes)
- **Level 3:** Medium (4 blocks, L-shapes)
- **Level 4:** Hard (5 blocks, T-shapes, obstacles)
- **Level 5:** Challenge (6 blocks, complex arrangements)

## Deployment

The game automatically deploys to GitHub Pages when pushed to the `main` branch via GitHub Actions.

### Manual Deployment

1. Ensure GitHub Pages is enabled in repository settings
2. Set source to "GitHub Actions"
3. Push to main branch

## Project Structure

```
src/
├── game/
│   ├── config.ts              # Phaser configuration
│   ├── scenes/                # Game scenes
│   │   ├── GameScene.ts       # Main gameplay
│   │   ├── VictoryScene.ts    # Win screen
│   │   └── DefeatScene.ts     # Lose screen
│   ├── entities/              # Game entities
│   │   ├── Block.ts           # Draggable blocks
│   │   ├── Grid.ts            # Game grid
│   │   └── ExitZone.ts        # Exit zones
│   ├── systems/               # Game systems
│   │   ├── DragController.ts  # Drag handling
│   │   └── CollisionDetector.ts # Collision detection
│   └── data/                  # Game data
│       ├── shapes.ts          # Block shapes (polyominoes)
│       └── levels.ts          # Level definitions
├── styles/
│   └── main.css              # Global styles
└── main.ts                   # Entry point
```

## License

MIT

## Credits

Created with Claude Code
