import * as THREE from "three";
import { VRButton } from "three/addons/webxr/VRButton.js";
import type { GameState } from "../simulation/gameState";
import type { Hotspot, LocationId } from "../simulation/types";

type HotspotMesh = THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial> & {
  userData: { hotspot: Hotspot };
};

type HotspotVisual = {
  mesh: HotspotMesh;
  label: THREE.Sprite;
};

type CaptureWindow = Window & {
  __vrSnowCapture?: () => string;
};

const cameraHeight = 1.62;

export class BroadStreetScene {
  onFocusChange?: (hotspot?: Hotspot) => void;
  onHotspotActivate?: (hotspot: Hotspot) => void;

  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(65, 1, 0.05, 100);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly cameraWorldPosition = new THREE.Vector3();
  private readonly cameraDirection = new THREE.Vector3();
  private readonly hotspotDirection = new THREE.Vector3();
  private readonly hotspotWorldPosition = new THREE.Vector3();
  private readonly hotspotVisuals = new Map<string, HotspotVisual>();
  private readonly locationObjects = new Map<LocationId, THREE.Object3D[]>();
  private readonly sharedExterior = new THREE.Group();
  private readonly fallbackPanoramaTexture = createPanoramaTexture();
  private readonly skyMaterial = new THREE.MeshBasicMaterial({
    map: this.fallbackPanoramaTexture,
    side: THREE.BackSide,
    fog: false,
    toneMapped: false,
  });
  private readonly panoramaLoader = new THREE.TextureLoader();
  private readonly panoramaTextureCache = new Map<LocationId, THREE.Texture | null>();
  private readonly locationsWithLoadedPanorama = new Set<LocationId>();
  private readonly allowCanvasCapture: boolean;
  private activePanoramaLocationId?: LocationId;
  private focusedHotspot?: Hotspot;
  private captureFrameCounter = 0;
  private yaw = 0;
  private pitch = 0;
  private dragging = false;
  private previousPointer = { x: 0, y: 0 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gameState: GameState,
  ) {
    this.allowCanvasCapture = new URLSearchParams(window.location.search).has("capture");
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: this.allowCanvasCapture,
    });
    this.renderer.xr.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor("#080b0d");
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera.position.set(0, cameraHeight, 0);
    this.scene.add(this.camera);

    if (this.allowCanvasCapture) {
      (window as CaptureWindow).__vrSnowCapture = () => createCaptureDataUrl(this.renderer.domElement);
    }

    this.buildScene();
    this.buildHotspots();
    this.addInputHandlers();
    this.addVrButton();
    this.resize();
    this.applyCurrentLocation();
  }

  start(): void {
    this.renderer.setAnimationLoop((time: number) => {
      this.updateHotspots(time * 0.001);
      this.updateFocusFromCenter();
      this.renderer.render(this.scene, this.camera);
      if (this.allowCanvasCapture && this.captureFrameCounter % 12 === 0) {
        this.canvas.dataset.captureFrame = createCaptureDataUrl(this.renderer.domElement);
      }
      this.captureFrameCounter += 1;
    });
  }

  resetView(): void {
    this.yaw = 0;
    this.pitch = 0;
    this.camera.rotation.set(0, 0, 0);
  }

  applyCurrentLocation(): void {
    const location = this.gameState.getCurrentLocation();
    const target = locationLookTargets[location.id] ?? [0, 0, -4];
    this.applyPanorama(location.id);
    this.yaw = Math.atan2(-target[0], -target[2]);
    this.pitch = THREE.MathUtils.clamp((target[1] - cameraHeight) * 0.12, -0.18, 0.18);
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    this.focusedHotspot = undefined;
    this.onFocusChange?.(undefined);
    this.refreshLocationObjects();
    this.refreshHotspots();
  }

  refreshHotspots(): void {
    const activeHotspotIds = new Set(this.gameState.getHotspots().map((hotspot) => hotspot.id));
    this.hotspotVisuals.forEach(({ mesh, label }) => {
      const active = activeHotspotIds.has(mesh.userData.hotspot.id);
      const inspected = this.gameState.hasInspected(mesh.userData.hotspot.id);
      mesh.visible = active;
      label.visible = active;
      mesh.material.color.set(inspected ? "#89d6ba" : "#f3d37a");
      mesh.material.emissive.set(inspected ? "#1b7e62" : "#8b621a");
    });

    if (this.focusedHotspot && !activeHotspotIds.has(this.focusedHotspot.id)) {
      this.focusedHotspot = undefined;
      this.onFocusChange?.(undefined);
    }
  }

  private buildScene(): void {
    this.scene.fog = new THREE.FogExp2("#111619", 0.043);
    this.scene.background = new THREE.Color("#111619");

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(42, 64, 32),
      this.skyMaterial,
    );
    this.scene.add(sky);

    this.sharedExterior.add(createGround());
    this.sharedExterior.add(createDistantStreetSilhouette());
    this.scene.add(this.sharedExterior);

    this.scene.add(new THREE.HemisphereLight("#d7eef4", "#332c23", 1.45));
    const lantern = new THREE.PointLight("#f4b468", 55, 14, 1.6);
    lantern.position.set(-2.2, 3.6, -3.2);
    this.scene.add(lantern);

    const fill = new THREE.DirectionalLight("#aac5d6", 1.5);
    fill.position.set(4, 7, 5);
    fill.castShadow = true;
    fill.shadow.camera.near = 0.5;
    fill.shadow.camera.far = 24;
    fill.shadow.camera.left = -8;
    fill.shadow.camera.right = 8;
    fill.shadow.camera.top = 8;
    fill.shadow.camera.bottom = -8;
    this.scene.add(fill);

    this.addLocationObject("snow-desk", createSnowDeskSet());
    this.addLocationObject("broad-street", createBroadStreetSet());
    this.addLocationObject("household", createHouseholdSet());
    this.addLocationObject("registrar", createRegistrarSet());
    this.addLocationObject("workhouse", createWorkhouseSet());
    this.addLocationObject("brewery", createBrewerySet());
    this.addLocationObject("board-room", createBoardRoomSet());
  }

  private buildHotspots(): void {
    this.gameState.getAllHotspots().forEach((hotspot) => {
      const mesh = createHotspotMesh(hotspot);
      this.scene.add(mesh);

      const label = createSpriteLabel(hotspot.shortLabel, "#f4d891");
      label.position.set(hotspot.position[0], hotspot.position[1] + 0.33, hotspot.position[2]);
      this.scene.add(label);
      this.hotspotVisuals.set(hotspot.id, { mesh, label });
    });
    this.refreshHotspots();
  }

  private addLocationObject(locationId: LocationId, object: THREE.Object3D): void {
    this.scene.add(object);
    const objects = this.locationObjects.get(locationId) ?? [];
    objects.push(object);
    this.locationObjects.set(locationId, objects);
  }

  private applyPanorama(locationId: LocationId): void {
    this.activePanoramaLocationId = locationId;
    this.setSkyTexture(this.fallbackPanoramaTexture);

    const cachedTexture = this.panoramaTextureCache.get(locationId);
    if (cachedTexture) {
      this.locationsWithLoadedPanorama.add(locationId);
      this.setSkyTexture(cachedTexture);
      return;
    }

    if (cachedTexture === null) {
      this.locationsWithLoadedPanorama.delete(locationId);
      return;
    }

    this.locationsWithLoadedPanorama.delete(locationId);
    this.panoramaLoader.load(
      resolvePublicAssetPath(panoramaAssetPaths[locationId]),
      (loadedTexture) => {
        const texture = createDisplayPanoramaTexture(loadedTexture);
        this.panoramaTextureCache.set(locationId, texture);
        this.locationsWithLoadedPanorama.add(locationId);
        if (this.activePanoramaLocationId === locationId) {
          this.setSkyTexture(texture);
          this.refreshLocationObjects();
        }
      },
      undefined,
      () => {
        this.panoramaTextureCache.set(locationId, null);
        this.locationsWithLoadedPanorama.delete(locationId);
        if (this.activePanoramaLocationId === locationId) {
          this.setSkyTexture(this.fallbackPanoramaTexture);
          this.refreshLocationObjects();
        }
      },
    );
  }

  private setSkyTexture(texture: THREE.Texture): void {
    if (this.skyMaterial.map === texture) {
      return;
    }

    this.skyMaterial.map = texture;
    this.skyMaterial.needsUpdate = true;
  }

  private addInputHandlers(): void {
    window.addEventListener("resize", () => this.resize());
    this.canvas.addEventListener("pointerdown", (event) => {
      this.dragging = true;
      this.previousPointer = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("pointermove", (event) => {
      if (!this.dragging) {
        return;
      }
      const deltaX = event.clientX - this.previousPointer.x;
      const deltaY = event.clientY - this.previousPointer.y;
      this.previousPointer = { x: event.clientX, y: event.clientY };
      this.yaw -= deltaX * 0.004;
      this.pitch -= deltaY * 0.003;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -1.15, 1.15);
      this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
    });
    this.canvas.addEventListener("pointerup", (event) => {
      this.dragging = false;
      this.canvas.releasePointerCapture(event.pointerId);
    });
    this.canvas.addEventListener("click", (event) => {
      const hotspot = this.pickHotspot(event.clientX, event.clientY);
      if (hotspot) {
        this.onHotspotActivate?.(hotspot);
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        if (this.focusedHotspot) {
          this.onHotspotActivate?.(this.focusedHotspot);
        }
      }
    });

    const controller = this.renderer.xr.getController(0);
    controller.addEventListener("select", () => {
      if (this.focusedHotspot) {
        this.onHotspotActivate?.(this.focusedHotspot);
      }
    });
    this.scene.add(controller);
  }

  private addVrButton(): void {
    const button = VRButton.createButton(this.renderer);
    button.classList.add("vr-entry-button");
    document.body.appendChild(button);
  }

  private resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private updateHotspots(time: number): void {
    this.hotspotVisuals.forEach(({ mesh }, id) => {
      if (!mesh.visible) {
        return;
      }
      const inspected = this.gameState.hasInspected(id);
      const pulse = Math.sin(time * 2.7 + mesh.position.x) * 0.07;
      const baseScale = inspected ? 0.78 : 1;
      mesh.scale.setScalar(baseScale + pulse);
    });
  }

  private updateFocusFromCenter(): void {
    this.camera.getWorldPosition(this.cameraWorldPosition);
    this.camera.getWorldDirection(this.cameraDirection);

    let nextHotspot: Hotspot | undefined;
    let closestAngle = 0.18;
    this.hotspotVisuals.forEach(({ mesh }) => {
      if (!mesh.visible) {
        return;
      }
      mesh.getWorldPosition(this.hotspotWorldPosition);
      this.hotspotDirection.subVectors(this.hotspotWorldPosition, this.cameraWorldPosition).normalize();
      const angle = this.cameraDirection.angleTo(this.hotspotDirection);
      if (angle < closestAngle) {
        closestAngle = angle;
        nextHotspot = mesh.userData.hotspot;
      }
    });

    if (nextHotspot?.id !== this.focusedHotspot?.id) {
      this.focusedHotspot = nextHotspot;
      this.onFocusChange?.(nextHotspot);
    }
  }

  private pickHotspot(clientX: number, clientY: number): Hotspot | undefined {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(
      [...this.hotspotVisuals.values()].map((visual) => visual.mesh).filter((mesh) => mesh.visible),
      false,
    )[0];
    return hit ? (hit.object as HotspotMesh).userData.hotspot : undefined;
  }

  private refreshLocationObjects(): void {
    const currentLocationId = this.gameState.getCurrentLocation().id;
    const currentLocationHasPanorama = this.locationsWithLoadedPanorama.has(currentLocationId);
    this.sharedExterior.visible = !currentLocationHasPanorama;
    this.locationObjects.forEach((objects, locationId) => {
      const visible = locationId === currentLocationId;
      objects.forEach((object) => {
        object.visible = visible;
        setEnvironmentShellVisibility(object, !(visible && currentLocationHasPanorama));
      });
    });
  }
}

const locationLookTargets: Record<LocationId, [number, number, number]> = {
  "snow-desk": [-2.8, 1.35, 2.4],
  "broad-street": [0.8, 1.1, -5.4],
  household: [-2.25, 1.18, -0.95],
  registrar: [-3.2, 1.1, -2.2],
  workhouse: [3.6, 1.2, -1.7],
  brewery: [3.4, 1.25, 1.8],
  "board-room": [0, 1.2, 2.8],
};

const panoramaAssetPaths: Record<LocationId, string> = {
  "snow-desk": "panoramas/snow-desk.jpg",
  "broad-street": "panoramas/broad-street.jpg",
  household: "panoramas/household.jpg",
  registrar: "panoramas/registrar.jpg",
  workhouse: "panoramas/workhouse.jpg",
  brewery: "panoramas/brewery.jpg",
  "board-room": "panoramas/board-room.jpg",
};

function resolvePublicAssetPath(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base : `${base}/`;
  return `${normalizedBase}${path}`;
}

function preparePanoramaTexture(texture: THREE.Texture): void {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.x = -1;
  texture.offset.x = 1;
  texture.needsUpdate = true;
}

function createDisplayPanoramaTexture(sourceTexture: THREE.Texture): THREE.CanvasTexture {
  const image = sourceTexture.image as HTMLImageElement;
  const width = image.naturalWidth || image.width || 2048;
  const height = image.naturalHeight || image.height || 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not prepare panorama texture.");
  }

  ctx.filter = "contrast(1.1) saturate(1.18) brightness(1.04)";
  ctx.drawImage(image, 0, 0, width, height);
  sourceTexture.dispose();

  const texture = new THREE.CanvasTexture(canvas);
  preparePanoramaTexture(texture);
  return texture;
}

function markEnvironmentShell<T extends THREE.Object3D>(object: T): T {
  object.userData.isEnvironmentShell = true;
  return object;
}

function setEnvironmentShellVisibility(object: THREE.Object3D, visible: boolean): void {
  object.traverse((child) => {
    if (child.userData.isEnvironmentShell === true) {
      child.visible = visible;
    }
  });
}

function createHotspotMesh(hotspot: Hotspot): HotspotMesh {
  const material = new THREE.MeshStandardMaterial({
    color: "#f3d37a",
    emissive: "#8b621a",
    emissiveIntensity: 0.85,
    roughness: 0.45,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), material) as HotspotMesh;
  mesh.position.set(...hotspot.position);
  mesh.userData = { hotspot };
  return mesh;
}

type Vec3 = [number, number, number];

function createPanoramaTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create panorama texture.");
  }

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#1c2932");
  sky.addColorStop(0.36, "#4d5960");
  sky.addColorStop(0.52, "#34302b");
  sky.addColorStop(1, "#131313");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 220, 150, 0.1)";
  for (let i = 0; i < 80; i += 1) {
    const x = (i * 311) % canvas.width;
    const y = 80 + ((i * 97) % 260);
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 26; i += 1) {
    const width = 110 + (i % 5) * 30;
    const height = 230 + (i % 6) * 36;
    const x = i * 82 - 80;
    const y = 590 - height * 0.34;
    ctx.fillStyle = i % 2 === 0 ? "#1b1d1d" : "#24231f";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "rgba(238, 186, 95, 0.18)";
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        ctx.fillRect(x + 18 + col * 30, y + 28 + row * 42, 10, 16);
      }
    }
  }

  ctx.fillStyle = "rgba(55, 50, 45, 0.62)";
  ctx.fillRect(0, 610, canvas.width, 80);
  ctx.fillStyle = "rgba(18, 17, 16, 0.66)";
  ctx.fillRect(0, 690, canvas.width, 334);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function createGround(): THREE.Mesh {
  const texture = createCobbleTexture();
  texture.repeat.set(4, 4);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(18, 128),
    new THREE.MeshStandardMaterial({
      color: "#37342e",
      map: texture,
      roughness: 0.96,
      metalness: 0.01,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.025;
  ground.receiveShadow = true;
  return ground;
}

function createDistantStreetSilhouette(): THREE.Group {
  const group = new THREE.Group();
  const darkBrick = createMaterial("#20211f", { roughness: 0.93 });
  const roof = createMaterial("#151719", { roughness: 0.82 });
  for (let index = 0; index < 14; index += 1) {
    const angle = (index / 14) * Math.PI * 2;
    const radius = 12.5 + (index % 2) * 0.7;
    const height = 1.4 + (index % 5) * 0.22;
    const width = 1.7 + (index % 4) * 0.22;
    const building = createBox(
      [width, height, 0.16],
      darkBrick,
      [Math.sin(angle) * radius, height / 2 - 0.02, Math.cos(angle) * radius],
      [0, angle, 0],
    );
    building.castShadow = false;
    group.add(building);

    const cap = createBox(
      [width * 1.08, 0.12, 0.2],
      roof,
      [Math.sin(angle) * radius, height + 0.04, Math.cos(angle) * radius],
      [0, angle, 0],
    );
    cap.castShadow = false;
    group.add(cap);
  }
  return group;
}

function createBroadStreetSet(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, 0, -5.4);
  const pumpX = 1.45;

  const streetSign = createSignMesh("BROAD STREET", 1.28, 0.28, "#e0d2aa", "#2b241c");
  streetSign.position.set(pumpX - 0.5, 1.86, -1.86);
  group.add(streetSign);

  const pump = createPump();
  pump.position.x = pumpX;
  group.add(pump);
  group.add(createBucket([pumpX + 0.62, 0.02, 0.34]));
  group.add(createSampleVial([pumpX - 0.35, 0.03, 0.56]));
  group.add(createBox([0.9, 0.012, 0.55], createMaterial("#263b3a", { transparent: true, opacity: 0.58 }), [pumpX + 0.38, 0.025, 0.25], [0, 0.28, 0]));
  group.add(createPointLight("#f2bc76", 44, 6.5, [pumpX - 0.45, 2.2, 0.65]));
  return group;
}

function createRegistrarSet(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(-3.2, 0, -2.2);
  group.rotation.y = Math.atan2(group.position.x, group.position.z);

  const wood = createMaterial("#4a3325", { roughness: 0.84 });
  const darkWood = createMaterial("#2c211b", { roughness: 0.82 });
  const paper = createMaterial("#d8c69c", { roughness: 0.72 });
  const greenGlass = createMaterial("#3c6c56", { emissive: "#1d553e", emissiveIntensity: 0.25, roughness: 0.38 });

  group.add(createRoomShell(4.6, 3.1, "#3b312a", "#242522", "#7f5a38"));
  group.add(createSignMesh("Registrar's Ledger", 1.42, 0.3, "#e6d2a5", "#2d241b"));
  const sign = group.children[group.children.length - 1];
  sign.position.set(0, 1.95, 1.86);
  sign.rotation.y = Math.PI;

  const desk = createBox([1.65, 0.14, 0.92], wood, [0, 0.76, 0]);
  group.add(desk);
  group.add(createBox([1.72, 0.08, 0.12], darkWood, [0, 0.62, 0.48]));
  group.add(createBox([0.12, 0.72, 0.12], darkWood, [-0.68, 0.36, -0.32]));
  group.add(createBox([0.12, 0.72, 0.12], darkWood, [0.68, 0.36, -0.32]));
  group.add(createLedgerBook([0, 0.875, -0.02]));
  group.add(createPaperStack([-0.55, 0.9, 0.18], 4, 0.78));
  group.add(createInkBottle([0.58, 0.9, -0.22]));
  group.add(createDeskLamp([0.5, 0.92, 0.2], greenGlass));

  group.add(createShelf([-1.75, 1.04, 0.95], darkWood, paper, 5));
  group.add(createShelf([1.75, 1.04, 0.95], darkWood, paper, 4));
  group.add(createPointLight("#d6b176", 42, 5, [0.1, 2.2, 0.2]));
  return group;
}

function createHouseholdSet(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(-2.25, 0, -0.95);
  group.rotation.y = Math.atan2(group.position.x, group.position.z);

  const wood = createMaterial("#4a3124", { roughness: 0.86 });
  const darkWood = createMaterial("#251b16", { roughness: 0.86 });
  const linen = createMaterial("#d3c2a0", { roughness: 0.84 });
  const blanket = createMaterial("#5f2e2e", { roughness: 0.9 });
  const blackCloth = createMaterial("#10100f", { roughness: 0.78 });
  const basin = createMaterial("#c9b889", { roughness: 0.58 });
  const blueGlass = createMaterial("#2f5d61", { transparent: true, opacity: 0.64, roughness: 0.42 });

  group.add(createRoomShell(4.5, 3.1, "#302822", "#24221d", "#75513a"));

  const sign = createSignMesh("Broad Street Household", 1.6, 0.28, "#ead3a4", "#2b221b");
  sign.position.set(0, 1.88, 1.78);
  sign.rotation.y = Math.PI;
  group.add(sign);

  group.add(createBox([1.45, 0.18, 0.72], wood, [-1.05, 0.34, -0.42]));
  group.add(createBox([1.48, 0.08, 0.76], linen, [-1.05, 0.51, -0.42]));
  group.add(createBox([1.18, 0.06, 0.62], blanket, [-1.0, 0.57, -0.4]));
  group.add(createBox([0.36, 0.08, 0.46], linen, [-1.62, 0.6, -0.42]));
  group.add(createBox([0.12, 0.54, 0.12], wood, [-1.68, 0.18, -0.72]));
  group.add(createBox([0.12, 0.54, 0.12], wood, [-0.42, 0.18, -0.72]));
  group.add(createBox([0.12, 0.54, 0.12], wood, [-1.68, 0.18, -0.1]));
  group.add(createBox([0.12, 0.54, 0.12], wood, [-0.42, 0.18, -0.1]));

  const table = createBox([1.12, 0.12, 0.58], wood, [0.65, 0.66, -0.42]);
  group.add(table);
  group.add(createBox([0.1, 0.58, 0.1], darkWood, [0.22, 0.34, -0.62]));
  group.add(createBox([0.1, 0.58, 0.1], darkWood, [1.08, 0.34, -0.62]));
  group.add(createBox([0.1, 0.58, 0.1], darkWood, [0.22, 0.34, -0.22]));
  group.add(createBox([0.1, 0.58, 0.1], darkWood, [1.08, 0.34, -0.22]));
  group.add(createCylinder(0.2, 0.17, 0.09, basin, [0.42, 0.76, -0.44], [0, 0, 0], 28));
  group.add(createCylinder(0.16, 0.16, 0.018, blueGlass, [0.42, 0.815, -0.44], [0, 0, 0], 28));
  group.add(createBucket([0.95, 0.03, -0.04]));
  group.add(createPaperStack([0.84, 0.75, -0.48], 3, 0.82));

  group.add(createChair([1.35, 0.02, 0.36], -0.55));

  group.add(createBox([0.92, 0.08, 0.08], blackCloth, [-1.78, 1.54, 1.56]));
  group.add(createBox([0.08, 0.62, 0.06], blackCloth, [-1.78, 1.24, 1.55]));

  const addressNote = createSignMesh("Address, water, timing", 1.12, 0.22, "#2a2119", "#d6c393");
  addressNote.position.set(1.28, 1.28, 1.77);
  addressNote.rotation.y = Math.PI;
  group.add(addressNote);

  group.add(createPointLight("#e5b36f", 38, 5.2, [0.45, 1.95, -0.05]));
  group.add(createPointLight("#a7c5cc", 11, 4.5, [-1.45, 1.65, -0.2]));
  return group;
}

function createWorkhouseSet(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(3.6, 0, -1.7);
  group.rotation.y = Math.atan2(group.position.x, group.position.z);

  const brick = createMaterial("#65443b", { roughness: 0.96 });
  const soot = createMaterial("#2e2f2e", { roughness: 0.9 });
  const stone = createMaterial("#8b8171", { roughness: 0.94 });
  const wood = createMaterial("#382820", { roughness: 0.87 });
  const water = createMaterial("#315657", { transparent: true, opacity: 0.68, roughness: 0.4 });

  const shell = markEnvironmentShell(new THREE.Group());
  shell.add(createBox([4.8, 0.04, 3.2], createMaterial("#383731", { roughness: 0.98 }), [0, 0, -0.12]));
  shell.add(createFacade([0, 1.18, 1.35], [4.6, 2.35, 0.2], brick, createMaterial("#c79557", { roughness: 0.55 }), 4, 2, 0));
  shell.add(createBox([1.1, 1.22, 0.12], wood, [0, 0.62, 1.23]));
  shell.add(createBox([4.9, 0.22, 0.24], soot, [0, 2.4, 1.34]));
  shell.add(createBox([0.16, 1.0, 2.6], brick, [-2.36, 0.5, -0.2]));
  shell.add(createBox([0.16, 1.0, 2.6], brick, [2.36, 0.5, -0.2]));
  shell.add(createBox([3.25, 0.18, 0.12], stone, [0, 0.16, -1.36]));
  shell.add(createBox([0.12, 1.05, 0.1], wood, [-0.95, 0.55, -1.24]));
  shell.add(createBox([0.12, 1.05, 0.1], wood, [0.95, 0.55, -1.24]));
  shell.add(createBox([1.95, 0.09, 0.08], wood, [0, 1.08, -1.24]));
  group.add(shell);

  const ownSupply = createBox([0.9, 0.64, 0.72], stone, [1.25, 0.34, -0.35]);
  group.add(ownSupply);
  group.add(createBox([0.78, 0.025, 0.6], water, [1.25, 0.68, -0.35]));
  group.add(createBucket([0.45, 0.03, -0.78]));
  group.add(createBucket([1.85, 0.03, -0.68]));
  group.add(createBench([-1.28, 0.22, -0.72]));

  const sign = createSignMesh("Workhouse Yard", 1.18, 0.28, "#e4d4aa", "#2d251f");
  sign.position.set(0.02, 1.72, 1.21);
  sign.rotation.y = Math.PI;
  group.add(sign);
  group.add(createPointLight("#cbd9d3", 22, 6, [-0.4, 2.1, -0.15]));
  return group;
}

function createBrewerySet(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(3.4, 0, 1.8);
  group.rotation.y = Math.atan2(group.position.x, group.position.z);

  const brick = createMaterial("#5a362f", { roughness: 0.94 });
  const copper = createMaterial("#b46f39", { roughness: 0.42, metalness: 0.32 });
  const wood = createMaterial("#65442a", { roughness: 0.78 });
  const stone = createMaterial("#413b33", { roughness: 0.98 });

  group.add(createRoomShell(4.8, 3.2, "#3a2925", "#2a2924", "#7a4c2a"));
  group.add(markEnvironmentShell(createBox([4.2, 0.04, 2.75], stone, [0, 0.012, -0.1])));
  group.add(createVat([-1.15, 0.02, 0.3], copper));
  group.add(createVat([1.18, 0.02, 0.26], copper));
  group.add(createBarrel([-0.1, 0.38, -0.72], 1.15));
  group.add(createBarrel([0.72, 0.36, -0.75], 0.95));
  group.add(createBarrel([-0.84, 0.36, -0.72], 0.95));
  group.add(createCrate([1.75, 0.26, -0.72]));
  group.add(createCrate([-1.75, 0.26, -0.64]));
  group.add(createMug([0.1, 0.82, 0.72]));

  const tastingTable = createBox([1.5, 0.12, 0.58], wood, [0.15, 0.7, 0.7]);
  group.add(tastingTable);
  group.add(createBox([0.12, 0.65, 0.1], wood, [-0.45, 0.35, 0.5]));
  group.add(createBox([0.12, 0.65, 0.1], wood, [0.75, 0.35, 0.5]));

  const sign = createSignMesh("Broad Street Brewery", 1.52, 0.3, "#efcf8e", "#2c2019");
  sign.position.set(0, 1.9, 1.83);
  sign.rotation.y = Math.PI;
  group.add(sign);
  group.add(createPointLight("#f0a24b", 62, 6, [0.1, 2.1, 0.15]));
  return group;
}

function createSnowDeskSet(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, 0, 2.8);

  const wood = createMaterial("#5b3823", { roughness: 0.82 });
  const darkWood = createMaterial("#2a1f19", { roughness: 0.82 });
  const paper = createMaterial("#d7c79d", { roughness: 0.76 });
  const redPin = createMaterial("#8d2f26", { emissive: "#5c1712", emissiveIntensity: 0.18, roughness: 0.55 });
  const generatedDeskProps = markEnvironmentShell(new THREE.Group());

  group.add(createRoomShell(6.0, 3.6, "#322820", "#24241f", "#805638"));
  group.add(createSnowFigure());
  generatedDeskProps.add(createMapTable());
  generatedDeskProps.add(createBookStack([0.95, 0.88, -0.34]));
  generatedDeskProps.add(createPaperStack([-0.7, 0.875, 0.22], 5, 1));
  generatedDeskProps.add(createInkBottle([-0.92, 0.9, -0.25]));
  generatedDeskProps.add(createDeskLamp([0.58, 0.91, 0.28]));

  const wallMap = createBox([1.65, 1.04, 0.04], paper, [1.65, 1.46, 1.7]);
  generatedDeskProps.add(wallMap);
  generatedDeskProps.add(createBox([1.78, 1.17, 0.07], darkWood, [1.65, 1.46, 1.73]));
  for (let index = 0; index < 13; index += 1) {
    const pin = createCylinder(0.025, 0.025, 0.016, redPin, [
      1.05 + ((index * 53) % 120) / 100,
      1.14 + ((index * 31) % 68) / 100,
      1.675,
    ], [Math.PI / 2, 0, 0], 12);
    generatedDeskProps.add(pin);
  }
  generatedDeskProps.add(createShelf([-2.2, 1.12, 1.3], darkWood, paper, 4));
  generatedDeskProps.add(createBox([0.92, 0.08, 0.92], wood, [-1.65, 0.42, -0.48]));
  generatedDeskProps.add(createBox([0.14, 0.52, 0.14], wood, [-1.65, 0.2, -0.48]));
  group.add(generatedDeskProps);
  group.add(createPointLight("#efbd74", 62, 6, [0.5, 2.0, 0.05]));
  return group;
}

function createMapTable(): THREE.Group {
  const group = new THREE.Group();
  const wood = createMaterial("#5b3823", { roughness: 0.82 });
  const paper = createMaterial("#cfc094", { roughness: 0.76 });
  const ink = createMaterial("#35302a", { roughness: 0.9 });
  group.add(createBox([2.05, 0.16, 1.22], wood, [0, 0.74, 0]));
  group.add(createBox([0.13, 0.72, 0.13], wood, [-0.82, 0.38, -0.46]));
  group.add(createBox([0.13, 0.72, 0.13], wood, [0.82, 0.38, -0.46]));
  group.add(createBox([0.13, 0.72, 0.13], wood, [-0.82, 0.38, 0.46]));
  group.add(createBox([0.13, 0.72, 0.13], wood, [0.82, 0.38, 0.46]));
  const map = createPlane([1.62, 0.96], paper, [0, 0.835, 0], [-Math.PI / 2, 0, 0]);
  group.add(map);
  for (let index = 0; index < 18; index += 1) {
    group.add(
      createBox(
        [0.012, 0.006, 0.18 + (index % 3) * 0.06],
        ink,
        [-0.64 + (index % 6) * 0.25, 0.842, -0.34 + Math.floor(index / 6) * 0.24],
        [0, 0.25 + index * 0.19, 0],
      ),
    );
  }
  return group;
}

function createBoardRoomSet(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, 0, 2.8);

  const wood = createMaterial("#4e321f", { roughness: 0.83 });
  const darkWood = createMaterial("#251c17", { roughness: 0.82 });
  const paper = createMaterial("#d8c79d", { roughness: 0.72 });
  const cloth = createMaterial("#243b35", { roughness: 0.86 });

  group.add(createRoomShell(6.2, 3.9, "#342820", "#22231f", "#815937"));
  group.add(createBox([3.15, 0.16, 1.08], wood, [0, 0.75, 0.08]));
  group.add(createBox([2.86, 0.04, 0.86], cloth, [0, 0.855, 0.08]));
  for (let index = 0; index < 5; index += 1) {
    group.add(createPaperStack([-1.18 + index * 0.58, 0.89, -0.05 + (index % 2) * 0.22], 2, 0.68));
  }
  for (const side of [-1, 1]) {
    for (let index = 0; index < 4; index += 1) {
      group.add(createChair([-1.2 + index * 0.8, 0.32, side * 0.88], side < 0 ? 0 : Math.PI));
    }
  }
  group.add(createBox([2.5, 1.12, 0.05], paper, [0, 1.5, 1.78]));
  group.add(createBox([2.68, 1.28, 0.08], darkWood, [0, 1.5, 1.82]));
  const sign = createSignMesh("Board of Guardians", 1.65, 0.28, "#efd9a2", "#2a2119");
  sign.position.set(0, 2.14, 1.75);
  sign.rotation.y = Math.PI;
  group.add(sign);
  group.add(createPointLight("#e7b36f", 68, 6.5, [0, 2.1, 0.15]));
  group.add(createPointLight("#a9c7d7", 14, 5, [-1.9, 1.8, 0.75]));
  return group;
}

function createPump(): THREE.Group {
  const group = new THREE.Group();
  const iron = createMaterial("#232a29", { roughness: 0.56, metalness: 0.58 });
  const brass = createMaterial("#a77b3a", { roughness: 0.42, metalness: 0.42 });
  const stone = createMaterial("#7c7467", { roughness: 0.92 });
  const water = createMaterial("#2d5f62", { transparent: true, opacity: 0.72, roughness: 0.42 });

  group.add(createCylinder(0.34, 0.42, 0.18, iron, [0, 0.09, 0], [0, 0, 0], 32));
  group.add(createCylinder(0.15, 0.19, 1.34, iron, [0, 0.78, 0], [0, 0, 0], 32));
  group.add(createCylinder(0.19, 0.15, 0.18, brass, [0, 1.48, 0], [0, 0, 0], 32));
  group.add(createCylinder(0.034, 0.034, 0.58, iron, [0.34, 1.12, 0], [0, 0, Math.PI / 2], 16));
  group.add(createBox([0.08, 0.58, 0.055], brass, [-0.24, 1.16, 0], [0, 0, -0.36]));
  group.add(createBox([0.18, 0.06, 0.09], brass, [-0.29, 1.43, 0]));
  group.add(createBox([0.82, 0.18, 0.52], stone, [0.3, 0.11, 0.58]));
  group.add(createBox([0.64, 0.026, 0.38], water, [0.3, 0.215, 0.58]));
  return group;
}

function createSnowFigure(): THREE.Group {
  const group = new THREE.Group();
  const coat = createMaterial("#171717", { roughness: 0.74 });
  const skin = createMaterial("#b89170", { roughness: 0.8 });
  const waistcoat = createMaterial("#393028", { roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.76, 8, 16), coat);
  const vest = createBox([0.28, 0.42, 0.045], waistcoat, [0, 0.82, -0.2]);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), skin);
  const hat = createCylinder(0.2, 0.18, 0.17, coat, [0, 1.58, 0], [0, 0, 0], 24);
  const brim = createCylinder(0.27, 0.27, 0.035, coat, [0, 1.5, 0], [0, 0, 0], 24);
  body.position.y = 0.82;
  head.position.y = 1.4;
  group.add(body, vest, head, hat, brim);
  group.position.set(-2.8, 0, -0.4);
  group.rotation.y = 2.52;
  enableShadows(group);
  return group;
}

function createHouseholdWitness(position: Vec3, rotationY: number): THREE.Group {
  const group = new THREE.Group();
  const dress = createMaterial("#3f3430", { roughness: 0.86 });
  const shawl = createMaterial("#614333", { roughness: 0.9 });
  const skin = createMaterial("#b89170", { roughness: 0.8 });
  const cap = createMaterial("#d9c8a8", { roughness: 0.84 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.58, 8, 16), dress);
  body.position.set(0, 0.84, 0);
  const shoulders = createBox([0.5, 0.08, 0.13], shawl, [0, 1.05, -0.02], [0.08, 0, 0]);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 16), skin);
  head.position.set(0, 1.28, 0);
  const bonnet = createCylinder(0.17, 0.13, 0.08, cap, [0, 1.39, 0], [0, 0, 0], 24);
  const apron = createBox([0.25, 0.34, 0.035], cap, [0, 0.78, -0.18]);

  group.add(body, shoulders, head, bonnet, apron);
  group.position.set(...position);
  group.rotation.y = rotationY;
  enableShadows(group);
  return group;
}

function createRoomShell(
  width: number,
  depth: number,
  wallColor: string,
  floorColor: string,
  trimColor: string,
): THREE.Group {
  const group = new THREE.Group();
  const wall = createMaterial(wallColor, { roughness: 0.93 });
  const floor = createMaterial(floorColor, { roughness: 0.98, map: createFloorboardTexture() });
  const trim = createMaterial(trimColor, { roughness: 0.84 });
  group.add(createBox([width, 0.04, depth], floor, [0, 0, 0.25]));
  group.add(createBox([width, 2.6, 0.12], wall, [0, 1.3, depth / 2 + 0.25]));
  group.add(createBox([0.12, 2.35, depth], wall, [-width / 2, 1.18, 0.25]));
  group.add(createBox([0.12, 2.35, depth], wall, [width / 2, 1.18, 0.25]));
  group.add(createBox([width, 0.08, 0.14], trim, [0, 0.62, depth / 2 + 0.18]));
  group.add(createBox([0.16, 0.08, depth], trim, [-width / 2 + 0.04, 0.62, 0.25]));
  group.add(createBox([0.16, 0.08, depth], trim, [width / 2 - 0.04, 0.62, 0.25]));
  return markEnvironmentShell(group);
}

function createFacade(
  position: Vec3,
  size: Vec3,
  facadeMaterial: THREE.MeshStandardMaterial,
  windowMaterial: THREE.MeshStandardMaterial,
  columns: number,
  rows: number,
  rotationY: number,
): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.y = rotationY;
  group.add(createBox(size, facadeMaterial, [0, 0, 0]));
  const horizontalAxis = size[0] > size[2] ? "x" : "z";
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const offset = -0.5 + (column + 0.5) / columns;
      const y = -size[1] * 0.16 + row * 0.56;
      const window = createBox(
        horizontalAxis === "x" ? [0.24, 0.34, 0.035] : [0.035, 0.34, 0.24],
        windowMaterial,
        horizontalAxis === "x" ? [offset * size[0] * 0.78, y, -size[2] * 0.54] : [-size[0] * 0.54, y, offset * size[2] * 0.78],
      );
      group.add(window);
    }
  }
  return group;
}

function createLedgerBook(position: Vec3): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  const cover = createMaterial("#6c342c", { roughness: 0.72 });
  const page = createMaterial("#e0cfa4", { roughness: 0.74 });
  const ink = createMaterial("#2b2923", { roughness: 0.9 });
  group.add(createBox([0.88, 0.04, 0.54], cover, [0, 0, 0]));
  group.add(createBox([0.4, 0.025, 0.49], page, [-0.22, 0.035, 0]));
  group.add(createBox([0.4, 0.025, 0.49], page, [0.22, 0.035, 0]));
  for (let line = 0; line < 5; line += 1) {
    group.add(createBox([0.25, 0.006, 0.012], ink, [-0.22, 0.055, -0.17 + line * 0.08]));
    group.add(createBox([0.25, 0.006, 0.012], ink, [0.22, 0.055, -0.17 + line * 0.08]));
  }
  return group;
}

function createPaperStack(position: Vec3, count: number, scale = 1): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  const paper = createMaterial("#d8c79d", { roughness: 0.76 });
  for (let index = 0; index < count; index += 1) {
    group.add(
      createBox(
        [0.44 * scale, 0.012, 0.32 * scale],
        paper,
        [0.006 * (index % 2), index * 0.014, 0.006 * (index % 3)],
        [0, index * 0.05, 0],
      ),
    );
  }
  return group;
}

function createBookStack(position: Vec3): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  const colors = ["#6c342c", "#284654", "#5c4b2c"];
  for (let index = 0; index < 3; index += 1) {
    group.add(createBox([0.46, 0.07, 0.3], createMaterial(colors[index], { roughness: 0.76 }), [0, index * 0.075, 0]));
  }
  return group;
}

function createInkBottle(position: Vec3): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  const glass = createMaterial("#152126", { roughness: 0.28, metalness: 0.05 });
  const cap = createMaterial("#2d2923", { roughness: 0.5, metalness: 0.16 });
  group.add(createCylinder(0.06, 0.075, 0.08, glass, [0, 0.04, 0], [0, 0, 0], 18));
  group.add(createCylinder(0.045, 0.04, 0.035, cap, [0, 0.095, 0], [0, 0, 0], 18));
  return group;
}

function createDeskLamp(position: Vec3, shadeMaterial = createMaterial("#b58b50", { emissive: "#7b4d20", emissiveIntensity: 0.32 })): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  const brass = createMaterial("#a57a3b", { roughness: 0.42, metalness: 0.42 });
  group.add(createCylinder(0.05, 0.07, 0.42, brass, [0, 0.2, 0], [0, 0, 0], 16));
  group.add(createCylinder(0.2, 0.28, 0.18, shadeMaterial, [0, 0.46, 0], [0, 0, 0], 24));
  group.add(createPointLight("#f0bd73", 24, 3.2, [0, 0.46, 0]));
  return group;
}

function createShelf(position: Vec3, shelfMaterial: THREE.MeshStandardMaterial, paperMaterial: THREE.MeshStandardMaterial, books: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  for (let shelfIndex = 0; shelfIndex < 3; shelfIndex += 1) {
    group.add(createBox([1.0, 0.08, 0.18], shelfMaterial, [0, shelfIndex * 0.34, 0]));
    for (let bookIndex = 0; bookIndex < books; bookIndex += 1) {
      group.add(
        createBox(
          [0.1, 0.26 + (bookIndex % 2) * 0.05, 0.13],
          bookIndex % 3 === 0 ? paperMaterial : createMaterial(bookIndex % 2 === 0 ? "#5a352b" : "#2f4b52", { roughness: 0.78 }),
          [-0.38 + bookIndex * 0.16, 0.16 + shelfIndex * 0.34, 0.02],
          [0, 0, (bookIndex % 2) * 0.05],
        ),
      );
    }
  }
  return group;
}

function createBucket(position: Vec3): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  const wood = createMaterial("#5f442e", { roughness: 0.82 });
  const metal = createMaterial("#3f4140", { roughness: 0.52, metalness: 0.24 });
  group.add(createCylinder(0.17, 0.14, 0.26, wood, [0, 0.13, 0], [0, 0, 0], 20));
  group.add(createCylinder(0.175, 0.175, 0.018, metal, [0, 0.27, 0], [0, 0, 0], 20));
  return group;
}

function createBench(position: Vec3): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  const wood = createMaterial("#4a3325", { roughness: 0.88 });
  group.add(createBox([1.15, 0.08, 0.32], wood, [0, 0.35, 0]));
  group.add(createBox([0.1, 0.36, 0.1], wood, [-0.44, 0.18, 0]));
  group.add(createBox([0.1, 0.36, 0.1], wood, [0.44, 0.18, 0]));
  return group;
}

function createVat(position: Vec3, material: THREE.MeshStandardMaterial): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  group.add(createCylinder(0.46, 0.58, 1.04, material, [0, 0.55, 0], [0, 0, 0], 36));
  group.add(createCylinder(0.5, 0.5, 0.08, createMaterial("#2b2926", { roughness: 0.52, metalness: 0.18 }), [0, 1.1, 0], [0, 0, 0], 36));
  group.add(createBox([0.08, 1.14, 0.08], createMaterial("#282522", { roughness: 0.65, metalness: 0.12 }), [-0.56, 0.56, 0]));
  return group;
}

function createBarrel(position: Vec3, scale = 1): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  group.scale.setScalar(scale);
  const barrelMat = createMaterial("#68452b", { roughness: 0.72 });
  const bandMat = createMaterial("#262626", { roughness: 0.5, metalness: 0.25 });
  const barrel = createCylinder(0.28, 0.28, 0.72, barrelMat, [0, 0, 0], [0, 0, Math.PI / 2], 28);
  group.add(barrel);
  for (const offset of [-0.24, 0.24]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.014, 8, 28), bandMat);
    band.position.set(offset, 0, 0);
    band.rotation.y = Math.PI / 2;
    group.add(band);
  }
  enableShadows(group);
  return group;
}

function createCrate(position: Vec3): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  const wood = createMaterial("#5d4029", { roughness: 0.86 });
  group.add(createBox([0.62, 0.46, 0.52], wood, [0, 0, 0]));
  group.add(createBox([0.66, 0.05, 0.56], createMaterial("#37271f", { roughness: 0.85 }), [0, 0.18, 0]));
  return group;
}

function createMug(position: Vec3): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  const ceramic = createMaterial("#d2c2a0", { roughness: 0.58 });
  group.add(createCylinder(0.065, 0.065, 0.12, ceramic, [0, 0.06, 0], [0, 0, 0], 18));
  group.add(createCylinder(0.042, 0.042, 0.012, createMaterial("#6b4a2f", { roughness: 0.5 }), [0, 0.126, 0], [0, 0, 0], 18));
  return group;
}

function createSampleVial(position: Vec3): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  const glass = createMaterial("#d6f3ef", { transparent: true, opacity: 0.38, roughness: 0.18, metalness: 0.02 });
  const cork = createMaterial("#7b5736", { roughness: 0.82 });
  const water = createMaterial("#6bbfba", { transparent: true, opacity: 0.58, roughness: 0.32 });
  group.add(createCylinder(0.045, 0.055, 0.26, glass, [0, 0.15, 0], [0.12, 0.2, 0.08], 18));
  group.add(createCylinder(0.035, 0.038, 0.045, cork, [0, 0.3, 0], [0.12, 0.2, 0.08], 16));
  group.add(createCylinder(0.04, 0.048, 0.12, water, [0, 0.1, 0], [0.12, 0.2, 0.08], 18));
  enableShadows(group);
  return group;
}

function createChair(position: Vec3, rotationY: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.y = rotationY;
  const wood = createMaterial("#3d2b22", { roughness: 0.86 });
  group.add(createBox([0.42, 0.08, 0.42], wood, [0, 0.42, 0]));
  group.add(createBox([0.42, 0.58, 0.08], wood, [0, 0.72, 0.18]));
  for (const x of [-0.16, 0.16]) {
    for (const z of [-0.16, 0.16]) {
      group.add(createBox([0.055, 0.42, 0.055], wood, [x, 0.2, z]));
    }
  }
  return group;
}

function createSignMesh(text: string, width: number, height: number, foreground: string, background: string): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create sign texture.");
  }
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(236, 214, 165, 0.72)";
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  ctx.fillStyle = foreground;
  ctx.font = "600 58px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  return mesh;
}

function createPointLight(color: string, intensity: number, distance: number, position: Vec3): THREE.PointLight {
  const light = new THREE.PointLight(color, intensity, distance, 1.65);
  light.position.set(...position);
  light.castShadow = false;
  return light;
}

function createBox(
  size: Vec3,
  material: THREE.Material,
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
  segments = 24,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createPlane(
  size: [number, number],
  material: THREE.Material,
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function createMaterial(
  color: string,
  options: Partial<THREE.MeshStandardMaterialParameters> = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.84,
    metalness: 0.03,
    ...options,
  });
}

function enableShadows(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function createCobbleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create cobble texture.");
  }
  ctx.fillStyle = "#3b3934";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 9; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      const jitterX = ((x * 41 + y * 19) % 13) - 6;
      const jitterY = ((x * 17 + y * 37) % 11) - 5;
      ctx.fillStyle = (x + y) % 2 === 0 ? "#46423a" : "#302f2b";
      roundRect(ctx, x * 58 + jitterX, y * 58 + jitterY, 52, 45, 9);
      ctx.fill();
      ctx.strokeStyle = "rgba(16, 15, 14, 0.32)";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function createFloorboardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create floor texture.");
  }
  ctx.fillStyle = "#2c2923";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 8; y += 1) {
    ctx.fillStyle = y % 2 === 0 ? "#312d26" : "#25241f";
    ctx.fillRect(0, y * 64, canvas.width, 60);
    ctx.strokeStyle = "rgba(12, 11, 10, 0.45)";
    ctx.beginPath();
    ctx.moveTo(0, y * 64);
    ctx.lineTo(canvas.width, y * 64);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  return texture;
}

function createSpriteLabel(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not create label texture.");
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(18, 17, 14, 0.72)";
  roundRect(ctx, 30, 28, 324, 68, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(239, 214, 151, 0.32)";
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "600 34px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.scale.set(1.25, 0.42, 1);
  return sprite;
}

function createCaptureDataUrl(source: HTMLCanvasElement): string {
  const maxWidth = 760;
  const scale = Math.min(1, maxWidth / source.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return "";
  }
  ctx.fillStyle = "#111619";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.86);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
