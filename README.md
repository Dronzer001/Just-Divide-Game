# Just Divide — Kid Mode (Phaser 3 demo)

This is a Phaser 3 implementation of the "Just Divide — Kid Mode" game assignment.

## Features implemented

- 4x4 grid, draggable tiles from a 3-tile queue.
- Merge rules: equal → both vanish; divisible → replace larger with quotient; result=1 → remove.
- KEEP slot (store one tile), TRASH with limited uses.
- Undo (max 10), Level up every 10 points, trash uses increment on level up.
- Hints (toggle G) that show possible merge placements.
- Best score persisted to localStorage.

## How to run

1. `git init` and add files or just place files into a folder.
2. Serve with any static server, e.g. `npx http-server` or open `index.html` via a local server (Phaser requires serving for some browsers).
3. Deploy to Vercel by pushing to GitHub and using Vercel import.

## Assets

Replace placeholders in `/assets` with the provided PNG/SVG files (cat, tile sprites, background).

