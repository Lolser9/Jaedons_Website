// scenes/scene_intro_resume.js
export function createIntroResumeScene({ THREE, scene, camera, renderer }) {
  /**
   * PERFORMANCE-OPTIMIZED Intro → Resume
   * - Lazy-loads the PDF iframe ONLY when "Resume" tab is clicked
   * - No backdrop-filter (huge perf win)
   * - Cheap vignette (no massive gradient blur)
   * - Temporarily caps pixel ratio while in intro, restores on dispose
   * - No per-frame object allocations
   */

  // ---------------------------
  // 0) Renderer perf tweak (temporary)
  // ---------------------------
  const prevPixelRatio = renderer.getPixelRatio();
  const prevExposure = renderer.toneMappingExposure;

  // Slightly lower ratio = huge perf gain on laptops/phones
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.2));

  // ---------------------------
  // 1) Group + tracking
  // ---------------------------
  const group = new THREE.Group();
  group.name = "INTRO_RESUME_GROUP";
  scene.add(group);

  const geometries = [];
  const materials = [];
  const trackGeo = (g) => (geometries.push(g), g);
  const trackMat = (m) => (materials.push(m), m);

  // ---------------------------
  // 2) DOM overlays (minimal + cheap)
  // ---------------------------
  function makeOverlayEl(tag, cssText) {
    const el = document.createElement(tag);
    el.dataset.sceneOverlay = "1";
    el.style.cssText = cssText;
    document.body.appendChild(el);
    return el;
  }

  // Black overlay
  const blackout = makeOverlayEl(
    "div",
    "position:fixed;inset:0;background:#000;opacity:1;pointer-events:none;z-index:9999;" +
      "transition:opacity 900ms ease;"
  );

  // Cheaper vignette: use box-shadow inset instead of giant radial gradient
  const vignette = makeOverlayEl(
    "div",
    "position:fixed;inset:0;pointer-events:none;z-index:9998;opacity:0.65;" +
      "box-shadow: inset 0 0 180px rgba(0,0,0,0.85);"
  );

  // Prompt
  const prompt = makeOverlayEl(
    "div",
    "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;" +
      "z-index:10000;pointer-events:none;opacity:0;" +
      "color:rgba(255,255,255,0.78);" +
      "font:500 18px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial;" +
      "letter-spacing:0.02em;transition:opacity 180ms ease;"
  );
  prompt.textContent = "Press any key to wake the screen";

  // Resume overlay (built now, but NO PDF iframe until user clicks Resume tab)
  const resume = makeOverlayEl(
    "div",
    "position:fixed;inset:0;z-index:10001;opacity:0;pointer-events:none;" +
      "background:#06070b;transition:opacity 420ms ease;"
  );

  // Minimal CSS: no backdrop-filter
  const styleTag = document.createElement("style");
  styleTag.dataset.sceneOverlay = "1";
  styleTag.textContent = `
    :root{
      --bg:#06070b;
      --panel:rgba(255,255,255,0.035);
      --border:rgba(255,255,255,0.10);
      --text:rgba(255,255,255,0.92);
      --muted:rgba(255,255,255,0.70);
      --accent:rgba(110,190,255,0.55);
      --shadow:0 14px 40px rgba(0,0,0,0.55);
    }

    .rs-shell{
      height:100%;
      padding:44px 30px;
      box-sizing:border-box;
      display:flex;
      flex-direction:column;
      gap:18px;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;
      color:var(--text);
    }

    .rs-topbar{
      border:1px solid var(--border);
      background:var(--panel);
      border-radius:16px;
      padding:14px;
      box-shadow:var(--shadow);
    }

    .rs-tabs{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      align-items:center;
    }

    .rs-tab{
      appearance:none;
      border:1px solid rgba(255,255,255,0.09);
      background:rgba(0,0,0,0.22);
      color:rgba(255,255,255,0.70);
      padding:8px 12px;
      border-radius:999px;
      cursor:pointer;
      user-select:none;
      font-size:13px;
      line-height:1;
    }

    .rs-tab.active{
      border-color:var(--accent);
      background:rgba(90,170,255,0.12);
      color:rgba(255,255,255,0.92);
    }

    .rs-content{ flex:1; min-height:0; }
    .rs-panel{
      height:100%;
      border:1px solid var(--border);
      background:var(--panel);
      border-radius:18px;
      box-shadow:var(--shadow);
      overflow:hidden;
    }

    .rs-grid{
      height:100%;
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:18px;
      padding:18px;
      box-sizing:border-box;
    }

    .rs-card{
      border:1px solid rgba(255,255,255,0.10);
      background:rgba(255,255,255,0.03);
      border-radius:16px;
      padding:16px;
      position:relative;
      overflow:hidden;
    }

    .rs-card::before{
      content:"";
      position:absolute;
      inset:-40px;
      background:radial-gradient(420px 240px at 30% 20%, rgba(100,180,255,0.12), rgba(0,0,0,0) 62%);
      pointer-events:none;
    }

    .rs-card-title{
      font-weight:650;
      margin-bottom:12px;
      color:rgba(255,255,255,0.90);
    }

    .rs-line{
      height:10px;
      border-radius:8px;
      background:rgba(255,255,255,0.10);
      margin:10px 0;
    }
    .rs-line.short{ width:72%; }

    .rs-pdf-wrap{ height:100%; display:flex; flex-direction:column; }
    .rs-pdf-toolbar{
      display:flex; gap:10px; align-items:center; justify-content:space-between;
      padding:12px; border-bottom:1px solid rgba(255,255,255,0.08);
    }
    .rs-btn{
      appearance:none;
      border:1px solid rgba(255,255,255,0.14);
      background:rgba(0,0,0,0.22);
      color:rgba(255,255,255,0.90);
      padding:8px 12px;
      border-radius:12px;
      cursor:pointer;
      font-size:13px;
      line-height:1;
      text-decoration:none;
      display:inline-flex;
      align-items:center;
      gap:8px;
    }
    .rs-btn:hover{
      border-color:rgba(110,190,255,0.45);
      background:rgba(90,170,255,0.12);
    }
    .rs-pdf-frame{
      flex:1; min-height:0;
      border:0; width:100%;
      background:#0b0e16;
    }

    @media (max-width: 900px){
      .rs-grid{ grid-template-columns:1fr; }
      .rs-shell{ padding:26px 16px; }
    }
  `;
  document.head.appendChild(styleTag);

  // Resume content (NO iframe yet)
  const PDF_URL = "./assets/resume.pdf";

  resume.innerHTML = `
    <div class="rs-shell">
      <div class="rs-topbar">
        <div class="rs-tabs">
          <button class="rs-tab active" data-tab="start">Start page</button>
          <button class="rs-tab" data-tab="skills">Skills</button>
          <button class="rs-tab" data-tab="experience">Experience</button>
          <button class="rs-tab" data-tab="education">Education</button>
          <button class="rs-tab" data-tab="resume">Resume</button>
        </div>
      </div>

      <div class="rs-content">
        <div class="rs-panel" id="panel-start">
          <div class="rs-grid">
            <section class="rs-card">
              <div class="rs-card-title">Volunteer</div>
              <div class="rs-line"></div>
              <div class="rs-line short"></div>
              <div class="rs-line"></div>
              <div class="rs-line short"></div>
            </section>

            <section class="rs-card">
              <div class="rs-card-title">Group</div>
              <div class="rs-line"></div>
              <div class="rs-line"></div>
              <div class="rs-line short"></div>
              <div class="rs-line"></div>
            </section>

            <section class="rs-card">
              <div class="rs-card-title">Awards</div>
              <div class="rs-line"></div>
              <div class="rs-line short"></div>
              <div class="rs-line"></div>
              <div class="rs-line"></div>
            </section>

            <section class="rs-card">
              <div class="rs-card-title">Misc / etc</div>
              <div class="rs-line"></div>
              <div class="rs-line"></div>
              <div class="rs-line short"></div>
              <div class="rs-line"></div>
            </section>
          </div>
        </div>

        <div class="rs-panel" id="panel-simple" style="display:none;">
          <div style="padding:18px;color:rgba(255,255,255,0.78);font-size:14px;">
            <div style="font-weight:650;color:rgba(255,255,255,0.90);margin-bottom:8px;">Coming soon</div>
            <div style="opacity:0.85;">This tab is a placeholder for now.</div>
          </div>
        </div>

        <div class="rs-panel" id="panel-resume" style="display:none;">
          <div class="rs-pdf-wrap" id="pdfWrap">
            <div class="rs-pdf-toolbar">
              <div style="font-size:13px;color:rgba(255,255,255,0.78);">Scroll the PDF • Download any time</div>
              <div style="display:flex;gap:10px;">
                <a class="rs-btn" href="${PDF_URL}" download>Download PDF</a>
                <button class="rs-btn" id="rs-close">Close</button>
              </div>
            </div>
            <div style="padding:16px;color:rgba(255,255,255,0.72);font-size:13px;">
              Loading PDF…
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const tabButtons = Array.from(resume.querySelectorAll(".rs-tab"));
  const panelStart = resume.querySelector("#panel-start");
  const panelSimple = resume.querySelector("#panel-simple");
  const panelResume = resume.querySelector("#panel-resume");
  const closeBtn = resume.querySelector("#rs-close");
  const pdfWrap = resume.querySelector("#pdfWrap");

  // Lazy-load flag for iframe
  let pdfLoaded = false;

  function ensurePdfIframe() {
    if (pdfLoaded) return;
    pdfLoaded = true;

    // Clear "Loading PDF…" placeholder and insert iframe
    pdfWrap.innerHTML = `
      <div class="rs-pdf-toolbar">
        <div style="font-size:13px;color:rgba(255,255,255,0.78);">Scroll the PDF • Download any time</div>
        <div style="display:flex;gap:10px;">
          <a class="rs-btn" href="${PDF_URL}" download>Download PDF</a>
          <button class="rs-btn" id="rs-close-2">Close</button>
        </div>
      </div>
      <iframe class="rs-pdf-frame" src="${PDF_URL}#view=FitH" title="Resume PDF"></iframe>
    `;

    // Re-wire close button because we replaced innerHTML
    pdfWrap.querySelector("#rs-close-2").addEventListener("click", () => {
      resume.style.opacity = "0";
      resume.style.pointerEvents = "none";
    });
  }

  function showTab(tabKey) {
    tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tabKey));

    if (tabKey === "start") {
      panelStart.style.display = "block";
      panelSimple.style.display = "none";
      panelResume.style.display = "none";
      return;
    }

    if (tabKey === "resume") {
      panelStart.style.display = "none";
      panelSimple.style.display = "none";
      panelResume.style.display = "block";
      ensurePdfIframe(); // <- lazy load
      return;
    }

    panelStart.style.display = "none";
    panelResume.style.display = "none";
    panelSimple.style.display = "block";
  }

  tabButtons.forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  closeBtn.addEventListener("click", () => {
    resume.style.opacity = "0";
    resume.style.pointerEvents = "none";
  });

  function setPromptVisible(v) {
    prompt.style.opacity = v ? "1" : "0";
  }
  function setResumeVisible(v) {
    resume.style.opacity = v ? "1" : "0";
    resume.style.pointerEvents = v ? "auto" : "none";
  }

  // ---------------------------
  // 3) 3D room (dark + OFF screen)
  // ---------------------------
  const room = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8, 4, 8)),
    trackMat(new THREE.MeshStandardMaterial({
      color: 0x070a12,
      roughness: 0.98,
      metalness: 0.0,
      side: THREE.BackSide,
    }))
  );
  room.position.set(0, 1.6, 0);
  group.add(room);

  const desk = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.6, 0.12, 1.2)),
    trackMat(new THREE.MeshStandardMaterial({
      color: 0x080c16,
      roughness: 0.9,
      metalness: 0.05,
    }))
  );
  desk.position.set(0.1, 0.72, -0.1);
  group.add(desk);

  const bezel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.75, 1.05, 0.09)),
    trackMat(new THREE.MeshStandardMaterial({
      color: 0x05060a,
      roughness: 0.65,
      metalness: 0.22,
    }))
  );
  bezel.position.set(0.12, 1.18, -0.75);
  group.add(bezel);

  const screenMat = trackMat(new THREE.MeshStandardMaterial({
    color: 0x05060a,
    roughness: 0.35,
    metalness: 0.0,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0.0, // OFF
  }));

  const screen = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.52, 0.86)), screenMat);
  screen.position.set(0.12, 1.18, -0.70);
  group.add(screen);

  const led = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.012, 10, 10)),
    trackMat(new THREE.MeshBasicMaterial({ color: 0x57a8ff }))
  );
  led.position.set(0.86, 0.78, -0.70);
  group.add(led);

  // minimal lighting (moon fill)
  const ambient = new THREE.AmbientLight(0xffffff, 0.03);
  group.add(ambient);

  const moonFill = new THREE.DirectionalLight(0x9db7ff, 0.08);
  moonFill.position.set(-2.5, 3.2, 2.0);
  group.add(moonFill);

  // ---------------------------
  // 4) Camera framing
  // ---------------------------
  camera.fov = 55;
  camera.updateProjectionMatrix();

  const startPos = new THREE.Vector3(-0.15, 1.25, 0.35);
  const endPos   = new THREE.Vector3(0.12, 1.18, -0.15);
  const lookTarget = new THREE.Vector3(0.12, 1.18, -0.72);

  camera.position.copy(startPos);
  camera.lookAt(lookTarget);

  // temp vector for lerp (no allocations)
  const tmpPos = new THREE.Vector3();

  // ---------------------------
  // 5) States + input
  // ---------------------------
  const State = { ASLEEP: "ASLEEP", READY: "READY", BOOTING: "BOOTING", RESUME: "RESUME" };
  let state = State.ASLEEP;

  let fadeT = 0;
  let zoomT = 0;
  let activationRequested = false;

  function requestActivate() {
    if (state === State.READY) activationRequested = true;
  }

  function onKeyDown() { requestActivate(); }
  function onPointerDown() { requestActivate(); }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("pointerdown", onPointerDown);

  // optional click sound (super tiny)
  let audioCtx = null;
  function playClick() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const t0 = audioCtx.currentTime;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(170, t0);

      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.05, t0 + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);

      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.08);
    } catch {}
  }

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const smooth = (t) => t * t * (3 - 2 * t);

  // ---------------------------
  // 6) Update
  // ---------------------------
  let time = 0;

  function update(dt) {
    time += dt;

    // micro movement
    const breathe = Math.sin(time * 0.9) * 0.0025;
    const sway = Math.sin(time * 0.35) * 0.003;

    // led pulse
    const p = 0.55 + (Math.sin(time * 2.1) * 0.5 + 0.5) * 0.45;
    led.scale.setScalar(0.75 + p * 0.25);

    if (state === State.ASLEEP) {
      fadeT = clamp01(fadeT + dt / 1.4); // slightly faster fade for snappiness
      blackout.style.opacity = String(1 - smooth(fadeT));

      camera.position.set(startPos.x + sway, startPos.y + breathe, startPos.z);
      camera.lookAt(lookTarget);

      if (fadeT >= 1) {
        state = State.READY;
        setPromptVisible(true);
      }
    }

    if (state === State.READY) {
      camera.position.set(startPos.x + sway, startPos.y + breathe, startPos.z);
      camera.lookAt(lookTarget);

      if (activationRequested) {
        activationRequested = false;
        state = State.BOOTING;
        setPromptVisible(false);
        playClick();
        zoomT = 0;
      }
    }

    if (state === State.BOOTING) {
      zoomT = clamp01(zoomT + dt / 2.2); // faster push-in for snappy feel
      const t = smooth(zoomT);

      tmpPos.lerpVectors(startPos, endPos, t);
      camera.position.copy(tmpPos);

      camera.fov = 55 - t * 23;
      camera.updateProjectionMatrix();
      camera.lookAt(lookTarget);

      // vignette deepen slightly
      vignette.style.opacity = String(0.65 + t * 0.20);

      if (zoomT >= 1) {
        state = State.RESUME;
        setResumeVisible(true);
        showTab("start");
      }
    }

    if (state === State.RESUME) {
      camera.lookAt(lookTarget);
    }
  }

  // ---------------------------
  // 7) Dispose
  // ---------------------------
  function dispose() {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("pointerdown", onPointerDown);

    blackout.remove();
    vignette.remove();
    prompt.remove();
    resume.remove();
    styleTag.remove();

    scene.remove(group);
    group.clear();

    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();

    // restore renderer settings
    renderer.setPixelRatio(prevPixelRatio);
    renderer.toneMappingExposure = prevExposure;
  }

  return { name: "Intro → Resume (Fast)", update, dispose };
}
