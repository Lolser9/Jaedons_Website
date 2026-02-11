// scenes/scene_chess.js
export function createChessScene({ THREE, scene, camera }) {
  /**
   * BRIGHT chess scene:
   * - Adds extra lights (hemisphere + wide spotlight + fill)
   * - Board is easy to see ("fully illuminated")
   * - Shadows still look good
   */

  const group = new THREE.Group();
  group.name = "CHESS_GROUP";
  scene.add(group);

  // We'll dispose these at the end
  const geometries = [];
  const materials = [];

  const trackGeo = (g) => (geometries.push(g), g);
  const trackMat = (m) => (materials.push(m), m);

  // ------------------------------------------------------------
  // 1) LIGHTING (make it bright + readable)
  // ------------------------------------------------------------

  // Soft global light from sky + ground (huge for readability)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x202030, 0.75);
  hemi.position.set(0, 3, 0);
  group.add(hemi);

  // Main overhead lamp (wide + strong)
  const lamp = new THREE.SpotLight(
    0xffffff,    // color
    9.0,         // intensity  (raise if still dim)
    15,          // distance
    Math.PI / 3, // angle (WIDE) -> illuminates whole board
    0.6,         // penumbra (soft edge)
    2.0          // decay
  );

  lamp.position.set(0, 3.2, 0.8);           // slightly in front so it "reads" better
  lamp.target.position.set(0, 0.85, 0);     // aim at the board center
  group.add(lamp);
  group.add(lamp.target);

  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);      // crisper shadows
  lamp.shadow.bias = -0.00015;
  lamp.shadow.normalBias = 0.02;

  // Optional fill from side (prevents the “one side black” look)
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(-2.5, 2.2, 2.0);
  group.add(fill);

  // ------------------------------------------------------------
  // 2) FLOOR (receives shadows)
  // ------------------------------------------------------------
  const floorGeo = trackGeo(new THREE.PlaneGeometry(12, 12));
  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0a0a0f,
      roughness: 0.95,
      metalness: 0.02,
    })
  );
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  group.add(floor);

  // ------------------------------------------------------------
  // 3) TABLE (casts + receives)
  // ------------------------------------------------------------
  const tableGeo = trackGeo(new THREE.BoxGeometry(2.6, 0.14, 2.6));
  const tableMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0b1020,
      roughness: 0.85,
      metalness: 0.08,
    })
  );
  const table = new THREE.Mesh(tableGeo, tableMat);
  table.position.set(0, 0.72, 0);
  table.castShadow = true;
  table.receiveShadow = true;
  group.add(table);

  // ------------------------------------------------------------
  // 4) CHESSBOARD (8x8 tiles)
  // ------------------------------------------------------------
  const tileSize = 0.25;
  const boardY = 0.80;
  const offset = (8 * tileSize) / 2 - tileSize / 2;

  const tileGeo = trackGeo(new THREE.BoxGeometry(tileSize, 0.03, tileSize));

  // Slightly shinier tiles read better under lighting
  const lightMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf0f0f6,
      roughness: 0.55,
      metalness: 0.02,
    })
  );
  const darkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x23263a,
      roughness: 0.55,
      metalness: 0.02,
    })
  );

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isLight = (r + c) % 2 === 0;
      const tile = new THREE.Mesh(tileGeo, isLight ? lightMat : darkMat);
      tile.position.set(c * tileSize - offset, boardY, r * tileSize - offset);

      tile.receiveShadow = true;
      // You can enable this if you ever add chess pieces (tiles can cast tiny shadows):
      // tile.castShadow = true;

      group.add(tile);
    }
  }

  // Frame around board
  const frameGeo = trackGeo(
    new THREE.BoxGeometry(8 * tileSize + 0.12, 0.06, 8 * tileSize + 0.12)
  );
  const frameMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x05060b,
      roughness: 0.65,
      metalness: 0.15,
    })
  );
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.position.set(0, boardY - 0.005, 0);
  frame.castShadow = true;
  frame.receiveShadow = true;
  group.add(frame);

  // ------------------------------------------------------------
  // 5) CAMERA (closer + more “board focused”)
  // ------------------------------------------------------------
  camera.position.set(0.0, 1.45, 2.15);
  camera.lookAt(0, 0.88, 0);

  // ------------------------------------------------------------
  // 6) UPDATE LOOP (simple, stable)
  // ------------------------------------------------------------
  let time = 0;
  function update(dt) {
    time += dt;

    // tiny drift (keep it subtle so it doesn’t feel like it’s “floating away”)
    camera.position.x = Math.sin(time * 0.25) * 0.18;
    camera.lookAt(0, 0.88, 0);
  }

  // ------------------------------------------------------------
  // 7) DISPOSE
  // ------------------------------------------------------------
  function dispose() {
    scene.remove(group);
    group.clear();

    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
  }

  return { name: "Chessboard", update, dispose };
}
