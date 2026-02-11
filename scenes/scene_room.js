export function createRoomScene({ THREE, scene, camera }) {
  /**
   * Each scene returns:
   *  - name: for UI
   *  - update(dt): runs every frame
   *  - dispose(): removes its objects + disposes resources
   */

  const group = new THREE.Group();
  group.name = "ROOM_GROUP";
  scene.add(group);

  // ----- Floor -----
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 12),
    new THREE.MeshStandardMaterial({ color: 0x0b1020, roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  group.add(floor);

  // ----- Helper to create a screen (bezel + emissive screen + cheap glow) -----
  function makeScreen({ w, h, pos, emissiveIntensity }) {
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x07070c, roughness: 0.6, metalness: 0.25 })
    );
    bezel.position.copy(pos);

    const screenMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.0,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity,
    });

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.88, h * 0.82), screenMat);
    screen.position.copy(pos);
    screen.position.z += 0.045;

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.06, h * 1.04),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    glow.position.copy(pos);
    glow.position.z += 0.03;

    return { bezel, screen, glow, screenMat };
  }

  // ----- TV (left) -----
  const tv = makeScreen({
    w: 1.6,
    h: 0.95,
    pos: new THREE.Vector3(-1.05, 1.05, -0.6),
    emissiveIntensity: 2.2,
  });
  group.add(tv.bezel, tv.screen, tv.glow);

  const tvStand = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.10, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x090a10, roughness: 0.9, metalness: 0.05 })
  );
  tvStand.position.set(-1.05, 0.55, -0.55);
  group.add(tvStand);

  // ----- Desk + monitor (right) -----
  const desk = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.12, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x0a0f1a, roughness: 0.85, metalness: 0.08 })
  );
  desk.position.set(1.15, 0.75, 0.1);
  group.add(desk);

  const monitor = makeScreen({
    w: 1.2,
    h: 0.75,
    pos: new THREE.Vector3(1.15, 1.18, -0.2),
    emissiveIntensity: 2.6,
  });
  group.add(monitor.bezel, monitor.screen, monitor.glow);

  const monitorStand = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.35, 0.20),
    new THREE.MeshStandardMaterial({ color: 0x06060b, roughness: 0.7, metalness: 0.2 })
  );
  monitorStand.position.set(1.15, 0.92, -0.2);
  group.add(monitorStand);

  const monitorBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.05, 0.35),
    new THREE.MeshStandardMaterial({ color: 0x05050a, roughness: 0.8, metalness: 0.2 })
  );
  monitorBase.position.set(1.15, 0.77, -0.1);
  group.add(monitorBase);

  // ----- Scene-specific camera framing -----
  // (We set it here so each scene can choose its own view)
  camera.position.set(0, 1.25, 3.0);
  camera.lookAt(0, 1.0, 0);

  // ----- A subtle flicker function -----
  function subtleFlicker(mat, base) {
    mat.emissiveIntensity = base + (Math.random() - 0.5) * 0.25;
  }

  // ----- Update loop (runs every frame) -----
  let time = 0;
  function update(dt) {
    time += dt;

    // tiny camera drift to keep it alive (optional)
    camera.position.x = Math.sin(time * 0.25) * 0.03;
    camera.lookAt(0, 1.0, -0.2);

    // tiny screen flicker (optional)
    if ((time * 60) % 2 < 1) {
      subtleFlicker(tv.screenMat, 2.2);
      subtleFlicker(monitor.screenMat, 2.6);
    }
  }

  // ----- Disposal (important when switching scenes) -----
  function dispose() {
    // Remove the whole group from the scene
    scene.remove(group);

    // Dispose geometry/material for every mesh in the group
    group.traverse((obj) => {
      if (!obj.isMesh) return;

      obj.geometry?.dispose();

      // material can be an array or single
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
  }

  return { name: "Room", update, dispose };
}
