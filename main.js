import * as THREE from './node_modules/three/build/three.module.js';
import { OrbitControls } from './node_modules/three/examples/jsm/controls/OrbitControls.js';

// ── Renderer ──────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);

// ── Scene & Camera ────────────────────────────────────────────────────────────
const scene  = new THREE.Scene();
scene.background = new THREE.Color(0x0a0f1e);
scene.fog = new THREE.FogExp2(0x0a0f1e, 0.025);

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 200);
camera.position.set(14, 11, 18);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.target.set(1, 2.5, -2);
controls.minDistance = 4;
controls.maxDistance = 45;

// ── Lights ────────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff4d0, 1.6);
sun.position.set(14, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left   = -20;
sun.shadow.camera.right  =  20;
sun.shadow.camera.top    =  20;
sun.shadow.camera.bottom = -20;
sun.shadow.camera.far    =  60;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
fill.position.set(-12, 6, -5);
scene.add(fill);

// ── Helpers ───────────────────────────────────────────────────────────────────
const M = {
  std: (c, r = 0.65, m = 0.05, e = 0x000000, ei = 0) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, emissive: e, emissiveIntensity: ei }),
  glass: () => new THREE.MeshStandardMaterial({ color: 0x99ddff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32 }),
  led:   (c) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2, roughness: 0.2 }),
};

function mkBox(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function mkCyl(rt, rb, h, seg, mat) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true;
  return m;
}
function mkSphere(r, mat) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), mat);
  m.castShadow = true;
  return m;
}

// ── Palette ───────────────────────────────────────────────────────────────────
const P = {
  concrete : 0xbfb8a8, concreteDk: 0x9a9284,
  railing  : 0x252525, railMetal : 0x3d3d3d,
  darkGreen: 0x0d2b1e, signGreen : 0x155724,
  generator: 0x484848, spring    : 0x7a7a22,
  pcb      : 0x1a5c2a, battery   : 0x252525,
  pole     : 0x505050, trunk     : 0x4a2800,
  ground   : 0x141e14, wall      : 0xbab0a0,
};

// ── Root & groups ─────────────────────────────────────────────────────────────
const root = new THREE.Group();
scene.add(root);

const G = {};
['base','stairs','railings','generators','powerBox','battery','ledPole','signage','trees'].forEach(k => {
  G[k] = new THREE.Group();
  root.add(G[k]);
});

// ── Ground & grid ─────────────────────────────────────────────────────────────
const groundMesh = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  M.std(P.ground, 1, 0)
);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.position.y = -0.55;
groundMesh.receiveShadow = true;
scene.add(groundMesh);
scene.add(new THREE.GridHelper(50, 50, 0x1a3020, 0x1a3020));

// ═══════════════════════════════════════════════════════════════════════════════
// 1. PLATFORM BASE
// ═══════════════════════════════════════════════════════════════════════════════
const platW = 18, platD = 13;
const plat = mkBox(platW, 0.55, platD, M.std(P.concrete, 0.8));
plat.position.set(0.5, -0.27, -2.5);
G.base.add(plat);

// edge trim
[
  [platW + 0.2, 0.12, 0.22,  0.5, -0.54,  2.75],
  [platW + 0.2, 0.12, 0.22,  0.5, -0.54, -7.75],
  [0.22, 0.12, platD + 0.2, -8.6, -0.54, -2.5],
  [0.22, 0.12, platD + 0.2,  9.6, -0.54, -2.5],
].forEach(([w,h,d,x,y,z]) => {
  const t = mkBox(w,h,d, M.std(P.concreteDk, 0.9));
  t.position.set(x,y,z);
  G.base.add(t);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. STAIRCASE  (4 steps)
// ═══════════════════════════════════════════════════════════════════════════════
const SW = 5.2, SD = 1.5, SH = 0.52;
const interactable = [];
const stepGroups  = [];

for (let i = 0; i < 4; i++) {
  const sg = new THREE.Group();

  // Solid step block
  const sb = mkBox(SW, SH * (i + 1), SD, M.std(P.concrete, 0.7));
  sb.position.y = SH * (i + 1) / 2;
  sg.add(sb);

  // Riser face
  const rf = mkBox(SW, SH, 0.05, M.std(P.concreteDk, 0.8));
  rf.position.set(0, SH * i + SH / 2, SD / 2 + 0.025);
  sg.add(rf);

  // "SMART STEP" label plate on riser
  const lp = mkBox(2.2, 0.2, 0.06, M.std(P.signGreen, 0.4, 0, 0x0a1a0a, 0.3));
  lp.position.set(0, SH * i + SH / 2, SD / 2 + 0.06);
  lp.userData = { label: `Step ${i+1} – Smart Step`, tip: 'Piezoelectric tile converts foot pressure into electricity.' };
  interactable.push(lp);
  sg.add(lp);

  sg.position.set(-2.5, 0, -SD * i);
  G.stairs.add(sg);
  stepGroups.push(sg);
}

// Side walls
for (const sx of [-2.5 - SW/2 - 0.15, -2.5 + SW/2 + 0.15]) {
  const wall = mkBox(0.28, SH * 4 + 0.5, SD * 4 + 0.5, M.std(P.wall, 0.75));
  wall.position.set(sx, (SH * 4 + 0.5) / 2, -SD * 1.5);
  G.stairs.add(wall);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. RAILINGS
// ═══════════════════════════════════════════════════════════════════════════════
function buildRailing(xOff) {
  const rg = new THREE.Group();
  const railM = M.std(P.railing, 0.35, 0.7);
  const postM = M.std(P.railMetal, 0.3, 0.8);

  const diagLen = Math.sqrt((SD * 4) ** 2 + (SH * 4) ** 2);
  const diagAngle = Math.atan2(SH * 4, SD * 4);

  // Main handrail (diagonal)
  const hr = mkCyl(0.045, 0.045, diagLen + 0.4, 8, railM);
  hr.rotation.x = diagAngle;
  hr.position.set(xOff, SH * 2 + 0.95, -SD * 1.5);
  rg.add(hr);

  // Mid rail
  const mr = mkCyl(0.03, 0.03, diagLen + 0.3, 8, railM);
  mr.rotation.x = diagAngle;
  mr.position.set(xOff, SH * 2 + 0.45, -SD * 1.5);
  rg.add(mr);

  // Vertical posts
  for (let i = 0; i <= 4; i++) {
    const ph = SH * (4 - i) + 1.0;
    const post = mkCyl(0.04, 0.04, ph, 8, postM);
    post.position.set(xOff, SH * i + ph / 2, -SD * i);
    rg.add(post);
    const foot = mkCyl(0.075, 0.075, 0.09, 8, postM);
    foot.position.set(xOff, SH * i + 0.045, -SD * i);
    rg.add(foot);
  }

  // Top horizontal extension
  const te = mkCyl(0.045, 0.045, 1.5, 8, railM);
  te.rotation.x = Math.PI / 2;
  te.position.set(xOff, SH * 4 + 0.95, -SD * 4 - 0.75);
  rg.add(te);

  G.railings.add(rg);
}
buildRailing(-2.5 - SW / 2 - 0.15);
buildRailing(-2.5 + SW / 2 + 0.15);

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PIEZOELECTRIC GENERATORS  (3 per step × 4 steps)
// ═══════════════════════════════════════════════════════════════════════════════
const genM    = M.std(P.generator, 0.4, 0.5);
const springM = M.std(P.spring, 0.5, 0.3);
const baseM   = M.std(0x1a1a1a, 0.3, 0.7);

for (let i = 0; i < 4; i++) {
  const topY = SH * (i + 1);
  const sz   = -SD * i;

  for (let j = -1; j <= 1; j++) {
    const gg = new THREE.Group();

    // Housing cylinder
    const body = mkCyl(0.19, 0.19, 0.24, 16, genM);
    body.position.y = topY - 0.12;
    body.userData = { label: 'Piezoelectric Generator', tip: 'Harvests kinetic energy from foot pressure and converts it to electricity.' };
    interactable.push(body);
    gg.add(body);

    // Spring rings
    for (let k = 0; k < 6; k++) {
      const ring = mkCyl(0.13, 0.13, 0.025, 12, springM);
      ring.position.y = topY - 0.32 - k * 0.05;
      gg.add(ring);
    }

    // Base plate
    const bp = mkBox(0.32, 0.05, 0.32, baseM);
    bp.position.y = topY - 0.64;
    gg.add(bp);

    gg.position.set(-2.5 + j * 1.55, 0, sz);
    G.generators.add(gg);
  }

  // LED edge strip
  const strip = mkBox(SW - 0.1, 0.045, 0.07, M.led(0x00ff88));
  strip.position.set(-2.5, topY + 0.02, -SD * i);
  G.generators.add(strip);

  const pl = new THREE.PointLight(0x00ff88, 0.5, 3);
  pl.position.set(-2.5, topY + 0.2, -SD * i);
  G.generators.add(pl);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. POWER MANAGEMENT UNIT
// ═══════════════════════════════════════════════════════════════════════════════
{
  const pmu = new THREE.Group();

  // Cabinet body
  const cab = mkBox(2.4, 3.0, 0.9, M.std(P.darkGreen, 0.5, 0.1));
  cab.userData = { label: 'Power Management Unit', tip: 'Regulates energy flow from generators → battery → LED output.' };
  interactable.push(cab);
  pmu.add(cab);

  // Glass door
  const door = mkBox(2.0, 2.6, 0.05, M.glass());
  door.position.z = 0.47;
  pmu.add(door);

  // PCB board
  const pcb = mkBox(1.7, 2.1, 0.09, M.std(P.pcb, 0.4, 0.1, 0x003010, 0.2));
  pcb.position.set(0, 0.1, 0.06);
  pmu.add(pcb);

  // PCB components
  [[-.55,.55],[.45,.55],[-.55,-.05],[.45,-.05],[-.55,-.65],[.45,-.65]].forEach(([x,y]) => {
    const c = mkBox(0.22, 0.13, 0.11, M.std(0x333300, 0.3, 0.5));
    c.position.set(x, y, 0.22);
    pmu.add(c);
  });

  // LED indicators
  [0xff2020, 0x20ff20, 0xffaa00].forEach((col, i) => {
    const ind = mkCyl(0.042, 0.042, 0.065, 8, M.led(col));
    ind.rotation.x = Math.PI / 2;
    ind.position.set(-0.55 + i * 0.28, 1.0, 0.46);
    pmu.add(ind);
  });

  // Display screen
  const screen = mkBox(0.95, 0.55, 0.045,
    new THREE.MeshStandardMaterial({ color: 0x00cc44, emissive: 0x004422, emissiveIntensity: 1.2, roughness: 0.1 }));
  screen.position.set(0.22, 0.88, 0.46);
  pmu.add(screen);

  // Door handle
  const handle = mkBox(0.065, 0.45, 0.065, M.std(0xaaaaaa, 0.2, 0.9));
  handle.position.set(0.9, 0, 0.47);
  pmu.add(handle);

  // Label strip
  const lbl = mkBox(1.6, 0.2, 0.065, M.std(P.signGreen, 0.4, 0, 0x0a1a0a, 0.3));
  lbl.position.set(0, 1.35, 0.47);
  pmu.add(lbl);

  pmu.position.set(4.8, 1.55, -3.0);
  G.powerBox.add(pmu);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. BATTERY STORAGE
// ═══════════════════════════════════════════════════════════════════════════════
{
  const bat = new THREE.Group();

  const cas = mkBox(2.4, 2.0, 0.9, M.std(P.battery, 0.5, 0.25));
  cas.userData = { label: 'Battery Storage Unit', tip: 'Stores generated electricity to power LED lights during low-traffic periods.' };
  interactable.push(cas);
  bat.add(cas);

  // Battery cells
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const cell = mkCyl(0.24, 0.24, 0.7, 16, M.std(0x3a3a7a, 0.4, 0.5));
      cell.rotation.z = Math.PI / 2;
      cell.position.set(-0.5 + col * 0.5, 0.38 - row * 0.65, 0.05);
      bat.add(cell);
      const cap = mkCyl(0.24, 0.24, 0.055, 16, M.std(0x606060, 0.3, 0.7));
      cap.rotation.z = Math.PI / 2;
      cap.position.set(-0.5 + col * 0.5 + 0.38, 0.38 - row * 0.65, 0.05);
      bat.add(cap);
    }
  }

  // Terminals
  [[-0.45, '+'], [0.45, '–']].forEach(([x]) => {
    const t = mkCyl(0.085, 0.085, 0.16, 8, M.std(0xcccccc, 0.2, 0.85));
    t.position.set(x, 1.08, 0);
    bat.add(t);
  });

  // Glass front
  bat.add((() => { const d = mkBox(2.0, 1.65, 0.045, M.glass()); d.position.z = 0.47; return d; })());

  // Label
  const bl = mkBox(1.6, 0.2, 0.065, M.std(P.signGreen, 0.4, 0, 0x0a1a0a, 0.3));
  bl.position.set(0, 0.92, 0.47);
  bat.add(bl);

  bat.position.set(4.8, 1.0, 0.3);
  G.battery.add(bat);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. LED POLE
// ═══════════════════════════════════════════════════════════════════════════════
{
  const pole = new THREE.Group();
  const pM = M.std(P.pole, 0.4, 0.6);

  const bar = mkCyl(0.065, 0.09, 6.0, 12, pM);
  bar.position.y = 3.0;
  pole.add(bar);

  const flange = mkCyl(0.27, 0.27, 0.13, 12, pM);
  flange.position.y = 0.065;
  pole.add(flange);

  // Arm
  const arm = mkCyl(0.05, 0.05, 1.4, 8, pM);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(0.7, 5.8, 0);
  pole.add(arm);

  // Hood
  const hood = mkBox(0.45, 0.2, 0.35, M.std(0x2a2a2a, 0.4, 0.5));
  hood.position.set(1.4, 5.68, 0);
  hood.userData = { label: 'LED Street Light', tip: 'Powered entirely by Smart Step energy. Zero grid electricity used.' };
  interactable.push(hood);
  pole.add(hood);

  // Bulb
  const bulb = mkBox(0.36, 0.12, 0.28,
    new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffcc44, emissiveIntensity: 2.0 }));
  bulb.position.set(1.4, 5.58, 0);
  pole.add(bulb);

  const lampPt = new THREE.PointLight(0xffdd88, 2.5, 14);
  lampPt.position.set(1.4, 5.4, 0);
  pole.add(lampPt);
  pole._lampLight = lampPt;

  // Sign on pole
  const ps = mkBox(0.75, 0.55, 0.07, M.std(P.signGreen, 0.4, 0, 0x0a1a0a, 0.4));
  ps.position.set(0, 4.1, 0.12);
  pole.add(ps);

  const bulbIcon = mkSphere(0.09,
    new THREE.MeshStandardMaterial({ color: 0xffee88, emissive: 0xffcc00, emissiveIntensity: 2.5 }));
  bulbIcon.position.set(0, 4.45, 0.16);
  pole.add(bulbIcon);

  pole.position.set(7.5, 0, -1.5);
  G.ledPole.add(pole);
  G.ledPole._lampLight = lampPt;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. SIGNAGE PANELS
// ═══════════════════════════════════════════════════════════════════════════════
{
  // Left overview panel
  const lp = new THREE.Group();
  const lpBack = mkBox(4.0, 5.8, 0.16, M.std(0xede9df, 0.85));
  lpBack.userData = { label: 'Overview Panel', tip: 'Smart Step: Staircase-Based Power System for Renewable Energy Generation.' };
  interactable.push(lpBack);
  lp.add(lpBack);

  // Header
  const lpH = mkBox(4.0, 0.7, 0.19, M.std(P.signGreen, 0.4, 0, 0x061208, 0.3));
  lpH.position.set(0, 2.55, 0.02);
  lp.add(lpH);

  const lpSub = mkBox(4.0, 0.34, 0.18, M.std(0x2d6a4f, 0.4, 0, 0x061a0c, 0.2));
  lpSub.position.set(0, 2.08, 0.02);
  lp.add(lpSub);

  // Text rows
  for (let r = 0; r < 9; r++) {
    const row = mkBox(3.4 - (r % 2) * 0.3, 0.11, 0.04, M.std(0xbbbb99, 0.95));
    row.position.set(-0.15, 1.7 - r * 0.37, 0.1);
    lp.add(row);
  }

  // Section header strips
  [1.8, 0.6, -0.65].forEach(y => {
    const sh = mkBox(3.6, 0.21, 0.065, M.std(P.signGreen, 0.4, 0, 0x061208, 0.2));
    sh.position.set(0, y, 0.1);
    lp.add(sh);
  });

  // Logo circle
  const logo = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), M.std(P.signGreen, 0.4, 0, 0x061208, 0.4));
  logo.position.set(1.6, 2.55, 0.11);
  lp.add(logo);
  const logoRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 8, 32), M.std(0xffffff, 0.5));
  logoRing.position.set(1.6, 2.55, 0.12);
  lp.add(logoRing);

  lp.position.set(-8.0, 3.2, -2.5);
  lp.rotation.y = Math.PI / 9;
  G.signage.add(lp);

  // Right institution panel
  const rp = new THREE.Group();
  const rpBack = mkBox(3.0, 4.2, 0.16, M.std(0xede9df, 0.85));
  rpBack.userData = { label: 'Saint Joseph College', tip: 'Saint Joseph College of Rosario, Batangas Inc. — Sustainable Step Towards a Greener Future.' };
  interactable.push(rpBack);
  rp.add(rpBack);

  const rpH = mkBox(3.0, 0.62, 0.19, M.std(P.signGreen, 0.4, 0, 0x061208, 0.3));
  rpH.position.set(0, 1.79, 0.02);
  rp.add(rpH);
  for (let r = 0; r < 6; r++) {
    const row = mkBox(2.6 - (r % 3 === 0 ? 0.2 : 0), 0.11, 0.04, M.std(0xbbbb99, 0.95));
    row.position.set(0, 1.3 - r * 0.42, 0.1);
    rp.add(row);
  }

  rp.position.set(9.2, 3.2, -4.0);
  rp.rotation.y = -Math.PI / 9;
  G.signage.add(rp);

  // "GENERATE POWER ↓↓↓" overhead sign
  const gs = new THREE.Group();
  const gsb = mkBox(2.8, 0.6, 0.13, M.std(P.signGreen, 0.4, 0, 0x0a1a0a, 0.35));
  gs.add(gsb);
  const gst = mkBox(1.9, 0.15, 0.065, M.std(0xddddcc, 0.9));
  gst.position.set(0, -0.1, 0.08);
  gs.add(gst);
  gs.position.set(-2.5, 5.8, -3.5);
  G.signage.add(gs);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. TREES
// ═══════════════════════════════════════════════════════════════════════════════
function mkTree(x, z, scale = 1) {
  const t = new THREE.Group();
  const trunkM = M.std(P.trunk, 0.9, 0.05);
  const foliageM = M.std(0x1a5c2a, 0.85);
  const trunk = mkCyl(0.12 * scale, 0.18 * scale, 1.3 * scale, 8, trunkM);
  trunk.position.y = 0.65 * scale;
  t.add(trunk);
  [[0.75,0.9],[0.6,1.55],[0.42,2.15]].forEach(([r, y]) => {
    const f = mkSphere(r * scale, foliageM);
    f.position.y = y * scale;
    f.scale.y = 0.82;
    t.add(f);
  });
  t.position.set(x, 0, z);
  G.trees.add(t);
}
mkTree(7.8, 1.8);
mkTree(7.2, -5.0, 0.75);
mkTree(-7.5, -5.5, 0.85);

// ═══════════════════════════════════════════════════════════════════════════════
// 10. WIRES / CABLE RUNS
// ═══════════════════════════════════════════════════════════════════════════════
function mkWire(pts, col = 0x00ff44) {
  const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p)));
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: col }));
}
// Generators → PMU
scene.add(mkWire([[0.5, 1.1, -1.5],[3.6, 1.1, -1.5],[3.6, 1.55, -3.0]]));
// PMU → Battery
scene.add(mkWire([[4.8, 0.4, -2.1],[4.8, 0.4, -0.4]]));
// Battery → LED pole
scene.add(mkWire([[6.0, 0.4, 0.3],[7.5, 0.4, 0.3],[7.5, 0.6, -1.5]], 0xffcc00));

// ═══════════════════════════════════════════════════════════════════════════════
// 11. ENERGY PARTICLE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
const NPARTICLES = 280;
const pPos = new Float32Array(NPARTICLES * 3);
const pVel = Array.from({ length: NPARTICLES }, () => ({
  x: (Math.random() - 0.5) * 0.025,
  y: 0.025 + Math.random() * 0.045,
  z: (Math.random() - 0.5) * 0.015,
}));
for (let i = 0; i < NPARTICLES; i++) {
  pPos[i*3]   = (Math.random() - 0.5) * SW - 2.5;
  pPos[i*3+1] = Math.random() * 2.5;
  pPos[i*3+2] = -(Math.random() * SD * 4);
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(pGeo,
  new THREE.PointsMaterial({ color: 0x00ff88, size: 0.08, sizeAttenuation: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
);
particles.visible = false;
scene.add(particles);

// ═══════════════════════════════════════════════════════════════════════════════
// 12. RAYCASTER / TOOLTIP
// ═══════════════════════════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(-9999, -9999);
const tooltip = document.getElementById('tooltip');

renderer.domElement.addEventListener('mousemove', e => {
  mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  tooltip.style.left = (e.clientX + 15) + 'px';
  tooltip.style.top  = (e.clientY - 12) + 'px';
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13. STATE
// ═══════════════════════════════════════════════════════════════════════════════
let autoRotate = true, exploded = false, nightMode = false;
let stepCount = 0, stepFlash = 0, battery = 45, ledOut = 30;

const explodeOffsets = {
  base:       [0, -1.8, 0],
  stairs:     [-3.5, 0, -2.5],
  railings:   [0, 2.5, 0],
  generators: [0, -2.5, 0],
  powerBox:   [3.5, 1.5, 2.5],
  battery:    [3.5, -1.5, 3.5],
  ledPole:    [4.5, 0, -3],
  signage:    [-4.5, 2.5, 4],
  trees:      [6, 0, 5],
};

const _v3 = new THREE.Vector3();
function lerpG(key) {
  const off = exploded ? explodeOffsets[key] : [0, 0, 0];
  G[key].position.lerp(_v3.set(...off), 0.055);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. BUTTON CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);

$('btn-rotate').addEventListener('click', () => {
  autoRotate = !autoRotate;
  $('btn-rotate').classList.toggle('active', autoRotate);
});

$('btn-explode').addEventListener('click', () => {
  exploded = !exploded;
  $('btn-explode').classList.toggle('active', exploded);
  $('btn-explode').textContent = exploded ? '🔗 Assemble' : '💥 Explode View';
});

$('btn-step').addEventListener('click', () => {
  stepCount++;
  stepFlash = 45;
  battery  = Math.min(100, battery + 2.5);
  ledOut   = Math.min(100, ledOut + 4);
  $('step-count').textContent = stepCount;
  particles.visible = true;
  setTimeout(() => { particles.visible = false; }, 1800);
  const idx = stepCount % 4;
  stepGroups[idx]._bounce = 10;
});

$('btn-night').addEventListener('click', () => {
  nightMode = !nightMode;
  $('btn-night').classList.toggle('active', nightMode);
  $('btn-night').textContent = nightMode ? '☀️ Day Mode' : '🌙 Night Mode';
  scene.background.set(nightMode ? 0x010408 : 0x0a0f1e);
  ambient.intensity = nightMode ? 0.08 : 0.5;
  sun.intensity     = nightMode ? 0.0  : 1.6;
  const lamp = G.ledPole.children[0]?._lampLight || G.ledPole.getObjectByProperty('isPointLight', true);
  if (lamp) lamp.intensity = nightMode ? 5.0 : 2.5;
  G.generators.traverse(o => {
    if (o.isMesh && o.material?.emissive?.getHex?.() === 0x00ff88)
      o.material.emissiveIntensity = nightMode ? 2.5 : 1.2;
  });
});

$('btn-reset').addEventListener('click', () => {
  camera.position.set(14, 11, 18);
  controls.target.set(1, 2.5, -2);
  exploded = false;
  $('btn-explode').classList.remove('active');
  $('btn-explode').textContent = '💥 Explode View';
  Object.keys(explodeOffsets).forEach(k => G[k].position.set(0, 0, 0));
});

// ═══════════════════════════════════════════════════════════════════════════════
// 15. ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════════════════════
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (autoRotate) root.rotation.y += 0.0028;
  Object.keys(explodeOffsets).forEach(lerpG);

  // Step bounce
  stepGroups.forEach(sg => {
    if (sg._bounce > 0) {
      sg.position.y = -Math.abs(Math.sin(sg._bounce * 0.38)) * 0.15;
      sg._bounce--;
    } else {
      sg.position.y = 0;
    }
  });

  // Particles
  if (particles.visible) {
    const pa = particles.geometry.attributes.position.array;
    for (let i = 0; i < NPARTICLES; i++) {
      pa[i*3]   += pVel[i].x;
      pa[i*3+1] += pVel[i].y;
      pa[i*3+2] += pVel[i].z;
      if (pa[i*3+1] > 3.0) {
        pa[i*3]   = (Math.random()-0.5)*SW - 2.5;
        pa[i*3+1] = 0;
        pa[i*3+2] = -(Math.random()*SD*4);
      }
    }
    particles.geometry.attributes.position.needsUpdate = true;
  }

  if (stepFlash > 0) stepFlash--;

  // Night lamp flicker
  if (nightMode) {
    G.ledPole.traverse(o => {
      if (o.isPointLight) o.intensity = 5.0 + Math.sin(t * 9) * 0.15;
    });
  }

  // Meters
  const kv = stepFlash > 0 ? Math.min(100, stepFlash * 2.2) : 0;
  $('m-kinetic').style.width = kv + '%';
  battery = Math.min(100, battery + 0.004);
  $('m-battery').style.width = battery.toFixed(1) + '%';
  const ov = 28 + Math.sin(t * 0.9) * 6 + (battery > 50 ? 18 : 6);
  $('m-output').style.width  = Math.min(100, ov).toFixed(1) + '%';

  // Tooltip
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactable, false);
  if (hits.length) {
    const d = hits[0].object.userData;
    tooltip.style.display = 'block';
    tooltip.innerHTML = `<b>${d.label}</b><br>${d.tip}`;
  } else {
    tooltip.style.display = 'none';
  }

  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

animate();
