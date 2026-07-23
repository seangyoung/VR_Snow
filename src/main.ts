import "./styles.css";
import { GameState } from "./simulation/gameState";
import { createUi } from "./ui/createUi";
import { BroadStreetScene } from "./render/BroadStreetScene";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const app = document.querySelector<HTMLDivElement>("#app");

if (!canvas || !app) {
  throw new Error("Prototype root elements are missing.");
}

const gameState = new GameState();
const ui = createUi(app, gameState);
const scene = new BroadStreetScene(canvas, gameState);
let lastLocationId = gameState.getCurrentLocation().id;

scene.onFocusChange = (hotspot) => ui.setPrompt(hotspot);
scene.onHotspotActivate = (hotspot) => {
  if (
    hotspot.id === "john-snow" &&
    gameState.getStage() === "synthesis" &&
    gameState.getCurrentLocation().id === "snow-desk"
  ) {
    ui.openSnowReview();
    return;
  }

  const result = gameState.inspectHotspot(hotspot.id);
  ui.setMessage(result.message);
  ui.render();
  scene.refreshHotspots();
};

gameState.onChange(() => {
  ui.render();
  const currentLocationId = gameState.getCurrentLocation().id;
  if (currentLocationId !== lastLocationId) {
    lastLocationId = currentLocationId;
    scene.applyCurrentLocation();
  } else {
    scene.refreshHotspots();
  }
});

ui.onReset = () => {
  gameState.reset();
  scene.applyCurrentLocation();
};

ui.render();
scene.start();
