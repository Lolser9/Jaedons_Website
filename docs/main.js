// main.js
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

import { createRoomScene } from "./scenes/scene_room.js";
import { createChessScene } from "./scenes/scene_chess.js";
import { createWalkRoomScene } from "./scenes/scene_walkroom.js";
import { createIntroResumeScene } from "./scenes/scene_intro_resume.js";

/**
 * main.js (Quarto-safe, no UI buttons)
 * - Only runs on pages that contain: <div id="three-root"></div>
 * - Starts one scene (INTRO) by default
 * - Optional: allow scene switching via keyboard (1/2/3/4), but no on-page buttons
 *
 * Page requirement:
 *   <div id="three-root"></div>
 */

function start() {
  // -------------------- Gate: only run on pages with #three-root --------------------
  const rootEl = document.getElementById("three-root");
  if (!rootEl) {
    console.warn("[main] No #three-root on this page. Skipping Three.js init.");
    return;
  }

  // -------------------- Renderer --------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);

  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Mount canvas
  rootEl.appendChild(renderer.domElement);

  // Ensure canvas fills root
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.display = "block";

  // -------------------- Global Scene + Camera --------------------
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3);
  camera.lookAt(0, 1.6, 0);

  // -------------------- Scene Manager --------------------
  const Scenes = ["INTRO", "ROOM", "CHESS", "WALK"];
  let activeKey = "INTRO";
  let active = null; // { name, update(dt), dispose() }

  function resetGlobalsForNewScene() {
    scene.fog = null;
    scene.background = null;

    renderer.setClearColor(0x000000, 1);
    renderer.toneMappingExposure = 1.0;

    camera.fov = 60;
    camera.updateProjectionMatrix();
    camera.position.set(0, 1.6, 3);
    camera.lookAt(0, 1.6, 0);
  }

  function removeLeftoverOverlays() {
    document.querySelectorAll("[data-scene-overlay='1']").forEach((el) => el.remove());
  }

  function createSceneByKey(keyName) {
    const args = { THREE, scene, camera, renderer };

    if (keyName === "INTRO") return createIntroResumeScene(args);
    if (keyName === "ROOM") return createRoomScene(args);
    if (keyName === "CHESS") return createChessScene(args);
    if (keyName === "WALK") return createWalkRoomScene(args);

    throw new Error(`Unknown scene key: ${keyName}`);
  }

  function setActiveScene(keyName) {
    // Dispose old
    if (active) {
      try {
        active.dispose();
      } catch (err) {
        console.error("[Scene] dispose failed (continuing):", err);
      }
      active = null;
    }

    resetGlobalsForNewScene();
    removeLeftoverOverlays();

    try {
      active = createSceneByKey(keyName);
      activeKey = keyName;
      console.log("[Scene] active:", keyName, "-", active.name);
    } catch (err) {
      console.error("[Scene] creation failed:", err);
      active = { name: "ERROR (see console)", update: () => { }, dispose: () => { } };
      activeKey = keyName;
    }
  }

  // Start on INTRO
  setActiveScene(activeKey);

  // -------------------- Optional: keyboard switching (no buttons) --------------------
  // 1 = INTRO, 2 = ROOM, 3 = CHESS, 4 = WALK
  addEventListener("keydown", (e) => {
    if (e.repeat) return;

    if (e.key === "1") setActiveScene("INTRO");
    if (e.key === "2") setActiveScene("ROOM");
    if (e.key === "3") setActiveScene("CHESS");
    if (e.key === "4") setActiveScene("WALK");
  });

  // -------------------- Animation loop --------------------
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();
    if (active) active.update(dt);

    renderer.render(scene, camera);
  }
  animate();

  // -------------------- Resize handling --------------------
  addEventListener("resize", () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  });
}

// DOM-ready (Quarto-safe)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
