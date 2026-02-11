// scenes/scene_intro_resume.js
export function createIntroResumeScene({ THREE, scene, camera, renderer }) {
  /**
   * Intro → Resume (fast + Quarto/GH Pages safe)
   * - Adds About (newspaper-style text + images, no cards)
   * - Adds Projects tab (links) right before Resume
   * - Defaults to About
   * - Smooth PDF scroll via PDF.js rendered canvases
   * - Robust PDF path via import.meta.url
   * - Fixes LED blink cadence + slows camera zoom
   */

  // ---------------------------
  // 0) Renderer perf tweak (temporary)
  // ---------------------------
  const prevPixelRatio = renderer.getPixelRatio();
  const prevExposure = renderer.toneMappingExposure;
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
  // 2) DOM overlays
  // ---------------------------
  function makeOverlayEl(tag, cssText) {
    const el = document.createElement(tag);
    el.dataset.sceneOverlay = "1";
    el.style.cssText = cssText;
    document.body.appendChild(el);
    return el;
  }

  const blackout = makeOverlayEl(
    "div",
    "position:fixed;inset:0;background:#000;opacity:1;pointer-events:none;z-index:9999;" +
    "transition:opacity 900ms ease;"
  );

  const vignette = makeOverlayEl(
    "div",
    "position:fixed;inset:0;pointer-events:none;z-index:9998;opacity:0.65;" +
    "box-shadow: inset 0 0 180px rgba(0,0,0,0.85);"
  );

  const prompt = makeOverlayEl(
    "div",
    "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;" +
    "z-index:10000;pointer-events:none;opacity:0;" +
    "color:rgba(255,255,255,0.78);" +
    "font:500 18px/1.2 system-ui,-apple-system,Segoe UI,Roboto,Arial;" +
    "letter-spacing:0.02em;transition:opacity 180ms ease;"
  );
  prompt.textContent = "Press any key to wake the screen";

  const resume = makeOverlayEl(
    "div",
    "position:fixed;inset:0;z-index:10001;opacity:0;pointer-events:none;" +
    "background:#06070b;transition:opacity 420ms ease;"
  );

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

    .rs-body{
      height:100%;
      padding:18px;
      box-sizing:border-box;
      overflow:auto;
      -webkit-overflow-scrolling: touch;
      scroll-behavior:smooth;
    }

    .rs-h1{
      font-size:16px;
      font-weight:750;
      margin:0 0 12px 0;
      color:rgba(255,255,255,0.92);
    }

    .rs-muted{
      color:rgba(255,255,255,0.72);
      font-size:13px;
      margin:0 0 14px 0;
    }

    .rs-grid{
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:14px;
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
      font-weight:750;
      margin:0 0 10px 0;
      color:rgba(255,255,255,0.90);
      font-size:14px;
    }

    .rs-list{
      margin:0;
      padding-left:18px;
      color:rgba(255,255,255,0.78);
      font-size:13px;
      line-height:1.55;
    }
    .rs-list li{ margin:7px 0; }

    /* ABOUT (no boxes/cards) */
    .rs-article{
      max-width: 980px;
      margin: 0 auto;
      padding: 2px 0 10px 0;
      color: rgba(255,255,255,0.86);
      font-size: 14px;
      line-height: 1.75;
    }
    .rs-article h2{
      font-size: 15px;
      margin: 18px 0 8px 0;
      font-weight: 800;
      color: rgba(255,255,255,0.93);
      letter-spacing: 0.01em;
    }
    .rs-article p{
      margin: 0 0 12px 0;
      color: rgba(255,255,255,0.80);
    }
    .rs-rule{
      height:1px;
      background: rgba(255,255,255,0.10);
      margin: 14px 0;
    }
    .rs-figure{
      margin: 12px 0 16px 0;
    }
    .rs-figure img{
      width:100%;
      height:auto;
      display:block;
      border-radius:14px;
      border:1px solid rgba(255,255,255,0.10);
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }
    .rs-figure .cap{
      margin-top:8px;
      font-size:12px;
      color:rgba(255,255,255,0.62);
    }
    .rs-split{
      display:grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 18px;
      align-items:start;
    }
    .rs-split.reverse{
      grid-template-columns: 0.9fr 1.1fr;
    }
    @media (max-width: 900px){
      .rs-shell{ padding:26px 16px; }
      .rs-grid{ grid-template-columns:1fr; }
      .rs-split, .rs-split.reverse{ grid-template-columns:1fr; }
    }

    /* Projects (simple list, no cards required) */
    .rs-links{
      max-width: 980px;
      margin: 0 auto;
      padding: 6px 0;
    }
    .rs-link{
      display:block;
      padding: 12px 14px;
      margin: 10px 0;
      border:1px solid rgba(255,255,255,0.10);
      background: rgba(0,0,0,0.22);
      border-radius: 14px;
      text-decoration:none;
      color: rgba(255,255,255,0.90);
    }
    .rs-link:hover{
      border-color: rgba(110,190,255,0.45);
      background: rgba(90,170,255,0.12);
    }
    .rs-link .t{
      font-weight: 800;
      margin-bottom: 4px;
      display:block;
    }
    .rs-link .d{
      font-size: 13px;
      color: rgba(255,255,255,0.70);
      display:block;
      line-height: 1.55;
    }

    /* PDF viewer */
    .rs-pdf-wrap{ height:100%; display:flex; flex-direction:column; min-height:0; }
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

    .rs-pdf-scroll{
      flex:1;
      min-height:0;
      overflow:auto;
      padding:18px;
      box-sizing:border-box;
      -webkit-overflow-scrolling: touch;
      scroll-behavior:smooth;
    }

    .rs-pdf-page{
      border:1px solid rgba(255,255,255,0.10);
      border-radius:14px;
      background:rgba(0,0,0,0.25);
      padding:12px;
      margin:0 auto 16px auto;
      max-width: 980px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    }

    canvas{
      width:100%;
      height:auto;
      display:block;
      border-radius:10px;
    }
  `;
  document.head.appendChild(styleTag);

  // ---------------------------
  // 2.1) Content from your resume (populate tabs)
  // ---------------------------
  const CONTENT = {
    skills: {
      title: "Skills",
      cards: [
        {
          title: "Strengths",
          bullets: [
            "Strong analytical and critical thinking skills",
            "Proactive and self-driven; rapidly masters new languages",
          ],
        },
        {
          title: "Engineering / Trading",
          bullets: [
            "Designs and implements purpose-built stock trading bots (24/7)",
            "Analyzes market trends using trading platforms and software",
            "Manages and elevates portfolios to outperform benchmarks",
          ],
        },
        { title: "Tools", bullets: ["Google Workspace", "MS 365 Suite"] },
        { title: "Creative", bullets: ["FL Studio", "Adobe Photoshop", "Adobe Premiere Pro"] },
      ],
    },

    experience: {
      title: "Experience",
      cards: [
        {
          title: "Rust • Arbitrage & Trading",
          bullets: [
            "Built a Rust program comparing prices across Market.csgo and Steam Community Market to resell CS:GO skins for profit.",
            "Created an open-source Rust library to make TD Ameritrade's API more accessible (repo: tdameritrade_rust).",
          ],
        },
        {
          title: "Markets • Portfolio / Monitoring",
          bullets: [
            "Analyzed and monitored local and international markets for trading opportunities.",
            "Managed and reviewed portfolio performance to optimize returns.",
          ],
        },
        {
          title: "Automation • Python",
          bullets: [
            "Automated AI Reddit story creation to upload to YouTube.",
            "Built multiple web crawlers using Python.",
          ],
        },
        {
          title: "Leadership / Community",
          bullets: [
            "Led recruitment and mentored students in the Lovejoy Chess Club.",
            "Volunteered with multiple community service organizations.",
          ],
        },
      ],
    },

    education: {
      title: "Education",
      cards: [
        {
          title: "Baylor University (Aug 2023 - Present)",
          bullets: [
            "Data Science major: School of Engineering & Computer Science",
            "Economics minor",
            "Expected graduation: May 2027",
          ],
        },
        {
          title: "Lovejoy High School (Aug 2019 - May 2023)",
          bullets: [
            "AP Scholar Graduate (12 AP + 13 Honors classes)",
            "National Honors Society • Gifted & Talented Program",
          ],
        },
      ],
    },

    volunteer: {
      title: "Volunteer Work",
      cards: [
        {
          title: "Wreaths Across America (2022-2023)",
          bullets: ["Placed wreaths at DFW National Cemetery to honor military veterans."],
        },
        {
          title: "All Community Outreach (2022)",
          bullets: ["Assisted with receiving, sorting, and processing donations."],
        },
        {
          title: "National Honors Society (2019-2023)",
          bullets: ["96 hours of community service during high school."],
        },
        {
          title: "Other",
          bullets: [
            "UIL Band Competitions (2021-2023): hall monitor / event support",
            "Lovejoy High School (2023): assisted preparing meals for the homeless",
            "First United Methodist Church (2018): letters + holiday support for deployed military",
          ],
        },
      ],
    },

    groups: {
      title: "Members & Groups",
      cards: [
        {
          title: "Organizations",
          bullets: [
            "Vice President - Lovejoy High School Chess Club",
            "Member - Chess Society at Baylor",
            "Member - Baylor Climbing Team",
            "Member - Lovejoy HS Investment Club",
            "Member - Lovejoy HS Cybersecurity Club",
          ],
        },
        {
          title: "Activities",
          bullets: [
            "Euphonium player - Lovejoy Wind Ensemble",
            "Baseball player - Allen, Plano, and McKinney sports associations",
          ],
        },
      ],
    },

    awards: {
      title: "Recognitions & Awards",
      cards: [
        {
          title: "Academics / Competitions",
          bullets: ["AP Scholar - Lovejoy High School", "Winner - Texas Chess Center Competition (Feb 6, 2022)"],
        },
        {
          title: "Chess",
          bullets: [
            "2× Winner - Lovejoy High School Chess Tournament",
            "Advanced level chess: 99th percentile (Lichess)",
            "91st percentile in Texas (US Chess Federation)",
          ],
        },
      ],
    },
  };

  // ---------------------------
  // 2.2) Assets (About images + Resume PDF)
  // ---------------------------
  const PDF_URL = new URL("../assets/resume.pdf", import.meta.url).href;

  // Put these in /assets/ exactly (rename as needed)
  const IMG_HEADSHOT = new URL("../assets/jaedon.jpg", import.meta.url).href;
  const IMG_CHESS = new URL("../assets/chess.png", import.meta.url).href;
  const IMG_DARTS = new URL("../assets/darts.jpg", import.meta.url).href;
  const IMG_BOWLING = new URL("../assets/bowling.jpg", import.meta.url).href;

  // ---------------------------
  // 2.3) Build UI (About first, Projects before Resume)
  // ---------------------------
  resume.innerHTML = `
    <div class="rs-shell">
      <div class="rs-topbar">
        <div class="rs-tabs">
          <button class="rs-tab active" data-tab="about">About</button>
          <button class="rs-tab" data-tab="skills">Skills</button>
          <button class="rs-tab" data-tab="experience">Experience</button>
          <button class="rs-tab" data-tab="education">Education</button>
          <button class="rs-tab" data-tab="volunteer">Volunteer</button>
          <button class="rs-tab" data-tab="groups">Groups</button>
          <button class="rs-tab" data-tab="awards">Awards</button>
          <button class="rs-tab" data-tab="projects">Projects</button>
          <button class="rs-tab" data-tab="resume">Resume</button>
        </div>
      </div>

      <div class="rs-content">
        <div class="rs-panel" id="panel-content">
          <div class="rs-body" id="panelBody"></div>
        </div>

        <div class="rs-panel" id="panel-resume" style="display:none;">
          <div class="rs-pdf-wrap">
            <div class="rs-pdf-toolbar">
              <div style="font-size:13px;color:rgba(255,255,255,0.78);">
                My Resume
              </div>
              <div style="display:flex;gap:10px;">
                <a class="rs-btn" href="${PDF_URL}" download>Download PDF</a>
                <button class="rs-btn" id="rs-close">Close</button>
              </div>
            </div>

            <div class="rs-pdf-scroll" id="pdfScroll">
              <div style="padding:12px;color:rgba(255,255,255,0.72);font-size:13px;">
                Loading PDF…
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const tabButtons = Array.from(resume.querySelectorAll(".rs-tab"));
  const panelContent = resume.querySelector("#panel-content");
  const panelBody = resume.querySelector("#panelBody");
  const panelResume = resume.querySelector("#panel-resume");
  const pdfScroll = resume.querySelector("#pdfScroll");
  const closeBtn = resume.querySelector("#rs-close");

  // ---------------------------
  // 2.4) Render helpers
  // ---------------------------
  function escapeHtml(s) {
    return String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  function renderCards({ title, subtitle, cards }) {
    const cardsHtml = cards
      .map((c) => {
        const items = c.bullets.map((x) => `<li>${escapeHtml(x)}</li>`).join("");
        return `
          <section class="rs-card">
            <div class="rs-card-title">${escapeHtml(c.title)}</div>
            <ul class="rs-list">${items}</ul>
          </section>
        `;
      })
      .join("");

    panelBody.innerHTML = `
      <div class="rs-h1">${escapeHtml(title)}</div>
      ${subtitle ? `<div class="rs-muted">${escapeHtml(subtitle)}</div>` : ""}
      <div class="rs-grid">${cardsHtml}</div>
    `;
  }

  function renderProjects() {
    panelBody.innerHTML = `
      <div class="rs-h1">Projects</div>
      <div class="rs-muted">A couple builds I’m proud of (more coming soon).</div>

      <div class="rs-links">
        <a class="rs-link" href="https://github.com/Lolser9/CeasarCipherProject" target="_blank" rel="noreferrer">
          <span class="t">CeasarCipherProject</span>
          <span class="d">Classic cipher implementation + tooling around encoding/decoding. Simple on purpose — clean and readable.</span>
        </a>

        <a class="rs-link" href="https://github.com/Lolser9/tdameritrade_rust" target="_blank" rel="noreferrer">
          <span class="t">tdameritrade_rust</span>
          <span class="d">Rust library to make TD Ameritrade’s API easier to use — focused on a developer-friendly interface.</span>
        </a>
      </div>
    `;
  }

  function renderAbout() {
    // Newspaper-ish: text + images, no cards
    panelBody.innerHTML = `
      <div class="rs-h1">About Me</div>

      <div class="rs-article">
        <div class="rs-split">
          <div>
            <h2>Who I am</h2>
            <p>
              I'm a data science student. I like taking vague ideas
              and turning them into working systems: pipelines, models, bots, and tooling 
              that try not to fall apart the second reality touches it.
            </p>
            <p>
              My favorite projects are in the realm of decision-making —
              anything involving markets, forecasting, optimization, etc.
            </p>
            <div class="rs-rule"></div>
            <h2>Coding Preferences</h2>
            <p>
              I’m big on clean interfaces and painfully readable code. If something is hard to explain,
              I don't like it. Very simple code is my preferred style.
            </p>
          </div>

          <div class="rs-figure">
            <img src="${IMG_HEADSHOT}" alt="Portrait"/>
            <div class="cap">Me - the “I'll refactor it later / I'll 'VibeCode'tm it” face.</div>
          </div>
        </div>

        <div class="rs-rule"></div>

        <h2>Chess</h2>
        <p>
          Chess is where I learned to hone my decision making. I love the mix of
          tactics, strategy, and long-term planning, and I'm drawn to the idea that tiny decisions compound into
          completely different outcomes.
        </p>
        <div class="rs-figure">
          <img src="${IMG_CHESS}" alt="Chess stats screenshot"/>
          <div class="cap">I managed to beat a titled player!</div>
        </div>

        <h2>Bowling</h2>
        <p>
          Bowling is fun. That is all. Go bowling. Now!
        </p>
        <div class="rs-figure">
          <img src="${IMG_BOWLING}" alt="Bowling balls"/>
          <div class="cap">My bowling balls!</div>
        </div>

        <h2>Darts</h2>
        <p>
          Darts is another of my favorite games. Just like bowling, 
          I love the fact that it rewards perfection and consistency.
        </p>
        <div class="rs-figure">
          <img src="${IMG_DARTS}" alt="Darts photo"/>
          <div class="cap">Bullhitter</div>
        </div>

        <div class="rs-rule"></div>

        <h2>Right now</h2>
        <p>
          I'm vibecoding this, check back later xd
        </p>
      </div>
    `;
  }

  // ---------------------------
  // 2.5) PDF.js smooth viewer (lazy)
  // ---------------------------
  let pdfLoaded = false;

  async function ensurePdfRendered() {
    if (pdfLoaded) return;
    pdfLoaded = true;

    pdfScroll.innerHTML = `
      <div style="padding:12px;color:rgba(255,255,255,0.72);font-size:13px;">
        Loading PDF…
      </div>
    `;

    try {
      const pdfjs = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
      pdfjs.GlobalWorkerOptions.workerSrc =
        "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

      const loadingTask = pdfjs.getDocument({
        url: PDF_URL,
        useSystemFonts: true,
        isEvalSupported: false,
      });

      const pdf = await loadingTask.promise;
      pdfScroll.innerHTML = "";

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);

        const wrap = document.createElement("div");
        wrap.className = "rs-pdf-page";

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { alpha: false });

        const baseViewport = page.getViewport({ scale: 1.0 });
        const maxWidth = Math.min(980, pdfScroll.clientWidth - 40);
        const fitScale = Math.max(1.25, Math.min(2.0, maxWidth / baseViewport.width));

        const viewport = page.getViewport({ scale: fitScale });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        wrap.appendChild(canvas);
        pdfScroll.appendChild(wrap);

        await new Promise((r) => requestAnimationFrame(r));

        await page.render({
          canvasContext: ctx,
          viewport,
          intent: "display",
        }).promise;

        page.cleanup();
      }
    } catch (err) {
      console.error("[pdf] render failed:", err);
      pdfScroll.innerHTML = `
        <div style="padding:12px;color:rgba(255,255,255,0.72);font-size:13px;">
          Failed to load PDF. Make sure <code>/assets/resume.pdf</code> exists and is included in Quarto resources.
        </div>
      `;
    }
  }

  // ---------------------------
  // 2.6) Tab switching
  // ---------------------------
  function showTab(tabKey) {
    tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tabKey));

    if (tabKey === "resume") {
      panelContent.style.display = "none";
      panelResume.style.display = "block";
      ensurePdfRendered();
      return;
    }

    panelResume.style.display = "none";
    panelContent.style.display = "block";

    if (tabKey === "about") {
      renderAbout();
      return;
    }
    if (tabKey === "projects") {
      renderProjects();
      return;
    }

    const data = CONTENT[tabKey];
    if (!data) {
      panelBody.innerHTML = `<div class="rs-h1">Not found</div>`;
      return;
    }
    renderCards(data);
  }

  tabButtons.forEach((b) => b.addEventListener("click", () => showTab(b.dataset.tab)));
  closeBtn.addEventListener("click", () => {
    resume.style.opacity = "0";
    resume.style.pointerEvents = "none";
  });

  // default tab: About
  showTab("about");

  function setPromptVisible(v) {
    prompt.style.opacity = v ? "1" : "0";
  }
  function setResumeVisible(v) {
    resume.style.opacity = v ? "1" : "0";
    resume.style.pointerEvents = v ? "auto" : "none";
  }

  // ---------------------------
  // 3) 3D room (dark but visible)
  // ---------------------------
  const room = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(8, 4, 8)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x070a12,
        roughness: 0.98,
        metalness: 0.0,
        side: THREE.BackSide,
      })
    )
  );
  room.position.set(0, 1.6, 0);
  group.add(room);

  const desk = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(2.6, 0.12, 1.2)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0a1020,
        roughness: 0.9,
        metalness: 0.05,
      })
    )
  );
  desk.position.set(0.1, 0.72, -0.1);
  group.add(desk);

  const bezel = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(1.75, 1.05, 0.09)),
    trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x05060a,
        roughness: 0.65,
        metalness: 0.22,
      })
    )
  );
  bezel.position.set(0.12, 1.18, -0.75);
  group.add(bezel);

  const screenMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x05060a,
      roughness: 0.35,
      metalness: 0.0,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0, // OFF initially
    })
  );
  const screen = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.52, 0.86)), screenMat);
  screen.position.set(0.12, 1.18, -0.70);
  group.add(screen);

  // Indicator LED (starts red)
  const ledMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xff3b3b }));
  const led = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.012, 10, 10)), ledMat);
  led.position.set(0.86, 0.78, -0.70);
  group.add(led);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.06);
  group.add(ambient);

  const moonFill = new THREE.DirectionalLight(0x9db7ff, 0.12);
  moonFill.position.set(-2.5, 3.2, 2.0);
  group.add(moonFill);

  // ---------------------------
  // 4) Camera framing
  // ---------------------------
  camera.fov = 55;
  camera.updateProjectionMatrix();

  const startPos = new THREE.Vector3(-0.18, 1.25, 0.55);
  const endPos = new THREE.Vector3(0.12, 1.18, -0.15);
  const lookTarget = new THREE.Vector3(0.12, 1.18, -0.72);

  camera.position.copy(startPos);
  camera.lookAt(lookTarget);

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

  // tiny click sound
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
    } catch { }
  }

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const smooth = (t) => t * t * (3 - 2 * t);

  // ---------------------------
  // 5.1) LED boot cadence (slow, spaced-out)
  // ---------------------------
  const LED_OFF = 0x111111;
  const LED_RED = 0xff3b3b;
  const LED_GREEN = 0x2cff6a;

  // Red pulses w/ wider gaps, then green
  const LED_SEQUENCE = [
    { on: true, color: LED_RED, dur: 0.35 },
    { on: false, color: LED_OFF, dur: 0.85 },
    { on: true, color: LED_RED, dur: 0.35 },
    { on: false, color: LED_OFF, dur: 0.85 },
    { on: true, color: LED_RED, dur: 0.35 },
    { on: false, color: LED_OFF, dur: 0.70 },
    // green happens early enough to be visible before zoom ends
    { on: true, color: LED_GREEN, dur: 999 },
  ];

  let bootElapsed = 0;
  let ledStep = 0;
  let ledStepElapsed = 0;

  function resetLedSequence() {
    bootElapsed = 0;
    ledStep = 0;
    ledStepElapsed = 0;
    led.visible = true;
    ledMat.color.set(LED_RED);
  }

  function tickLed(dt) {
    const step = LED_SEQUENCE[ledStep];
    ledStepElapsed += dt;
    bootElapsed += dt;

    // apply state for current step
    led.visible = !!step.on;
    ledMat.color.set(step.color);

    // advance steps
    if (ledStepElapsed >= step.dur && ledStep < LED_SEQUENCE.length - 1) {
      ledStepElapsed = 0;
      ledStep++;
    }
  }

  // ---------------------------
  // 6) Update
  // ---------------------------
  let time = 0;

  // Slower zoom (and consistent)
  const ZOOM_DURATION = 6.5;

  function update(dt) {
    time += dt;

    // subtle breathing
    const breathe = Math.sin(time * 0.9) * 0.0025;
    const sway = Math.sin(time * 0.35) * 0.003;

    // tiny LED pulse scale (still subtle)
    const p = 0.55 + (Math.sin(time * 2.1) * 0.5 + 0.5) * 0.45;
    led.scale.setScalar(0.75 + p * 0.25);

    if (state === State.ASLEEP) {
      fadeT = clamp01(fadeT + dt / 1.4);
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

        // startup glow (faint but noticeable)
        screenMat.emissive.set(0x141a22);
        screenMat.emissiveIntensity = 0.55;

        zoomT = 0;

        // restart LED cadence on boot
        resetLedSequence();
      }
    }

    if (state === State.BOOTING) {
      // Slow zoom
      zoomT = clamp01(zoomT + dt / ZOOM_DURATION);
      const t = smooth(zoomT);

      tmpPos.lerpVectors(startPos, endPos, t);
      camera.position.copy(tmpPos);

      camera.fov = 55 - t * 23;
      camera.updateProjectionMatrix();
      camera.lookAt(lookTarget);

      vignette.style.opacity = String(0.65 + t * 0.20);

      // LED cadence + ensure green appears BEFORE the end
      tickLed(dt);

      // Make screen glow more pronounced during boot, but still dark
      // ramps up as you approach the resume overlay
      const glow = 0.55 + t * 0.55;
      screenMat.emissiveIntensity = glow;
      screenMat.emissive.set(0x1a2230);

      if (zoomT >= 1) {
        state = State.RESUME;

        // finalize "on" state (green stays)
        led.visible = true;
        ledMat.color.set(LED_GREEN);

        // keep screen on but not blinding
        screenMat.emissive.set(0x1a2230);
        screenMat.emissiveIntensity = 1.05;

        setResumeVisible(true);
        showTab("about");
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

    renderer.setPixelRatio(prevPixelRatio);
    renderer.toneMappingExposure = prevExposure;
  }

  return { name: "Intro → Resume", update, dispose };
}
