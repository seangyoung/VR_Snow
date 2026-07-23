# VR Snow

Design workspace for **The Broad Street Inquiry**, an educational WebXR mystery game about the 1854 Soho cholera outbreak and John Snow's investigation.

The current deliverable is a vertical slice prototype plus a source-backed game design document:

- [docs/game-design.md](docs/game-design.md)

## Run the Prototype

```bash
npm install
npm run dev
```

Open the local Vite URL, usually `http://127.0.0.1:5173/`.

## Concept

Players are an apprentice to John Snow during the 1854 Broad Street outbreak. In immersive 360 scenes, they interview residents, collect case records, compare hypotheses, build a map, and present evidence to the parish authorities. The goal is to teach field epidemiology, historical uncertainty, public health decision-making, and the power of visualizing data.

## Design Direction

- WebXR-first, with desktop browser fallback.
- Stationary 360 environments with interactive hotspots for VR comfort.
- Plain Three.js, TypeScript, Vite, and DOM overlays for implementation.
- Authored interviews where player questions unlock source-tagged evidence.
- Snow's Desk synthesis board for comparing theories before presenting to the Board.
- Historically careful mystery structure: no modern lab proof, no lone-genius framing, and no claim that removing the pump handle alone "solved" the outbreak.
