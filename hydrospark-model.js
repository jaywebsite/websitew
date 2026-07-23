// HYDROSPARK 3D Model - Full Detail Three.js Implementation
let scene, camera, renderer, controls;
let turbineBlades, animationActive = true;
let waterParticles = [];
let isExploded = false, explodeProgress = 0, explodeTarget = 0;
let isWireframe = false;
let componentGroups = {}; // named groups for explode
let allMeshes = [];       // for wireframe toggle
let labelElements = {};   // DOM labels

const MAT = {
  blueMetal: null, blueDark: null, whitePlastic: null,
  darkGray: null, lightGray: null, black: null,
  screen: null, glassFilter: null, solar: null,
  solarCell: null, yellow: null, red: null,
  signWhite: null, chrome: null, rust: null,
  greenBtn: null, redBtn: null, orange: null,
  pipeWhite: null, gutterGray: null, roofWhite: null,
  boxBeige: null, bladeDark: null, silverMetal: null
};

function initMaterials() {
  MAT.blueMetal    = new THREE.MeshStandardMaterial({ color:0x1a3a6b, metalness:0.7, roughness:0.3 });
  MAT.blueDark     = new THREE.MeshStandardMaterial({ color:0x0d2244, metalness:0.8, roughness:0.3 });
  MAT.whitePlastic = new THREE.MeshStandardMaterial({ color:0xf0f0f0, roughness:0.35 });
  MAT.darkGray     = new THREE.MeshStandardMaterial({ color:0x1a1a1a, roughness:0.7 });
  MAT.lightGray    = new THREE.MeshStandardMaterial({ color:0x888888, metalness:0.4, roughness:0.5 });
  MAT.black        = new THREE.MeshStandardMaterial({ color:0x111111, roughness:0.8 });
  MAT.screen       = new THREE.MeshStandardMaterial({ color:0x0077cc, emissive:0x0044aa, emissiveIntensity:0.9, roughness:0.05 });
  MAT.glassFilter  = new THREE.MeshStandardMaterial({ color:0xbbddee, transparent:true, opacity:0.30, roughness:0.02, metalness:0.05 });
  MAT.solar        = new THREE.MeshStandardMaterial({ color:0x101828, metalness:0.6, roughness:0.2 });
  MAT.solarCell    = new THREE.MeshStandardMaterial({ color:0x070f1e, metalness:0.7, roughness:0.2 });
  MAT.yellow       = new THREE.MeshStandardMaterial({ color:0xffcc00, metalness:0.5, roughness:0.3 });
  MAT.red          = new THREE.MeshStandardMaterial({ color:0xcc0000, metalness:0.3, roughness:0.4 });
  MAT.signWhite    = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.5 });
  MAT.chrome       = new THREE.MeshStandardMaterial({ color:0xd4af37, metalness:1.0, roughness:0.1 }); // gold hub
  MAT.greenBtn     = new THREE.MeshStandardMaterial({ color:0x00dd44, emissive:0x009922, emissiveIntensity:0.6 });
  MAT.redBtn       = new THREE.MeshStandardMaterial({ color:0xee1111, emissive:0x880000, emissiveIntensity:0.4 });
  MAT.orange       = new THREE.MeshStandardMaterial({ color:0xff6600, metalness:0.3, roughness:0.4 });
  MAT.pipeWhite    = new THREE.MeshStandardMaterial({ color:0xf2f2f2, roughness:0.25 }); // bright white PVC
  MAT.gutterGray   = new THREE.MeshStandardMaterial({ color:0x999999, metalness:0.3, roughness:0.5 });
  MAT.roofWhite    = new THREE.MeshStandardMaterial({ color:0xf5f5f5, roughness:0.5 });
  MAT.boxBeige     = new THREE.MeshStandardMaterial({ color:0xd4cbb8, roughness:0.5 }); // beige control box
  MAT.bladeDark    = new THREE.MeshStandardMaterial({ color:0x111111, metalness:0.3, roughness:0.6 }); // turbine blades
  MAT.silverMetal  = new THREE.MeshStandardMaterial({ color:0xaaaaaa, metalness:0.9, roughness:0.15 });
}

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 20, 60);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.01, 200);
  camera.position.set(4.5, 3.5, 5.5);

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // cap at 2× for perf
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.getElementById('canvas-container').appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  // ── Smooth damping ──
  controls.enableDamping    = true;
  controls.dampingFactor    = 0.07;
  controls.rotateSpeed      = 0.7;
  controls.zoomSpeed        = 1.1;
  controls.panSpeed         = 0.8;

  // ── Touch gestures ──
  controls.touches = {
    ONE:   THREE.TOUCH.ROTATE,
    TWO:   THREE.TOUCH.DOLLY_PAN
  };

  // ── Limits ──
  controls.minDistance      = 1.2;
  controls.maxDistance      = 18;
  controls.maxPolarAngle    = Math.PI * 0.88;  // don't go below ground
  controls.minPolarAngle    = 0.05;

  // ── Smooth inertia for mobile swipe feel ──
  controls.enableInertia    = false; // handled by dampingFactor

  controls.target.set(0, 1.2, 0);
  controls.update();

  // Prevent page scroll while interacting with canvas
  renderer.domElement.addEventListener('touchmove', e => e.preventDefault(), {passive:false});
  renderer.domElement.addEventListener('wheel',     e => e.preventDefault(), {passive:false});

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff5e0, 1.4);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.width  = 4096;
  sun.shadow.mapSize.height = 4096;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far  = 40;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -8;
  sun.shadow.camera.right = sun.shadow.camera.top = 8;
  sun.shadow.bias = -0.001;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xaaccff, 0.4);
  fill.position.set(-5, 5, -3);
  scene.add(fill);

  const hemi = new THREE.HemisphereLight(0x87ceeb, 0x228B22, 0.3);
  scene.add(hemi);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color:0x3a7d44, roughness:0.9 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Concrete pad
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.06, 2.8),
    new THREE.MeshStandardMaterial({ color:0xb0a898, roughness:0.9 })
  );
  pad.position.set(0, 0.03, 0);
  pad.receiveShadow = true;
  scene.add(pad);

  initMaterials();
  buildHydroSparkModel();

  window.addEventListener('resize', onWindowResize);
  animate();
}

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────
function box(w, h, d, mat, px, py, pz, rx, ry, rz, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(px||0, py||0, pz||0);
  if (rx) m.rotation.x = rx;
  if (ry) m.rotation.y = ry;
  if (rz) m.rotation.z = rz;
  m.castShadow = true; m.receiveShadow = true;
  (parent||scene).add(m);
  return m;
}

function cyl(rt, rb, h, seg, mat, px, py, pz, rx, ry, rz, parent) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg||16), mat);
  m.position.set(px||0, py||0, pz||0);
  if (rx !== undefined) m.rotation.x = rx;
  if (ry !== undefined) m.rotation.y = ry;
  if (rz !== undefined) m.rotation.z = rz;
  m.castShadow = true; m.receiveShadow = true;
  (parent||scene).add(m);
  return m;
}

function pipe(r, h, mat, px, py, pz, rx, ry, rz, parent) {
  // hollow pipe using tube
  const path = new THREE.LineCurve3(new THREE.Vector3(0,0,0), new THREE.Vector3(0,h,0));
  const geo = new THREE.TubeGeometry(path, 1, r, 12, false);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(px||0, py||0, pz||0);
  if (rx !== undefined) m.rotation.x = rx;
  if (ry !== undefined) m.rotation.y = ry;
  if (rz !== undefined) m.rotation.z = rz;
  m.castShadow = true;
  (parent||scene).add(m);
  return m;
}

function pipeCurve(points, r, mat, parent) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, 30, r, 10, false);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  (parent||scene).add(m);
  return m;
}

function torus(R, r, seg, mat, px, py, pz, rx, ry, rz, parent) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(R, r, 8, seg||12), mat);
  m.position.set(px||0, py||0, pz||0);
  if (rx !== undefined) m.rotation.x = rx;
  if (ry !== undefined) m.rotation.y = ry;
  if (rz !== undefined) m.rotation.z = rz;
  m.castShadow = true;
  (parent||scene).add(m);
  return m;
}

// Proper 90-degree PVC elbow: quarter torus
function pvcElbow(r, elbowR, mat, px, py, pz, rx, ry, rz, parent) {
  const geo = new THREE.TorusGeometry(elbowR, r, 12, 16, Math.PI/2);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(px||0, py||0, pz||0);
  if (rx !== undefined) m.rotation.x = rx;
  if (ry !== undefined) m.rotation.y = ry;
  if (rz !== undefined) m.rotation.z = rz;
  m.castShadow = true;
  (parent||scene).add(m);
  return m;
}

// PVC T-junction: two crossing cylinders with a sphere joint
function pvcTee(r, h1, h2, mat, px, py, pz, rx, ry, rz, parent) {
  const g = new THREE.Group();
  // main run
  const m1 = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h1,12), mat);
  g.add(m1);
  // branch (perpendicular)
  const m2 = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h2,12), mat);
  m2.rotation.z = Math.PI/2;
  g.add(m2);
  // junction sphere
  const ms = new THREE.Mesh(new THREE.SphereGeometry(r*1.25, 12, 12), mat);
  g.add(ms);
  g.position.set(px||0, py||0, pz||0);
  if (rx !== undefined) g.rotation.x = rx;
  if (ry !== undefined) g.rotation.y = ry;
  if (rz !== undefined) g.rotation.z = rz;
  g.castShadow = true;
  (parent||scene).add(g);
  return g;
}

// ─── MAIN BUILD FUNCTION ─────────────────────────────────────────────────────
function buildHydroSparkModel() {
  const G = new THREE.Group();
  G.position.set(0, 0.06, 0);
  scene.add(G);
  scene.userData.hydroRoot = G;

  // Each sub-system gets its own Group so we can move it for explode view
  // explodeOffset = the direction/distance this group travels when exploded
  function makeGroup(name, ex, ey, ez) {
    const g = new THREE.Group();
    g.userData.name        = name;
    g.userData.homePos     = new THREE.Vector3(0,0,0);
    g.userData.explodeOfs  = new THREE.Vector3(ex,ey,ez);
    g.userData.currentPos  = new THREE.Vector3(0,0,0);
    G.add(g);
    componentGroups[name] = g;
    return g;
  }

  const gFrame   = makeGroup('frame',    0,   0,   0);
  const gRoof    = makeGroup('roof',     0,   2.2, 0);
  const gFilter  = makeGroup('filter',  -2.4, 0.6, 0);
  const gPipes   = makeGroup('pipes',   -1.2, 0.4, 1.8);
  const gTurbine = makeGroup('turbine',  1.6, 0,   1.6);
  const gControl = makeGroup('control',  1.8, 0.8,-1.4);
  const gBattery = makeGroup('battery',  1.6,-0.2, 1.2);
  const gOutput  = makeGroup('output',   0,  -1.2, 0);
  const gSign    = makeGroup('sign',     0,   1.8,-1.8);

  buildFrame(gFrame);
  buildRoof(gRoof, G);    // downspout goes into G directly (spans groups)
  buildBasePlatform(gOutput);
  buildFrontOutputPanel(gOutput);
  buildFilterSystem(gFilter);
  buildPipeNetwork(gPipes);
  buildTurbine(gTurbine);
  buildControlBox(gControl);
  buildBattery(gBattery);
  buildSignPanel(gSign);
  buildWaterParticles(G);

  // Collect all meshes for wireframe toggle
  G.traverse(obj => { if (obj.isMesh) allMeshes.push(obj); });

  createExplodeLabels();
}

// ─── 1. STRUCTURAL FRAME ─────────────────────────────────────────────────────
function buildFrame(G) {
  const post = MAT.blueMetal;
  const W=2.6, D=2.2, H=2.4;
  const t=0.07;
  // 4 vertical columns
  const cols = [[-W/2,-D/2],[W/2,-D/2],[W/2,D/2],[-W/2,D/2]];
  cols.forEach(([x,z]) => {
    cyl(t,t,H,8,post, x, H/2, z, 0,0,0, G);
  });
  // top horizontal beams (4 sides)
  box(W+t*2, t, t, post,  0, H, -D/2,  0,0,0, G); // front
  box(W+t*2, t, t, post,  0, H,  D/2,  0,0,0, G); // back
  box(t, t, D+t*2, post, -W/2, H, 0,  0,0,0, G); // left
  box(t, t, D+t*2, post,  W/2, H, 0,  0,0,0, G); // right
  // mid horizontal cross braces
  box(W, t*0.7, t*0.7, post, 0, 1.5, -D/2, 0,0,0, G);
  box(W, t*0.7, t*0.7, post, 0, 1.5,  D/2, 0,0,0, G);
  // diagonal knee braces at base
  [[-W/2,-D/2],[W/2,-D/2],[W/2,D/2],[-W/2,D/2]].forEach(([x,z]) => {
    box(0.04,0.04,0.6, post, x+(x>0?-0.15:0.15), 0.3, z, 0, 0, x>0?-0.4:0.4, G);
  });
}

// ─── 2. ROOF (Solar panel + gutter + overhang) ───────────────────────────────
function buildRoof(G, rootG) {
  // rootG is the scene root group — downspout pipes span from roof to filter
  const pipeParent = rootG || G;
  const W=3.0, D=2.6, H=2.4;

  // Main roof panel (tilted slightly like in image — front is lower)
  const roofGroup = new THREE.Group();
  roofGroup.position.set(0, H+0.05, 0);
  roofGroup.rotation.x = -0.10;
  G.add(roofGroup);

  // White roof underside / frame overhang
  box(W+0.3, 0.07, D+0.2, MAT.roofWhite, 0, 0, 0, 0,0,0, roofGroup);

  // Solar panel dark surface on top
  box(W+0.1, 0.05, D, MAT.solar, 0, 0.06, 0, 0,0,0, roofGroup);

  // Solar cell grid
  const cellMat = MAT.solarCell;
  for (let xi = -1.35; xi <= 1.35; xi += 0.22) {
    for (let zi = -1.1; zi <= 1.1; zi += 0.18) {
      const cell = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.15), cellMat);
      cell.position.set(xi, 0.086, zi);
      cell.rotation.x = -Math.PI/2;
      roofGroup.add(cell);
    }
  }

  // Gutter channel at the front edge of roof (half-round, runs left-right)
  // Using a box trough shape for clarity
  box(W+0.35, 0.07, 0.09, MAT.gutterGray, 0, -0.04, -(D/2+0.13), 0,0,0, roofGroup);
  // Gutter inner darker channel
  box(W+0.3, 0.04, 0.06, new THREE.MeshStandardMaterial({color:0x555555}), 0, -0.02, -(D/2+0.13), 0,0,0, roofGroup);

  // ── Downspout: straight vertical from gutter down left column ──
  // Left column is at x = -1.3 in G space. Gutter base is at approx y=2.38 world
  // Downspout goes from gutter (y≈2.38) straight down to y≈1.26 (filter top)
  // All in G-space (G.position.y = 0.06)
  const DS_X = -1.25;  // just inside left column
  const DS_Z = -1.08;  // at front face, near column

  // Vertical section: gutter bottom down to elbow at filter top height
  const filterTopY = 1.28;   // filter top cap center
  const gutterBaseY = 2.32;  // where spout exits gutter

  // Straight vertical drop
  cyl(0.055, 0.055, gutterBaseY - filterTopY, 12, MAT.pipeWhite,
    DS_X, (gutterBaseY + filterTopY)/2, DS_Z,
    0, 0, 0, pipeParent);

  // Elbow at gutter connection (top of downspout)
  torus(0.06, 0.055, 10, MAT.pipeWhite,
    DS_X, gutterBaseY, DS_Z,
    0, Math.PI/2, 0, pipeParent);

  // Elbow at bottom (90° turn from vertical to horizontal, going inward toward filter)
  torus(0.07, 0.055, 10, MAT.pipeWhite,
    DS_X, filterTopY, DS_Z,
    0, 0, 0, pipeParent);

  // Horizontal section from elbow to filter top cap
  pipeCurve([
    new THREE.Vector3(DS_X,  filterTopY, DS_Z),
    new THREE.Vector3(-1.1,  filterTopY, -0.65),
    new THREE.Vector3(-1.1,  filterTopY, -0.44),
  ], 0.055, MAT.pipeWhite, pipeParent);

  // Pipe clamp on vertical downspout section
  torus(0.075, 0.018, 10, MAT.lightGray,
    DS_X, 1.85, DS_Z,
    Math.PI/2, 0, 0, pipeParent);
}

// ─── 3. BASE PLATFORM ────────────────────────────────────────────────────────
function buildBasePlatform(G) {
  // Main blue base box
  box(2.6, 0.28, 2.2, MAT.blueDark, 0, 0.14, 0, 0,0,0, G);
  // Top surface slightly lighter
  box(2.55, 0.02, 2.15, MAT.blueMetal, 0, 0.29, 0, 0,0,0, G);
  // Feet/leveling pads at corners
  [[-1.1,-0.85],[1.1,-0.85],[1.1,0.85],[-1.1,0.85]].forEach(([x,z]) => {
    cyl(0.07, 0.09, 0.08, 8, MAT.darkGray, x, 0, z, 0,0,0, G);
  });
}

// ─── 4. FRONT OUTPUT PANEL (USB ports, labels) ───────────────────────────────
function buildFrontOutputPanel(G) {
  // Dark panel face
  box(2.56, 0.27, 0.04, MAT.darkGray, 0, 0.135, -1.1, 0,0,0, G);

  // "5V DC OUTPUT" section label plate
  box(0.9, 0.16, 0.01, new THREE.MeshStandardMaterial({color:0x222222}), -0.55, 0.16, -1.12, 0,0,0, G);

  // USB ports (4 of them)
  for (let i=0; i<4; i++) {
    const ux = -0.78 + i*0.2;
    // port housing
    box(0.1, 0.08, 0.03, MAT.darkGray, ux, 0.14, -1.13, 0,0,0, G);
    // port opening (darker)
    box(0.06, 0.04, 0.02, new THREE.MeshStandardMaterial({color:0x000000}), ux, 0.14, -1.14, 0,0,0, G);
  }

  // Divider line
  box(0.01, 0.2, 0.02, MAT.lightGray, 0.05, 0.14, -1.12, 0,0,0, G);

  // Icon plates (water drop, lightning bolt, leaf) 
  const iconColors = [0x0066ff, 0xffdd00, 0x33cc44];
  const iconX = [0.3, 0.65, 1.0];
  iconColors.forEach((c, i) => {
    box(0.18, 0.15, 0.01, new THREE.MeshStandardMaterial({color:c, emissive:c, emissiveIntensity:0.2}), iconX[i], 0.14, -1.12, 0,0,0, G);
  });
}

// ─── 5. FILTRATION SYSTEM ────────────────────────────────────────────────────
// Filter sits on platform, pipe enters top cap from above, exits bottom toward turbine
function buildFilterSystem(G) {
  const fx=-1.1, fy=0.85, fz=-0.35;
  const fh=0.75;   // filter body height
  const fcr=0.145; // filter cap radius
  const fbr=0.13;  // filter body radius

  // ── Clear glass body ──
  cyl(fbr, fbr, fh, 28, MAT.glassFilter, fx, fy, fz, 0,0,0, G);

  // ── Top cap (dark blue, wide) ──
  cyl(fcr, fcr, 0.07, 24, MAT.blueDark, fx, fy + fh/2 + 0.035, fz, 0,0,0, G);
  // Top cap lip ring
  torus(fcr, 0.012, 18, MAT.blueMetal, fx, fy + fh/2 + 0.068, fz, 0,0,0, G);

  // ── Bottom cap (slightly tapered) ──
  cyl(fcr, fcr*0.85, 0.07, 24, MAT.blueDark, fx, fy - fh/2 - 0.035, fz, 0,0,0, G);
  // Bottom drain nipple pointing straight down
  cyl(0.04, 0.04, 0.12, 10, MAT.pipeWhite, fx, fy - fh/2 - 0.1, fz, 0,0,0, G);

  // ── Inlet nipple on top cap (pipe enters from above — vertical) ──
  // The horizontal pipe coming from downspout connects into the side of the top cap
  // Nipple pointing outward toward DS_Z direction (toward front-left)
  cyl(0.05, 0.05, 0.16, 10, MAT.pipeWhite,
    fx, fy + fh/2 + 0.07, fz,
    0,0,0, G); // this is the stub up from top — the pipe lands here from above

  // ── Internal filter element (visible through glass) ──
  cyl(0.07, 0.07, fh-0.08, 14,
    new THREE.MeshStandardMaterial({color:0x5588aa, wireframe:true}),
    fx, fy, fz, 0,0,0, G);

  // ── Sediment zone at bottom ──
  cyl(fbr-0.01, fbr-0.01, 0.12, 20,
    new THREE.MeshStandardMaterial({color:0x8a7a5a, transparent:true, opacity:0.65}),
    fx, fy - fh/2 + 0.07, fz, 0,0,0, G);

  // ── Support bracket to platform (two small arms) ──
  box(0.04, 0.18, 0.04, MAT.blueDark, fx-0.15, fy - fh/2 + 0.05, fz, 0,0,0.4, G);
  box(0.04, 0.18, 0.04, MAT.blueDark, fx+0.15, fy - fh/2 + 0.05, fz, 0,0,-0.4, G);
}

// ─── 6. PIPE NETWORK ─────────────────────────────────────────────────────────
// Accurate PVC pipe layout matching the real image:
//   - Downspout vertical → 90° elbow → horizontal into filter TOP
//   - Filter BOTTOM drain stub → 90° elbow → horizontal pipe → T-junction
//   - T-junction → into turbine LEFT inlet port
function buildPipeNetwork(G) {
  const pr   = 0.058;   // PVC pipe radius (thick white)
  const eR   = 0.09;    // elbow bend radius
  const pm   = MAT.pipeWhite;

  // ── Filter geometry reference points ──
  const fx = -1.1, fz = -0.35;
  const fh = 0.75, fcr = 0.145;
  const fTopY = 0.85 + fh/2 + 0.035 + 0.035;   // ≈ 1.258  (top cap top face)
  const fBotY = 0.85 - fh/2 - 0.035 - 0.035;   // ≈ 0.442  (bottom cap bottom face)

  // ── Turbine inlet position (left side) ──
  const tinX = -0.30, tinY = 0.72, tinZ = 0.05;

  // ═══ PIPE A: Filter bottom → 90° elbow → horizontal right → T-junction → turbine ═══

  // A1. Vertical stub DOWN from filter bottom cap
  const stubLen = 0.20;
  cyl(pr, pr, stubLen, 12, pm,
    fx, fBotY - stubLen/2, fz,
    0,0,0, G);

  // A2. 90° elbow at bottom of stub (bends toward turbine: Z+ direction)
  // Elbow center is at (fx, fBotY - stubLen - eR, fz)
  const elbowACenterY = fBotY - stubLen - eR;
  const elbowACenterZ = fz;
  pvcElbow(pr, eR, pm,
    fx, elbowACenterY, elbowACenterZ,
    0, Math.PI, 0, G);  // quarter torus bending from -Y to +Z

  // A3. Horizontal pipe from elbow toward turbine (going right in X, level with elbow exit)
  const horizY = fBotY - stubLen - eR;   // y of horizontal run
  const horizStartZ = fz + eR;            // z where elbow exits
  const horizEndX   = tinX;              // ends at turbine X

  // Goes from (fx, horizY, horizStartZ) to (tinX, tinY, fz) via slight curve
  pipeCurve([
    new THREE.Vector3(fx,      horizY,  horizStartZ),
    new THREE.Vector3(fx+0.15, horizY,  horizStartZ + 0.1),
    new THREE.Vector3(-0.7,    horizY,  fz + 0.15),
    new THREE.Vector3(-0.5,    horizY,  fz + 0.2),
    new THREE.Vector3(-0.35,   tinY,    fz + 0.25),
    new THREE.Vector3(tinX,    tinY,    tinZ),
  ], pr, pm, G);

  // A4. T-junction at the turbine inlet connection point
  pvcTee(pr, 0.22, 0.16, pm,
    tinX - 0.05, tinY, tinZ,
    0, 0, Math.PI/2, G);

  // ═══ PIPE B: Downspout vertical section ═══
  // This is built in buildRoof() — just add the pipe clamp here
  torus(0.078, 0.020, 12, MAT.blueDark,
    -1.25, 1.82, -1.08, Math.PI/2, 0, 0, G);

  // ═══ PIPE C: From filter top → rise → arc right → turbine top inlet ═══
  // (secondary feed pipe — the pipe visible going from filter top curving right)
  pipeCurve([
    new THREE.Vector3(fx,     fTopY + 0.05, fz),
    new THREE.Vector3(fx,     fTopY + 0.25, fz),
    new THREE.Vector3(fx+0.1, fTopY + 0.35, fz + 0.1),
    new THREE.Vector3(-0.55,  fTopY + 0.3,  0.0),
    new THREE.Vector3(-0.35,  1.1,           0.05),
    new THREE.Vector3(-0.28,  0.85,          0.05),
  ], pr, pm, G);

  // Collar rings at filter top pipe exit
  torus(pr+0.02, 0.022, 14, MAT.lightGray,
    fx, fTopY+0.05, fz, 0,0,0, G);
  // Collar ring at turbine
  torus(pr+0.02, 0.022, 14, MAT.lightGray,
    -0.28, 0.85, 0.05, Math.PI/4, 0, 0, G);
}

// ─── 7. MICROHYDRO TURBINE ───────────────────────────────────────────────────
// Matches image: blue cylinder body, circular front face with 10 dark blades, gold center hub
function buildTurbine(G) {
  const tx = 0.15, ty = 0.72, tz = 0.05;
  const tr = 0.32;   // turbine face radius
  const tl = 0.55;   // turbine body length (along X axis)

  // ── Main blue cylindrical housing ──
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(tr, tr, tl, 32),
    MAT.blueMetal
  );
  housing.rotation.z = Math.PI/2;
  housing.position.set(tx, ty, tz);
  housing.castShadow = true;
  G.add(housing);

  // ── Left face plate (the prominent circular disc facing viewer) ──
  cyl(tr+0.02, tr+0.02, 0.025, 32, MAT.blueDark,
    tx - tl/2 - 0.012, ty, tz, 0,0,Math.PI/2, G);

  // ── Right face plate ──
  cyl(tr+0.02, tr+0.02, 0.025, 32, MAT.blueDark,
    tx + tl/2 + 0.012, ty, tz, 0,0,Math.PI/2, G);

  // ── Bolts around face rim (8 evenly spaced) ──
  for (let i=0; i<8; i++) {
    const ang = (i/8)*Math.PI*2;
    const bx = tx - tl/2 - 0.025;
    const by = ty + Math.cos(ang)*(tr-0.04);
    const bz = tz + Math.sin(ang)*(tr-0.04);
    cyl(0.018, 0.018, 0.02, 6, MAT.silverMetal, bx, by, bz, 0,0,Math.PI/2, G);
  }

  // ── Turbine blade group (rotates) — 10 dark blades ──
  turbineBlades = new THREE.Group();
  turbineBlades.position.set(tx - tl/2 - 0.01, ty, tz);

  const numBlades = 10;
  for (let i=0; i<numBlades; i++) {
    const ang = (i/numBlades)*Math.PI*2;
    const bGroup = new THREE.Group();

    // Blade: tapered box, angled outward from center
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.22, 0.04),
      MAT.bladeDark
    );
    blade.position.y = (tr - 0.06) * 0.5;
    blade.rotation.x = 0.18;  // slight pitch angle
    bGroup.rotation.z = ang;
    bGroup.add(blade);
    turbineBlades.add(bGroup);
  }

  // Center hub (gold) — prominent gold disk
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.04, 20),
    MAT.chrome
  );
  hub.rotation.z = Math.PI/2;
  turbineBlades.add(hub);

  // Hub center bolt
  const hubBolt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.05, 8),
    MAT.silverMetal
  );
  hubBolt.rotation.z = Math.PI/2;
  hubBolt.position.x = -0.03;
  turbineBlades.add(hubBolt);

  G.add(turbineBlades);

  // ── Generator section (attached to right side) ──
  // Black cylindrical generator body
  cyl(tr*0.72, tr*0.72, 0.42, 28, MAT.darkGray,
    tx + tl/2 + 0.22, ty, tz, 0,0,Math.PI/2, G);
  // Generator end cap
  cyl(tr*0.72+0.01, tr*0.72+0.01, 0.025, 28, MAT.lightGray,
    tx + tl/2 + 0.44, ty, tz, 0,0,Math.PI/2, G);
  // Output shaft
  cyl(0.03, 0.03, 0.08, 8, MAT.silverMetal,
    tx + tl/2 + 0.46, ty, tz, 0,0,Math.PI/2, G);
  // Cooling fins (rings)
  for (let f=0; f<5; f++) {
    cyl(tr*0.74+0.01, tr*0.74+0.01, 0.018, 24, MAT.darkGray,
      tx + tl/2 + 0.06 + f*0.075, ty, tz, 0,0,Math.PI/2, G);
  }

  // ── Mounting base feet ──
  [[-0.15, -0.3],[0.2, -0.3],[0.55, -0.3]].forEach(([ox, oz]) => {
    box(0.1, 0.04, 0.16, MAT.blueDark, tx+ox, ty - tr - 0.02, tz+oz*0.1, 0,0,0, G);
    cyl(0.025,0.025,0.06,8, MAT.silverMetal, tx+ox-0.03, ty - tr - 0.06, tz+oz*0.1+0.04, 0,0,0, G);
    cyl(0.025,0.025,0.06,8, MAT.silverMetal, tx+ox+0.03, ty - tr - 0.06, tz+oz*0.1+0.04, 0,0,0, G);
  });

  // ── Turbine inlet port on left side (where pipe connects) ──
  cyl(0.065, 0.065, 0.12, 12, MAT.pipeWhite,
    tx - tl/2 - 0.08, ty + 0.15, tz, 0,0,0, G);
  torus(0.07, 0.018, 12, MAT.lightGray,
    tx - tl/2 - 0.02, ty + 0.15, tz, 0,0,0, G);
}

// ─── 8. CONTROL BOX ──────────────────────────────────────────────────────────
// Matches image: beige/gray steel enclosure, LCD screen top, 2 large green LEDs bottom
function buildControlBox(G) {
  const cx=0.72, cy=1.15, cz=-0.62;

  // ── Main enclosure — beige/gray like real image ──
  box(0.62, 0.80, 0.20, MAT.boxBeige, cx, cy, cz, 0,0,0, G);

  // ── Front door panel (slightly recessed lighter panel) ──
  box(0.57, 0.75, 0.015,
    new THREE.MeshStandardMaterial({color:0xccc5b0, roughness:0.45}),
    cx, cy, cz+0.1, 0,0,0, G);

  // ── Door hinge strip on left ──
  box(0.025, 0.72, 0.025, MAT.silverMetal, cx-0.305, cy, cz+0.09, 0,0,0, G);

  // ── Door latch on right side ──
  box(0.03, 0.08, 0.03, MAT.silverMetal, cx+0.31, cy+0.1, cz+0.09, 0,0,0, G);
  cyl(0.018,0.018,0.025,8, MAT.silverMetal, cx+0.315, cy+0.1, cz+0.112, Math.PI/2,0,0, G);

  // ── LCD Screen (top portion, with blue glow) ──
  // Black bezel
  box(0.38, 0.28, 0.018, MAT.black, cx+0.02, cy+0.2, cz+0.108, 0,0,0, G);
  // Screen face
  box(0.34, 0.24, 0.012, MAT.screen, cx+0.02, cy+0.2, cz+0.114, 0,0,0, G);
  // Screen data lines (cyan)
  const lineMat = new THREE.MeshStandardMaterial({color:0x00ffff, emissive:0x00cccc, emissiveIntensity:1.0});
  for (let i=0; i<4; i++) {
    box(0.24, 0.016, 0.002, lineMat, cx+0.02, cy+0.29-i*0.055, cz+0.122, 0,0,0, G);
  }
  // Small label/icon blocks on screen
  box(0.06, 0.04, 0.002,
    new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xffffff, emissiveIntensity:0.3}),
    cx-0.1, cy+0.145, cz+0.122, 0,0,0, G);

  // ── 2 large green indicator buttons (bottom left) ──
  // These are the prominent green circles in the image
  for (let i=0; i<2; i++) {
    // Button housing (round, protruding)
    cyl(0.038, 0.038, 0.022, 20, MAT.lightGray,
      cx - 0.12 + i*0.14, cy - 0.22, cz+0.108, Math.PI/2, 0, 0, G);
    // Green lens
    cyl(0.030, 0.030, 0.018, 20, MAT.greenBtn,
      cx - 0.12 + i*0.14, cy - 0.22, cz+0.118, Math.PI/2, 0, 0, G);
  }

  // ── Small red button (right of greens) ──
  cyl(0.030, 0.030, 0.020, 16, MAT.lightGray,
    cx + 0.08, cy - 0.22, cz+0.108, Math.PI/2, 0, 0, G);
  cyl(0.022, 0.022, 0.016, 16, MAT.redBtn,
    cx + 0.08, cy - 0.22, cz+0.118, Math.PI/2, 0, 0, G);

  // ── Label plate below LEDs ──
  box(0.35, 0.05, 0.005, new THREE.MeshStandardMaterial({color:0xaaa090}),
    cx, cy - 0.30, cz+0.108, 0,0,0, G);

  // ── Bottom cable entry glands (3 black circles) ──
  for (let i=0; i<3; i++) {
    cyl(0.025, 0.025, 0.05, 10, MAT.black,
      cx - 0.1 + i*0.1, cy - 0.46, cz, 0,0,0, G);
  }

  // ── Mounting bracket flanges on top ──
  box(0.08, 0.05, 0.06, MAT.silverMetal, cx-0.335, cy+0.41, cz-0.01, 0,0,0, G);
  box(0.08, 0.05, 0.06, MAT.silverMetal, cx+0.335, cy+0.41, cz-0.01, 0,0,0, G);
  // Flange bolts
  cyl(0.012,0.012,0.04,8,MAT.silverMetal, cx-0.335, cy+0.43, cz+0.02, Math.PI/2,0,0, G);
  cyl(0.012,0.012,0.04,8,MAT.silverMetal, cx+0.335, cy+0.43, cz+0.02, Math.PI/2,0,0, G);

  // ── Cable wiring harness going down to battery ──
  for (let i=0; i<3; i++) {
    pipeCurve([
      new THREE.Vector3(cx - 0.05 + i*0.05, cy - 0.46, cz),
      new THREE.Vector3(cx - 0.05 + i*0.05, cy - 0.60, cz+0.08),
      new THREE.Vector3(cx + 0.05 + i*0.04, cy - 0.68, cz+0.30),
      new THREE.Vector3(cx + 0.08 + i*0.04, cy - 0.68, cz+0.52),
    ], 0.014, new THREE.MeshStandardMaterial({color:0x111111, roughness:0.9}), G);
  }
}

// ─── 9. BATTERY ──────────────────────────────────────────────────────────────
function buildBattery(G) {
  const bx=0.7, by=0.55, bz=0.4;

  // Main battery box
  box(0.52, 0.38, 0.42, MAT.black, bx, by, bz, 0,0,0, G);

  // Label face
  box(0.50, 0.36, 0.01,
    new THREE.MeshStandardMaterial({color:0x1a1a1a, roughness:0.7}),
    bx, by, bz-0.215, 0,0,0, G);

  // Lightning bolt symbol (simplified)
  box(0.08, 0.22, 0.005,
    new THREE.MeshStandardMaterial({color:0xffffff, emissive:0xffffff, emissiveIntensity:0.5}),
    bx, by+0.01, bz-0.22, 0.0, 0.0, 0.25, G);

  // Positive terminal (red)
  cyl(0.028, 0.025, 0.05, 8, MAT.red, bx-0.1, by+0.23, bz, 0,0,0, G);
  cyl(0.038, 0.038, 0.01, 8, MAT.red, bx-0.1, by+0.26, bz, 0,0,0, G);

  // Negative terminal (black/gray)
  cyl(0.028, 0.025, 0.05, 8, MAT.darkGray, bx+0.1, by+0.23, bz, 0,0,0, G);
  cyl(0.038, 0.038, 0.01, 8, MAT.darkGray, bx+0.1, by+0.26, bz, 0,0,0, G);

  // Connecting cables
  pipeCurve([
    new THREE.Vector3(bx-0.1, by+0.26, bz),
    new THREE.Vector3(bx-0.2, by+0.4, bz-0.15),
  ], 0.02, MAT.red, G);
  pipeCurve([
    new THREE.Vector3(bx+0.1, by+0.26, bz),
    new THREE.Vector3(bx+0.2, by+0.4, bz-0.15),
  ], 0.02, MAT.black, G);

  // Vent slots on top
  for (let i=0; i<4; i++) {
    box(0.06, 0.01, 0.32, new THREE.MeshStandardMaterial({color:0x000000}), bx-0.18+i*0.12, by+0.195, bz, 0,0,0, G);
  }
}

// ─── 10. SIGN PANEL (HydroSpark banner) ──────────────────────────────────────
function buildSignPanel(G) {
  // White sign board mounted on front frame top
  box(2.3, 0.5, 0.06, MAT.signWhite, 0, 2.1, -1.0, 0,0,0, G);
  // Blue border
  box(2.34, 0.54, 0.04, MAT.blueMetal, 0, 2.1, -0.99, 0,0,0, G);
  // White face over border
  box(2.3, 0.50, 0.045, MAT.signWhite, 0, 2.1, -0.98, 0,0,0, G);

  // "HYDROSPARK" text bar (blue text representation)
  box(0.95, 0.14, 0.01,
    new THREE.MeshStandardMaterial({color:0x1a3a8f, emissive:0x0a1a4f, emissiveIntensity:0.3}),
    0.15, 2.18, -0.955, 0,0,0, G);

  // Gear icon (circle with teeth approximation)
  torus(0.08, 0.025, 16, MAT.blueMetal, -0.88, 2.16, -0.955, Math.PI/2, 0, 0, G);
  cyl(0.05, 0.05, 0.015, 16, MAT.blueDark, -0.88, 2.16, -0.95, 0,0,0, G);

  // Water droplet (teardrop shape approximated)
  cyl(0.055, 0.02, 0.1, 12, new THREE.MeshStandardMaterial({color:0x0088ff, emissive:0x0044aa}),
    -0.72, 2.18, -0.955, -0.3, 0, 0, G);

  // Subtitle text bar
  box(1.5, 0.08, 0.01,
    new THREE.MeshStandardMaterial({color:0x444444}),
    0.05, 2.06, -0.955, 0,0,0, G);

  // School crest circle
  cyl(0.1, 0.1, 0.015, 24,
    new THREE.MeshStandardMaterial({color:0x1a3a8f, metalness:0.5}),
    0.92, 2.14, -0.955, Math.PI/2, 0, 0, G);
  cyl(0.07, 0.07, 0.02, 24,
    new THREE.MeshStandardMaterial({color:0xffffff}),
    0.92, 2.14, -0.95, Math.PI/2, 0, 0, G);
}

// ─── 11. WATER PARTICLES ─────────────────────────────────────────────────────
function buildWaterParticles(G) {
  const particleGeo = new THREE.SphereGeometry(0.018, 6, 6);
  const particleMat = new THREE.MeshStandardMaterial({
    color:0x44aaff, transparent:true, opacity:0.75, roughness:0.1
  });
  for (let i=0; i<18; i++) {
    const p = new THREE.Mesh(particleGeo, particleMat);
    p.userData.speed = 0.012 + Math.random()*0.01;
    p.userData.t = Math.random();
    p.userData.offset = Math.random()*0.06-0.03;
    G.add(p);
    waterParticles.push(p);
  }
}

// ─── EXPLODE SYSTEM ──────────────────────────────────────────────────────────
const EXPLODE_LABELS = {
  roof:    { text: '① Rainwater Collection', desc: 'Solar roof + gutter downspout' },
  filter:  { text: '② Filtration System',    desc: 'Clear housing, mesh filter' },
  pipes:   { text: '③ PVC Pipe Network',     desc: 'Elbows, T-joints, flow routing' },
  turbine: { text: '④ Microhydro Turbine',   desc: '10-blade impeller + generator' },
  control: { text: '⑤ Smart Control Unit',   desc: 'LCD monitor, LED indicators' },
  battery: { text: '⑥ Energy Storage',       desc: '12V battery, terminals' },
  output:  { text: '⑦ Smart Output',         desc: '5V DC USB charging ports' },
  sign:    { text: '⑧ Sign Panel',           desc: 'HydroSpark identity board' },
};

function createExplodeLabels() {
  const overlay = document.getElementById('label-overlay');
  Object.keys(EXPLODE_LABELS).forEach(name => {
    const d = document.createElement('div');
    d.className = 'exp-label';
    d.id = 'lbl_' + name;
    d.innerHTML = `<strong>${EXPLODE_LABELS[name].text}</strong><br><span style="font-size:9px;color:#7abaff;font-weight:400">${EXPLODE_LABELS[name].desc}</span>`;
    overlay.appendChild(d);
    labelElements[name] = d;
  });
}

function updateExplodeLabels() {
  if (!isExploded && explodeProgress < 0.05) {
    Object.values(labelElements).forEach(el => el.style.opacity = 0);
    return;
  }
  Object.keys(componentGroups).forEach(name => {
    const g   = componentGroups[name];
    const el  = labelElements[name];
    if (!el) return;

    // Project 3D position to screen
    const pos = new THREE.Vector3();
    g.getWorldPosition(pos);
    pos.y += 0.3;
    const projected = pos.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    if (projected.z < 1) {
      el.style.left = x + 'px';
      el.style.top  = y + 'px';
      el.style.opacity = explodeProgress.toFixed(2);
    } else {
      el.style.opacity = 0;
    }
  });
}

function toggleExplode() {
  isExploded = !isExploded;
  explodeTarget = isExploded ? 1 : 0;
  const btn = document.getElementById('explode-btn');
  btn.classList.toggle('active', isExploded);
  const svg = btn.querySelector('svg').outerHTML;
  btn.innerHTML = svg + (isExploded ? ' Assemble' : ' Explode View');
  btn.onclick = toggleExplode;
  document.body.classList.toggle('exploded', isExploded);
}

function toggleAnimation() {
  animationActive = !animationActive;
  const btn = document.getElementById('anim-btn');
  btn.classList.toggle('active', !animationActive);
  // rebuild button preserving SVG
  const svg = btn.querySelector('svg').outerHTML;
  btn.innerHTML = svg + (animationActive ? ' ⏸ Pause' : ' ▶ Play');
  btn.onclick = toggleAnimation;
}

function toggleWireframe() {
  isWireframe = !isWireframe;
  document.getElementById('wire-btn').classList.toggle('active', isWireframe);
  allMeshes.forEach(m => {
    if (m.material) {
      if (Array.isArray(m.material)) m.material.forEach(mat => mat.wireframe = isWireframe);
      else m.material.wireframe = isWireframe;
    }
  });
}

function resetCamera() {
  camera.position.set(4.5, 3.5, 5.5);
  controls.target.set(0, 1.2, 0);
  controls.update();
  // also de-highlight
  document.querySelectorAll('.comp-item').forEach(el => el.classList.remove('active'));
}

const FOCUS_POSITIONS = {
  roof:    { pos: [0, 5, 4],    target: [0, 3, 0] },
  filter:  { pos: [-3, 2, 3],   target: [-1.1, 0.85, -0.35] },
  pipes:   { pos: [-1, 2.5, 4], target: [-0.5, 1, 0] },
  turbine: { pos: [2, 1.5, 4],  target: [0.15, 0.72, 0.05] },
  control: { pos: [2, 2, -1],   target: [0.72, 1.15, -0.62] },
  battery: { pos: [2, 1.5, 2],  target: [0.7, 0.55, 0.4] },
  output:  { pos: [0, 1, -4],   target: [0, 0.14, -1.1] },
  sign:    { pos: [0, 3, -4],   target: [0, 2.1, -1.0] },
};

function focusComponent(name, el) {
  document.querySelectorAll('.comp-item').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  const f = FOCUS_POSITIONS[name];
  if (!f) return;
  // Lerp camera smoothly
  const startPos = camera.position.clone();
  const startTgt = controls.target.clone();
  const endPos   = new THREE.Vector3(...f.pos);
  const endTgt   = new THREE.Vector3(...f.target);
  let t = 0;
  function lerpCam() {
    t += 0.04;
    camera.position.lerpVectors(startPos, endPos, Math.min(t, 1));
    controls.target.lerpVectors(startTgt, endTgt, Math.min(t, 1));
    controls.update();
    if (t < 1) requestAnimationFrame(lerpCam);
  }
  lerpCam();
}

// ─── ANIMATION LOOP ──────────────────────────────────────────────────────────
const waterPath = [
  new THREE.Vector3(-1.25, 2.32, -1.08),
  new THREE.Vector3(-1.25, 2.05, -1.08),
  new THREE.Vector3(-1.25, 1.75, -1.08),
  new THREE.Vector3(-1.25, 1.45, -1.08),
  new THREE.Vector3(-1.1,  1.28, -0.65),
  new THREE.Vector3(-1.1,  1.28, -0.44),
  new THREE.Vector3(-1.1,  1.37, -0.35),
  new THREE.Vector3(-1.1,  1.60, -0.35),
  new THREE.Vector3(-0.6,  1.55,  0.0),
  new THREE.Vector3(-0.38, 1.15,  0.05),
  new THREE.Vector3(-0.28, 0.85,  0.05),
];
const pathCurve = new THREE.CatmullRomCurve3(waterPath);

function animateParticles() {
  waterParticles.forEach(p => {
    p.userData.t += p.userData.speed * 0.016;
    if (p.userData.t > 1) p.userData.t -= 1;
    const pos = pathCurve.getPoint(p.userData.t);
    p.position.copy(pos);
    p.position.x += p.userData.offset;
    const fade = Math.min(p.userData.t * 8, (1-p.userData.t)*8, 1);
    p.material.opacity = 0.55 * fade * (animationActive ? 1 : 0.3);
  });
}

function animate() {
  requestAnimationFrame(animate);

  // Animate turbine blades
  if (animationActive && turbineBlades) {
    turbineBlades.rotation.x += 0.06;
  }

  // Animate water particles
  if (animationActive) animateParticles();

  // Subtle screen flicker
  if (animationActive && Math.random() > 0.98) {
    MAT.screen.emissiveIntensity = 0.5 + Math.random()*0.5;
  }

  // ── Explode animation ──
  const speed = 0.025;
  if (explodeProgress !== explodeTarget) {
    explodeProgress += (explodeTarget - explodeProgress) * speed * 3;
    if (Math.abs(explodeProgress - explodeTarget) < 0.001) explodeProgress = explodeTarget;

    Object.values(componentGroups).forEach(g => {
      const ofs = g.userData.explodeOfs;
      g.position.set(
        ofs.x * explodeProgress,
        ofs.y * explodeProgress,
        ofs.z * explodeProgress
      );
    });
  }

  updateExplodeLabels();
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// ─── START ────────────────────────────────────────────────────────────────────
init();
