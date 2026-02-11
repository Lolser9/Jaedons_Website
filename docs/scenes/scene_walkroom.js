// scenes/scene_walkroom.js
export function createWalkRoomScene({ THREE, scene, camera, renderer }) {
  /**
   * WALK ROOM SCENE (no PointerLockControls)
   *
   * Controls:
   * - Click + drag mouse = look around
   * - W/A/S/D = move
   * - Space = up
   * - Shift = down
   *
   * Notes:
   * - This scene controls camera.rotation directly (yaw/pitch).
   * - No external module imports, so it should always run.
   */

  // ------------------------------------------------------------
  // 0) Group + tracking for cleanup
  // ------------------------------------------------------------
  const group = new THREE.Group();
  group.name = "WALK_ROOM_GROUP";
  scene.add(group);

  const geometries = [];
  const materials = [];
  const trackGeo = (g) => (geometries.push(g), g);
  const trackMat = (m) => (materials.push(m), m);

  // ------------------------------------------------------------
  // 1) Camera initial setup
  // ------------------------------------------------------------
  camera.position.set(0, 1.6, 0);
  camera.rotation.set(0, 0, 0);
  camera.rotation.order = "YXZ"; // IMPORTANT: yaw first, then pitch (FPS-style)

  // ------------------------------------------------------------
  // 2) Build a simple room: floor + ceiling + 4 walls
  // ------------------------------------------------------------
  const W = 10; // room width  (x)
  const D = 10; // room depth  (z)
  const H = 4;  // room height (y)

  const wallMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0x111522,
    roughness: 0.95,
    metalness: 0.0,
  }));
  const floorMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0x0b0f18,
    roughness: 0.9,
    metalness: 0.05,
  }));
  const ceilMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0x0a0d16,
    roughness: 0.98,
    metalness: 0.0,
  }));

  // Floor
  const floor = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(W, D)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  group.add(floor);

  // Ceiling
  const ceiling = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(W, D)), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = H;
  group.add(ceiling);

  // Back wall (z = -D/2)
  const wallBack = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(W, H)), wallMat);
  wallBack.position.set(0, H / 2, -D / 2);
  group.add(wallBack);

  // Front wall (z = +D/2)
  const wallFront = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(W, H)), wallMat);
  wallFront.position.set(0, H / 2, D / 2);
  wallFront.rotation.y = Math.PI;
  group.add(wallFront);

  // Left wall (x = -W/2)
  const wallLeft = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(D, H)), wallMat);
  wallLeft.position.set(-W / 2, H / 2, 0);
  wallLeft.rotation.y = Math.PI / 2;
  group.add(wallLeft);

  // Right wall (x = +W/2)
  const wallRight = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(D, H)), wallMat);
  wallRight.position.set(W / 2, H / 2, 0);
  wallRight.rotation.y = -Math.PI / 2;
  group.add(wallRight);

  // ------------------------------------------------------------
  // 3) Bright lighting so you can see clearly
  // ------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xffffff, 0x1a1f35, 0.85);
  hemi.position.set(0, H, 0);
  group.add(hemi);

  const lamp = new THREE.PointLight(0xffffff, 2.4, 30, 2.0);
  lamp.position.set(0, H - 0.3, 0);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(1024, 1024);
  group.add(lamp);

  // little marker sphere (optional)
  const lampBall = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.08, 16, 16)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0xffffff }))
  );
  lampBall.position.copy(lamp.position);
  group.add(lampBall);

  // ------------------------------------------------------------
  // 4) Input: keyboard movement
  // ------------------------------------------------------------
  const keys = new Set();

  function onKeyDown(e) { keys.add(e.code); }
  function onKeyUp(e) { keys.delete(e.code); }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // ------------------------------------------------------------
  // 5) Input: mouse look (click + drag)
  // ------------------------------------------------------------
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  // yaw = rotate around Y axis, pitch = rotate around X axis
  let yaw = 0;
  let pitch = 0;

  const LOOK_SENS = 0.0022; // mouse sensitivity
  const PITCH_LIMIT = Math.PI / 2 - 0.05; // prevent flipping over

  function onMouseDown(e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onMouseUp() {
    dragging = false;
  }

  function onMouseMove(e) {
    if (!dragging) return;

    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    yaw   -= dx * LOOK_SENS;
    pitch -= dy * LOOK_SENS;

    // clamp pitch so you can't go upside down
    pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));

    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  }

  // attach mouse handlers to the canvas (best UX)
  renderer.domElement.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  window.addEventListener("mousemove", onMouseMove);

  // ------------------------------------------------------------
  // 6) Movement logic
  // ------------------------------------------------------------
  const MOVE_SPEED = 3.8; // units per second
  const CLAMP_MARGIN = 0.35;

  // temp vectors reused each frame (no garbage)
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();

  function clampToRoom() {
    camera.position.x = Math.max(-W/2 + CLAMP_MARGIN, Math.min(W/2 - CLAMP_MARGIN, camera.position.x));
    camera.position.z = Math.max(-D/2 + CLAMP_MARGIN, Math.min(D/2 - CLAMP_MARGIN, camera.position.z));
    camera.position.y = Math.max(0.2, Math.min(H - 0.2, camera.position.y));
  }

  function update(dt) {
    // Build forward/right vectors from camera yaw ONLY (ignore pitch for movement)
    const yawOnly = camera.rotation.y;

    forward.set(Math.sin(yawOnly), 0, Math.cos(yawOnly)).multiplyScalar(-1); // forward (camera -Z)
    right.set().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize(); // right

    move.set(0, 0, 0);

    if (keys.has("KeyW")) move.add(forward);
    if (keys.has("KeyS")) move.add(forward.clone().multiplyScalar(-1));
    if (keys.has("KeyD")) move.add(right);
    if (keys.has("KeyA")) move.add(right.clone().multiplyScalar(-1));

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(MOVE_SPEED * dt);
      camera.position.add(move);
    }

    if (keys.has("Space")) camera.position.y += MOVE_SPEED * dt;
    if (keys.has("ShiftLeft") || keys.has("ShiftRight")) camera.position.y -= MOVE_SPEED * dt;

    clampToRoom();
  }

  // ------------------------------------------------------------
  // 7) Cleanup when switching scenes
  // ------------------------------------------------------------
  function dispose() {
    scene.remove(group);
    group.clear();

    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);

    renderer.domElement.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("mousemove", onMouseMove);

    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
  }

  return { name: "Walk Room (Drag Mouse + WASD)", update, dispose };
}
