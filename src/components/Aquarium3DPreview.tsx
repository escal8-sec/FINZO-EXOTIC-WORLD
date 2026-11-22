import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import {
  BackingColor,
  FiltrationPreset,
  GlassFinish,
  LightingPreset,
  LivestockStarter,
  PlantsLevel,
  PlumbingKit,
  RockHardscape,
  StandMaterial,
  SubstrateOption,
  TankShape,
} from '../types';

export interface Aquarium3DConfig {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  liters: number;
  glassThicknessMm: number;
  shape: TankShape;
  glassFinish: GlassFinish;
  backingColor: BackingColor;
  stand: StandMaterial;
  lighting: LightingPreset;
  filtration: FiltrationPreset;
  substrate: SubstrateOption;
  plants: PlantsLevel;
  hardscape: RockHardscape;
  livestock: LivestockStarter;
  plumbingKit: PlumbingKit;
}

type CameraPreset = 'isometric' | 'front' | 'top' | 'detail';

interface FishActor {
  group: THREE.Group;
  tail: THREE.Object3D;
  baseY: number;
  radiusX: number;
  radiusZ: number;
  speed: number;
  phase: number;
  bobAmp: number;
}

interface BubbleActor {
  mesh: THREE.Mesh;
  baseX: number;
  baseZ: number;
  minY: number;
  maxY: number;
  speed: number;
  phase: number;
}

function detectSoftwareWebGL(canvas: HTMLCanvasElement): boolean {
  try {
    const gl2 = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl2) return true;
    const ext = gl2.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return false;
    const renderer = String(gl2.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
    return /swiftshader|llvmpipe|softpipe|software/i.test(renderer);
  } catch {
    return false;
  }
}

function createProceduralFish(bodyColor: number, finColor: number, scale = 1, discShape = false): {
  group: THREE.Group;
  tail: THREE.Object3D;
} {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.25,
    metalness: 0.22,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: finColor,
    roughness: 0.35,
    metalness: 0.15,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });

  // 1. Torso
  const bodyGeo = new THREE.SphereGeometry(0.055 * scale, 16, 12);
  bodyGeo.scale(discShape ? 1.15 : 1.75, discShape ? 1.25 : 0.72, 0.34);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // 2. Dorsal fin
  const dorsalGeo = new THREE.ConeGeometry(0.032 * scale, 0.05 * scale, 3);
  dorsalGeo.scale(1.4, 1, 0.2);
  const dorsal = new THREE.Mesh(dorsalGeo, finMat);
  dorsal.position.set(-0.01 * scale, (discShape ? 0.068 : 0.042) * scale, 0);
  dorsal.rotation.z = 0.25;
  group.add(dorsal);

  // 3. Ventral fin
  const ventralGeo = new THREE.ConeGeometry(0.022 * scale, 0.038 * scale, 3);
  ventralGeo.scale(1.1, 1, 0.2);
  const ventral = new THREE.Mesh(ventralGeo, finMat);
  ventral.position.set(-0.01 * scale, -(discShape ? 0.062 : 0.038) * scale, 0);
  ventral.rotation.z = Math.PI - 0.2;
  group.add(ventral);

  // 4. Articulated Caudal Tail
  const tailPivot = new THREE.Group();
  tailPivot.position.set(-(discShape ? 0.06 : 0.088) * scale, 0, 0);
  const tailGeo = new THREE.ConeGeometry(0.045 * scale, 0.06 * scale, 3);
  tailGeo.scale(0.9, 1, 0.15);
  const tailMesh = new THREE.Mesh(tailGeo, finMat);
  tailMesh.rotation.z = -Math.PI / 2;
  tailMesh.position.set(-0.025 * scale, 0, 0);
  tailPivot.add(tailMesh);
  group.add(tailPivot);

  // 5. Eyes
  const eyeGeo = new THREE.SphereGeometry(0.008 * scale, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2 });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set((discShape ? 0.035 : 0.055) * scale, 0.01 * scale, 0.017 * scale);
  const eyeR = eyeL.clone();
  eyeR.position.z = -0.017 * scale;
  group.add(eyeL, eyeR);

  return { group, tail: tailPivot };
}

export function Aquarium3DPreview({ config }: { config: Aquarium3DConfig }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('isometric');
  const [waterFlowOn, setWaterFlowOn] = useState(true);
  const [lightingOn, setLightingOn] = useState(true);

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

  // Apply camera preset
  const moveCameraToPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;

    const c = configRef.current;
    const lM = c.lengthCm / 100;
    const hM = c.heightCm / 100;
    const standH = c.stand === 'None (Tank Only)' ? 0 : 0.72;
    const targetY = standH + hM * 0.5;
    const dist = Math.max(1.3, lM * 1.45 + 0.55);

    if (preset === 'front') {
      cam.position.set(0, targetY + 0.08, dist);
    } else if (preset === 'top') {
      cam.position.set(0, targetY + dist * 0.95, 0.35);
    } else if (preset === 'detail') {
      cam.position.set(lM * 0.42, targetY + 0.05, dist * 0.58);
    } else {
      cam.position.set(dist * 0.78, targetY + 0.45, dist * 0.85);
    }
    ctrl.target.set(0, targetY, 0);
    ctrl.update();
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.innerHTML = '';
    container.appendChild(canvas);

    const isSoftwareGl = detectSoftwareWebGL(canvas);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    if (!isSoftwareGl) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040b16);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 460;
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.05, 30);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.7;
    controls.maxDistance = 6.5;
    controls.maxPolarAngle = Math.PI * 0.52;
    controlsRef.current = controls;

    // Ground floor plane + ambient studio glow
    const floorGeo = new THREE.CircleGeometry(4.5, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x06101f,
      roughness: 0.88,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = !isSoftwareGl;
    scene.add(floor);

    const rimGrid = new THREE.GridHelper(5, 20, 0x1e3a5f, 0x0b1c33);
    rimGrid.position.y = 0.001;
    scene.add(rimGrid);

    const hemiLight = new THREE.HemisphereLight(0xcffafe, 0x040b16, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.45);
    keyLight.position.set(2.4, 3.6, 2.6);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const aquariumGroup = new THREE.Group();
    scene.add(aquariumGroup);

    const fishActors: FishActor[] = [];
    const bubbleActors: BubbleActor[] = [];
    let tankSpotLight: THREE.SpotLight | null = null;

    const buildAquariumScene = () => {
      // Dispose old children cleanly
      while (aquariumGroup.children.length > 0) {
        const obj = aquariumGroup.children[0];
        aquariumGroup.remove(obj);
        obj.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => m.dispose());
          }
        });
      }
      fishActors.length = 0;
      bubbleActors.length = 0;
      if (tankSpotLight) {
        scene.remove(tankSpotLight);
        scene.remove(tankSpotLight.target);
        tankSpotLight.dispose();
        tankSpotLight = null;
      }

      const c = configRef.current;
      const l = Math.max(0.3, c.lengthCm / 100);
      const w = Math.max(0.2, c.widthCm / 100);
      const h = Math.max(0.25, c.heightCm / 100);
      const t = Math.max(0.006, c.glassThicknessMm / 1000);

      const standH = c.stand === 'None (Tank Only)' ? 0 : 0.72;
      const matY = standH;
      const matThickness = 0.008;
      const tankBaseY = matY + matThickness;

      // 1. Stand / Cabinet (grounded flush at y = 0)
      if (standH > 0) {
        let standColor = 0x0b1120;
        let standRough = 0.55;
        let standMetal = 0.15;
        if (c.stand === 'Burmese Teak Hardwood') {
          standColor = 0x5c3a21;
          standRough = 0.45;
          standMetal = 0.05;
        } else if (c.stand === 'Brushed Anodized Steel') {
          standColor = 0x475569;
          standRough = 0.28;
          standMetal = 0.85;
        }
        const standMat = new THREE.MeshStandardMaterial({
          color: standColor,
          roughness: standRough,
          metalness: standMetal,
        });
        const cabinetGeo = new THREE.BoxGeometry(l + 0.01, standH - 0.025, w + 0.01);
        const cabinet = new THREE.Mesh(cabinetGeo, standMat);
        cabinet.position.set(0, 0.025 + (standH - 0.025) / 2, 0);
        cabinet.castShadow = !isSoftwareGl;
        cabinet.receiveShadow = !isSoftwareGl;
        aquariumGroup.add(cabinet);

        // Leveling feet
        const footMat = new THREE.MeshStandardMaterial({
          color: 0xd4af37,
          roughness: 0.25,
          metalness: 0.85,
        });
        const footGeo = new THREE.CylinderGeometry(0.018, 0.02, 0.025, 12);
        const xOff = l * 0.42;
        const zOff = w * 0.42;
        [
          [-xOff, -zOff],
          [xOff, -zOff],
          [-xOff, zOff],
          [xOff, zOff],
        ].forEach(([fx, fz]) => {
          const foot = new THREE.Mesh(footGeo, footMat);
          foot.position.set(fx, 0.0125, fz);
          aquariumGroup.add(foot);
        });
      }

      // 2. Leveling foam mat directly below glass tank
      const foamMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.95 });
      const foam = new THREE.Mesh(new THREE.BoxGeometry(l, matThickness, w), foamMat);
      foam.position.set(0, matY + matThickness / 2, 0);
      aquariumGroup.add(foam);

      // 3. Backing panel color
      if (c.backingColor !== 'Clear Panorama') {
        const backingHex =
          c.backingColor === 'Deep Ocean Navy'
            ? 0x071d3d
            : c.backingColor === 'Obsidian Black'
            ? 0x030712
            : 0xcbd5e1;
        const backingMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(l - t * 2, h - t),
          new THREE.MeshStandardMaterial({
            color: backingHex,
            roughness: c.backingColor === 'Frosted Mist' ? 0.6 : 0.85,
            transparent: c.backingColor === 'Frosted Mist',
            opacity: c.backingColor === 'Frosted Mist' ? 0.65 : 0.96,
            side: THREE.DoubleSide,
          })
        );
        backingMesh.position.set(0, tankBaseY + h / 2, -w / 2 + 0.002);
        aquariumGroup.add(backingMesh);
      }

      // 4. Water volume & surface meniscus
      const waterLevel = h * 0.89;
      const waterColor =
        c.lighting === 'Marine Reef Actinics'
          ? 0x0ea5e9
          : c.lighting === 'Warm Botanical Spot'
          ? 0x14b8a6
          : 0x22d3ee;

      const waterMesh = new THREE.Mesh(
        new THREE.BoxGeometry(l - t * 2.2, waterLevel - 0.04, w - t * 2.2),
        new THREE.MeshStandardMaterial({
          color: waterColor,
          transparent: true,
          opacity: 0.14,
          roughness: 0.08,
          metalness: 0.1,
          depthWrite: false,
        })
      );
      waterMesh.position.set(0, tankBaseY + t + (waterLevel - 0.04) / 2 + 0.03, 0);
      aquariumGroup.add(waterMesh);

      const waterTop = new THREE.Mesh(
        new THREE.PlaneGeometry(l - t * 2.2, w - t * 2.2),
        new THREE.MeshStandardMaterial({
          color: 0x67e8f9,
          transparent: true,
          opacity: 0.32,
          roughness: 0.05,
          metalness: 0.3,
          side: THREE.DoubleSide,
        })
      );
      waterTop.rotation.x = -Math.PI / 2;
      waterTop.position.set(0, tankBaseY + waterLevel, 0);
      aquariumGroup.add(waterTop);

      // 5. Substrate bed grounded inside tank base
      if (c.substrate !== 'None') {
        const subColor =
          c.substrate === 'Japanese Aquasoil'
            ? 0x2b211a
            : c.substrate === 'Silica River Sand'
            ? 0xd6c7a9
            : 0x1f242d;
        const subH = Math.min(0.065, h * 0.16);
        const substrate = new THREE.Mesh(
          new THREE.BoxGeometry(l - t * 2.4, subH, w - t * 2.4),
          new THREE.MeshStandardMaterial({
            color: subColor,
            roughness: 0.92,
            metalness: 0.02,
          })
        );
        substrate.position.set(0, tankBaseY + t + subH / 2, 0);
        substrate.receiveShadow = !isSoftwareGl;
        aquariumGroup.add(substrate);
      }

      const interiorFloorY =
        tankBaseY + t + (c.substrate !== 'None' ? Math.min(0.065, h * 0.16) : 0);

      // 6. Hardscape (Seiryu Stone / Dragon Stone / Driftwood) grounded in substrate
      if (c.hardscape !== 'None') {
        const isWood = c.hardscape === 'Malaysian Driftwood';
        const rockColor =
          c.hardscape === 'Seiryu Mountain Stone'
            ? 0x475569
            : c.hardscape === 'Ohko Dragon Stone'
            ? 0x8c6f4e
            : 0x593a23;
        const hsMat = new THREE.MeshStandardMaterial({
          color: rockColor,
          roughness: isWood ? 0.85 : 0.72,
          metalness: 0.05,
        });

        const rockCount = isWood ? 3 : 5;
        for (let i = 0; i < rockCount; i++) {
          const rx = (i - (rockCount - 1) / 2) * (l * 0.16);
          const rz = ((i % 2 === 0 ? -1 : 1) * w) * 0.14;
          const rScale = i === 1 ? Math.min(l, h) * 0.28 : Math.min(l, h) * 0.16;
          const geo = isWood
            ? new THREE.CylinderGeometry(rScale * 0.12, rScale * 0.24, rScale * 1.4, 7)
            : new THREE.DodecahedronGeometry(rScale * 0.55, 0);
          const piece = new THREE.Mesh(geo, hsMat);
          if (isWood) {
            piece.rotation.z = (i - 1) * 0.45 + 0.3;
            piece.rotation.x = 0.2;
          } else {
            piece.scale.set(1.1, 1.35, 0.85);
            piece.rotation.y = i * 1.1;
          }
          piece.position.set(rx, interiorFloorY + rScale * 0.35, rz);
          piece.castShadow = !isSoftwareGl;
          aquariumGroup.add(piece);
        }
      }

      // 7. Aquatic Plants grounded in substrate
      if (c.plants !== 'None') {
        const plantCount = c.plants === 'Lush Nature Aquascape' ? 14 : 6;
        const stemMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          roughness: 0.6,
        });
        const accentMat = new THREE.MeshStandardMaterial({
          color: 0x34d399,
          roughness: 0.55,
        });

        for (let i = 0; i < plantCount; i++) {
          const px = ((i / Math.max(1, plantCount - 1)) - 0.5) * (l * 0.78);
          const pz = ((i % 3) - 1) * (w * 0.22);
          const stemH = Math.min(waterLevel * 0.72, 0.09 + ((i * 37) % 100) / 500);
          const blade = new THREE.Mesh(
            new THREE.ConeGeometry(0.024, stemH, 5),
            i % 2 === 0 ? stemMat : accentMat
          );
          blade.position.set(px, interiorFloorY + stemH / 2 - 0.005, pz);
          blade.rotation.z = ((i % 3) - 1) * 0.14;
          aquariumGroup.add(blade);
        }
      }

      // 8. Filtration Hardware
      if (c.filtration === 'External Canister + 316L Lily Pipes') {
        const steelMat = new THREE.MeshStandardMaterial({
          color: 0xd1d5db,
          roughness: 0.18,
          metalness: 0.92,
        });
        const pipeGeo = new THREE.CylinderGeometry(0.009, 0.009, h * 0.75, 12);
        const inflow = new THREE.Mesh(pipeGeo, steelMat);
        inflow.position.set(-l / 2 + 0.04, tankBaseY + h - (h * 0.75) / 2 + 0.02, -w / 2 + 0.05);
        const outflow = new THREE.Mesh(
          new THREE.CylinderGeometry(0.009, 0.009, h * 0.35, 12),
          steelMat
        );
        outflow.position.set(-l / 2 + 0.08, tankBaseY + h - 0.06, -w / 2 + 0.05);
        const lilyBell = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.04, 14, 1, true), steelMat);
        lilyBell.rotation.z = -Math.PI / 2;
        lilyBell.position.set(-l / 2 + 0.105, tankBaseY + waterLevel - 0.03, -w / 2 + 0.05);
        aquariumGroup.add(inflow, outflow, lilyBell);
      } else if (c.filtration === 'Concealed Rear Sump') {
        const sumpPanel = new THREE.Mesh(
          new THREE.BoxGeometry(l - t * 2.2, h * 0.94, 0.06),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.2 })
        );
        sumpPanel.position.set(0, tankBaseY + (h * 0.94) / 2, -w / 2 + 0.035);
        aquariumGroup.add(sumpPanel);
      } else if (c.filtration === 'Internal Whisper Bio') {
        const bioBox = new THREE.Mesh(
          new THREE.BoxGeometry(0.06, Math.min(0.22, h * 0.65), 0.06),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
        );
        bioBox.position.set(l / 2 - 0.045, interiorFloorY + Math.min(0.11, h * 0.3), -w / 2 + 0.045);
        aquariumGroup.add(bioBox);
      }

      // 9. Glass Panels (OptiClear / Black Silicone / Tinted Obsidian Back + Bowfront subtle curve feel)
      const isBlackSilicone = c.glassFinish === 'Ultra-Clear Black Silicone';
      const isTintedBack = c.glassFinish === 'Tinted Obsidian Back';
      const glassColor =
        c.glassFinish === 'OptiClear Low-Iron' ? 0xdff9ff : 0xcffafe;

      const glassMat = new THREE.MeshPhysicalMaterial({
        color: glassColor,
        transparent: true,
        opacity: isSoftwareGl ? 0.24 : 0.18,
        roughness: 0.05,
        metalness: 0.05,
        reflectivity: 0.85,
        depthWrite: false,
      });

      // Bottom pane
      const bottomGlass = new THREE.Mesh(new THREE.BoxGeometry(l, t, w), glassMat);
      bottomGlass.position.set(0, tankBaseY + t / 2, 0);
      aquariumGroup.add(bottomGlass);

      // Front pane (curved slightly if Bowfront via segmented planes)
      const frontGeo =
        c.shape === 'Bowfront'
          ? new THREE.CylinderGeometry(
              w * 1.4,
              w * 1.4,
              h,
              18,
              1,
              true,
              -Math.PI * 0.2,
              Math.PI * 0.4
            )
          : new THREE.BoxGeometry(l, h, t);
      const frontPane = new THREE.Mesh(
        frontGeo,
        c.shape === 'Bowfront'
          ? new THREE.MeshPhysicalMaterial({
              color: glassColor,
              transparent: true,
              opacity: 0.16,
              roughness: 0.05,
              side: THREE.DoubleSide,
              depthWrite: false,
            })
          : glassMat
      );
      if (c.shape === 'Bowfront') {
        frontPane.scale.set(l / (w * 1.1), 1, 0.35);
        frontPane.position.set(0, tankBaseY + h / 2, w / 2 - w * 0.38);
      } else {
        frontPane.position.set(0, tankBaseY + h / 2, w / 2 - t / 2);
      }
      aquariumGroup.add(frontPane);

      // Back pane
      const backPane = new THREE.Mesh(
        new THREE.BoxGeometry(l, h, t),
        isTintedBack
          ? new THREE.MeshStandardMaterial({
              color: 0x090d16,
              roughness: 0.12,
              metalness: 0.2,
              transparent: true,
              opacity: 0.86,
            })
          : glassMat
      );
      backPane.position.set(0, tankBaseY + h / 2, -w / 2 + t / 2);
      aquariumGroup.add(backPane);

      // Left & Right panes
      const sideGeo = new THREE.BoxGeometry(t, h, w - t * 2);
      const leftPane = new THREE.Mesh(sideGeo, glassMat);
      leftPane.position.set(-l / 2 + t / 2, tankBaseY + h / 2, 0);
      const rightPane = new THREE.Mesh(sideGeo, glassMat);
      rightPane.position.set(l / 2 - t / 2, tankBaseY + h / 2, 0);
      aquariumGroup.add(leftPane, rightPane);

      // Crisp seam edges (Cyan crystal or Black Silicone)
      const seamMat = new THREE.LineBasicMaterial({
        color: isBlackSilicone ? 0x020617 : 0x67e8f9,
        transparent: true,
        opacity: isBlackSilicone ? 0.9 : 0.45,
      });
      const tankOutline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(l, h, w)),
        seamMat
      );
      tankOutline.position.set(0, tankBaseY + h / 2, 0);
      aquariumGroup.add(tankOutline);

      // Peninsula overflow weir accent
      if (c.shape === 'Peninsula') {
        const overflow = new THREE.Mesh(
          new THREE.BoxGeometry(0.11, h * 0.95, w * 0.5),
          new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.4 })
        );
        overflow.position.set(-l / 2 + 0.06, tankBaseY + (h * 0.95) / 2, 0);
        aquariumGroup.add(overflow);
      }

      // 10. LED Pendant & Gantry Arms (grounded to tank/stand — no floating!)
      if (c.lighting !== 'None') {
        const hoodY = tankBaseY + h + 0.16;
        const armMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          roughness: 0.25,
          metalness: 0.88,
        });
        // Two brushed steel gantry brackets clamping to back glass rim
        [-l * 0.34, l * 0.34].forEach((ax) => {
          const vertPost = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 10), armMat);
          vertPost.position.set(ax, tankBaseY + h + 0.08, -w / 2 + 0.01);
          const armDepth = w / 2;
          const horizArm = new THREE.Mesh(
            new THREE.CylinderGeometry(0.007, 0.007, armDepth, 10),
            armMat
          );
          horizArm.rotation.x = Math.PI / 2;
          horizArm.position.set(ax, hoodY + 0.015, -w / 4);
          aquariumGroup.add(vertPost, horizArm);
        });

        const hoodMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.3,
          metalness: 0.8,
        });
        const hood = new THREE.Mesh(new THREE.BoxGeometry(l * 0.84, 0.026, 0.12), hoodMat);
        hood.position.set(0, hoodY, 0);
        aquariumGroup.add(hood);

        const emitterColor =
          c.lighting === 'Marine Reef Actinics'
            ? 0x38bdf8
            : c.lighting === 'Warm Botanical Spot'
            ? 0xfde68a
            : 0xecfeff;

        const emitterStrip = new THREE.Mesh(
          new THREE.PlaneGeometry(l * 0.78, 0.08),
          new THREE.MeshBasicMaterial({
            color: lightingOn ? emitterColor : 0x1e293b,
            side: THREE.DoubleSide,
          })
        );
        emitterStrip.rotation.x = Math.PI / 2;
        emitterStrip.position.set(0, hoodY - 0.014, 0);
        aquariumGroup.add(emitterStrip);

        if (lightingOn) {
          tankSpotLight = new THREE.SpotLight(emitterColor, 2.2, 4.5, Math.PI / 3.2, 0.45, 1.2);
          tankSpotLight.position.set(0, hoodY - 0.02, 0);
          tankSpotLight.target.position.set(0, tankBaseY, 0);
          scene.add(tankSpotLight);
          scene.add(tankSpotLight.target);
        }
      }

      // 11. Animated Exotic Livestock
      if (c.livestock !== 'None') {
        const fishCount =
          c.livestock === 'Cardinal Tetra Shoal (12)'
            ? 9
            : c.livestock === 'Royal Turquoise Discus Pair'
            ? 2
            : 1;

        for (let i = 0; i < fishCount; i++) {
          const isDiscus = c.livestock === 'Royal Turquoise Discus Pair';
          const isBetta = c.livestock === 'Galaxy Koi Betta Feature';
          const { group, tail } = createProceduralFish(
            isDiscus ? 0x06b6d4 : isBetta ? 0xf43f5e : 0x38bdf8,
            isDiscus ? 0xf59e0b : isBetta ? 0xfbbf24 : 0xef4444,
            isDiscus ? 1.25 : isBetta ? 0.9 : 0.55,
            isDiscus
          );
          const swimMinY = interiorFloorY + 0.07;
          const swimMaxY = tankBaseY + waterLevel - 0.07;
          const baseY =
            swimMinY +
            ((i + 1) / (fishCount + 1)) * Math.max(0.06, swimMaxY - swimMinY);

          aquariumGroup.add(group);
          fishActors.push({
            group,
            tail,
            baseY,
            radiusX: l * 0.28,
            radiusZ: w * 0.22,
            speed: (isBetta ? 0.45 : isDiscus ? 0.35 : 0.78) + (i % 3) * 0.09,
            phase: i * 1.15,
            bobAmp: 0.014,
          });
        }
      }

      // 12. Rising Micro-Bubbles when water flow is active
      if (waterFlowOn && c.filtration !== 'None') {
        const bubMat = new THREE.MeshBasicMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0.55,
        });
        const bubGeo = new THREE.SphereGeometry(0.0055, 6, 6);
        for (let b = 0; b < 14; b++) {
          const mesh = new THREE.Mesh(bubGeo, bubMat);
          const bx = -l / 2 + 0.08 + ((b % 4) - 1.5) * 0.018;
          const bz = -w / 2 + 0.07 + ((b % 3) - 1) * 0.018;
          mesh.position.set(bx, interiorFloorY + 0.02, bz);
          aquariumGroup.add(mesh);
          bubbleActors.push({
            mesh,
            baseX: bx,
            baseZ: bz,
            minY: interiorFloorY + 0.02,
            maxY: tankBaseY + waterLevel - 0.02,
            speed: 0.14 + (b % 5) * 0.03,
            phase: b * 0.42,
          });
        }
      }
    };

    buildAquariumScene();
    moveCameraToPreset(cameraPreset);

    // ResizeObserver for crisp viewport sizing
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(200, Math.floor(entry.contentRect.width));
        const h = Math.max(260, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    ro.observe(container);
    renderer.setSize(width, height, false);

    // Sync-paced render loop honoring software WebGL guardrails
    const rawGl = renderer.getContext() as WebGL2RenderingContext;
    const canSync = typeof rawGl.fenceSync === 'function';
    let disposed = false;
    let rafId = 0;

    const afterDraw = (cb: () => void) => {
      if (!isSoftwareGl || !canSync) {
        rafId = window.requestAnimationFrame(cb);
        return;
      }
      const sync = rawGl.fenceSync(rawGl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (!sync) {
        rafId = window.requestAnimationFrame(cb);
        return;
      }
      rawGl.flush();
      const poll = () => {
        if (disposed) {
          rawGl.deleteSync(sync);
          return;
        }
        const status = rawGl.clientWaitSync(sync, 0, 0);
        if (status === rawGl.WAIT_FAILED || status === rawGl.TIMEOUT_EXPIRED) {
          rafId = window.requestAnimationFrame(poll);
        } else {
          rawGl.deleteSync(sync);
          rafId = window.requestAnimationFrame(cb);
        }
      };
      rafId = window.requestAnimationFrame(poll);
    };

    const startTime = performance.now();
    const tick = () => {
      if (disposed) return;
      const t = (performance.now() - startTime) / 1000;

      // Animate fish figure-eight paths inside tank bounds
      for (const actor of fishActors) {
        const theta = t * actor.speed + actor.phase;
        const x = Math.sin(theta) * actor.radiusX;
        const z = Math.sin(theta * 2) * actor.radiusZ * 0.6;
        const dx = Math.cos(theta) * actor.radiusX * actor.speed;
        const dz = Math.cos(theta * 2) * 2 * actor.radiusZ * 0.6 * actor.speed;

        actor.group.position.set(x, actor.baseY + Math.sin(t * 1.8 + actor.phase) * actor.bobAmp, z);
        actor.group.rotation.y = Math.atan2(-dz, dx);
        actor.tail.rotation.y = Math.sin(t * 7.5 + actor.phase) * 0.38;
      }

      // Animate rising bubbles
      for (const bub of bubbleActors) {
        const span = Math.max(0.05, bub.maxY - bub.minY);
        const progress = ((t * bub.speed + bub.phase) % 1 + 1) % 1;
        bub.mesh.position.y = bub.minY + progress * span;
        bub.mesh.position.x = bub.baseX + Math.sin(t * 3 + bub.phase) * 0.008;
      }

      controls.update();
      renderer.render(scene, camera);
      afterDraw(tick);
    };

    tick();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      if (tankSpotLight) {
        scene.remove(tankSpotLight);
        scene.remove(tankSpotLight.target);
        tankSpotLight.dispose();
      }
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => m.dispose());
        }
      });
      envTarget.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, [
    config.lengthCm,
    config.widthCm,
    config.heightCm,
    config.glassThicknessMm,
    config.shape,
    config.glassFinish,
    config.backingColor,
    config.stand,
    config.lighting,
    config.filtration,
    config.substrate,
    config.plants,
    config.hardscape,
    config.livestock,
    waterFlowOn,
    lightingOn,
  ]);

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/15 bg-[#040B16] shadow-2xl shadow-black/60">
      {/* Isolated WebGL mount container */}
      <div
        ref={mountRef}
        className="w-full h-[380px] sm:h-[460px] lg:h-[520px] select-none"
        aria-label="Interactive 3D Custom Aquarium Preview"
      />

      {/* Compact Top-Left Dimension Readout (no backdrop-blur over WebGL, no pills) */}
      <div className="pointer-events-none absolute top-3.5 left-3.5 rounded-lg bg-[#040B16]/90 border border-white/15 px-3 py-2 text-[11px] text-slate-200 space-y-0.5">
        <p className="font-mono text-cyan-300 font-semibold tabular-nums">
          {config.lengthCm} × {config.widthCm} × {config.heightCm} cm · {config.liters}L
        </p>
        <p className="text-slate-400">
          {config.glassThicknessMm}mm {config.shape} · {config.glassFinish}
        </p>
      </div>

      {/* Top-Right Compact Toggle */}
      <button
        type="button"
        onClick={() => setControlsOpen((prev) => !prev)}
        className="absolute top-3.5 right-3.5 rounded-lg bg-[#040B16]/90 border border-white/15 hover:border-cyan-400/50 px-3 py-1.5 text-[11px] font-semibold text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
      >
        {controlsOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        {controlsOpen ? 'Hide Controls' : 'Show Controls'}
      </button>

      {/* Collapsible Bottom Controls Dock */}
      {controlsOpen && (
        <div className="bg-[#061224]/95 border-t border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'isometric', label: '3D Angle' },
                { id: 'front', label: 'Front' },
                { id: 'top', label: 'Top' },
                { id: 'detail', label: 'Inside Look' },
              ] as const
            ).map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => moveCameraToPreset(view.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                  cameraPreset === view.id
                    ? 'bg-cyan-400 text-[#040B16]'
                    : 'bg-[#040B16] border border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLightingOn((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border ${
                lightingOn
                  ? 'border-amber-300/40 bg-amber-300/15 text-amber-200'
                  : 'border-white/10 bg-[#040B16] text-slate-400'
              }`}
            >
              LED: {lightingOn ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => setWaterFlowOn((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer border ${
                waterFlowOn
                  ? 'border-cyan-400/40 bg-cyan-400/15 text-cyan-200'
                  : 'border-white/10 bg-[#040B16] text-slate-400'
              }`}
            >
              Flow: {waterFlowOn ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => moveCameraToPreset('isometric')}
              className="p-1.5 rounded-lg bg-[#040B16] border border-white/10 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Reset camera view"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
