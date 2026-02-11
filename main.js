// main.js
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

import { createRoomScene } from "./scenes/scene_room.js";
import { createChessScene } from "./scenes/scene_chess.js";
import { createWalkRoomScene } from "./scenes/scene_walkroom.js";
import { createIntroResumeScene } from "./scenes/scene_intro_resume.js";

/**
 * main.js (Quarto-safe)
 * - ONLY initializes Three.js if this page contains #three-root
 *   (prevents crashes on other Quarto pages like resume.qmd)
 * - cycles scenes via #toggleBtn
 * - "Lights: On/Off" toggle via #lightBtn (global flag scenes can read)
 *
 * Required elements on the page that runs Three:
 *   <div id="three-root"></div>
 *   <button id="toggleBtn"></button>
 *   <button id="lightBtn"></button>
 *   <div id="sceneLabel"></div>
 */

function start() {
  // -------------------- Gate: only run on pages with #three-root --------------------
  const rootEl = document.getElementById("three-root");
  if (!rootEl) {
    console.warn("[main] No #three-root on this page. Skipping Three.js init.");
    return;
  }

  // These UI elements are only on your index.qmd (Home page)
  const toggleBtn = document.getElementById("toggleBtn");
  const lightBtn = document.getElementById("lightBtn");
  const sceneLabel = document.getElementById("sceneLabel");

  if (!toggleBtn || !lightBtn || !sceneLabel) {
    console.warn("[main] Missing UI elements (#toggleBtn/#lightBtn/#sceneLabel). Skipping Three.js init.");
    return;
  }

  // -------------------- Global flag scenes can read --------------------
  // Scenes should read: const lightsOn = !!window.__ROOM_LIGHTS_ON__;
  window.__ROOM_LIGHTS_ON__ = false;
  lightBtn.textContent = "Lights: Off";

  lightBtn.addEventListener("click", () => {
    window.__ROOM_LIGHTS_ON__ = !window.__ROOM_LIGHTS_ON__;
    lightBtn.textContent = window.__ROOM_LIGHTS_ON__ ? "Lights: On" : "Lights: Off";
  });

  // -------------------- Renderer --------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);

  // baseline (scenes can override)
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // renderer-level shadows (ok global)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // mount canvas
  rootEl.appendChild(renderer.domElement);

  // Ensure canvas fills root and stays behind UI
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.display = "block";

  // -------------------- Global Scene + Camera --------------------
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.05, 200);
  camera.position.set(0, 1.6, 3);
  camera.lookAt(0, 1.6, 0);

  // -------------------- Scene Manager --------------------
  const Scenes = ["INTRO", "ROOM", "CHESS", "WALK"]; // cycle order
  let activeIndex = 0;

  let active = null; // { name, update(dt), dispose() }

  function resetGlobalsForNewScene() {
    // clear any globals a scene may have set
    scene.fog = null;
    scene.background = null;

    // baseline renderer values
    renderer.setClearColor(0x000000, 1);
    renderer.toneMappingExposure = 1.0;

    // baseline camera values
    camera.fov = 60;
    camera.updateProjectionMatrix();
    camera.position.set(0, 1.6, 3);
    camera.lookAt(0, 1.6, 0);
  }

  // Safety net: remove leftover overlay elements if a scene forgot cleanup
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
    console.log("[Scene] switching to:", keyName);

    // 1) dispose old scene (guarded so a dispose bug won't brick switching)
    if (active) {
      try {
        console.log("[Scene] disposing:", active.name);
        active.dispose();
      } catch (err) {
        console.error("[Scene] dispose failed (continuing):", err);
      }
      active = null;
    }

    // 2) reset globals + overlays
    resetGlobalsForNewScene();
    removeLeftoverOverlays();

    // 3) create new scene
    try {
      active = createSceneByKey(keyName);
    } catch (err) {
      console.error("[Scene] creation failed:", err);
      active = { name: "ERROR (see console)", update: () => { }, dispose: () => { } };
    }

    // 4) update UI label
    sceneLabel.textContent = `Scene: ${active.name}`;
  }

  // Start on INTRO (you can change this to "ROOM" if you want)
  setActiveScene(Scenes[activeIndex]);

  // Button cycles through scenes
  toggleBtn.addEventListener("click", () => {
    console.log("[UI] Switch clicked. Current:", Scenes[activeIndex]);

    activeIndex = (activeIndex + 1) % Scenes.length;
    const next = Scenes[activeIndex];

    try {
      setActiveScene(next);
      console.log("[UI] Switched to:", next);
    } catch (err) {
      console.error("[UI] switch failed:", err);
    }
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

// DOM-ready (Quarto sometimes rearranges layout, so wait)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
