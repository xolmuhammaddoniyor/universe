import * as THREE from "three";

/* =========================================================
   CONFIGURATION — edit these for your gift
   ========================================================= */
const CONFIG = {
  PASSWORD: "18.10.2007", // change this before sending the link
  FRIEND_NAME: "XADICHA", // e.g. "Malika" — left blank until you provide it
  BIRTHDAY_AGE: "", // e.g. "24" — leave blank to hide the age entirely
  PERSONAL_MESSAGE_SIGNOFF: "Happy Birthday!",
};

const PREFERS_REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const IS_MOBILE = window.matchMedia("(max-width: 768px)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
const LOW_POWER = IS_MOBILE || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

/* =========================================================
   PASSWORD GATE
   ========================================================= */
const gate = document.getElementById("gate");
const gateForm = document.getElementById("gate-form");
const gateInput = document.getElementById("gate-password");
const gateError = document.getElementById("gate-error");
const gateEye = document.getElementById("gate-toggle-eye");
const experience = document.getElementById("experience");

gateEye.addEventListener("click", () => {
  const show = gateInput.type === "password";
  gateInput.type = show ? "text" : "password";
  gateEye.setAttribute("aria-label", show ? "Hide password" : "Show password");
});

gateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (gateInput.value.trim().toLowerCase() === CONFIG.PASSWORD.trim().toLowerCase()) {
    gate.classList.add("gate-hidden");
    experience.hidden = false;
    document.body.style.overflow = "hidden";
    setTimeout(initExperience, 300);
    gateForm.removeEventListener("submit", () => {});
  } else {
    gateError.textContent = "That's not quite it — try again.";
    gateError.classList.add("show");
    gateInput.classList.add("shake");
    setTimeout(() => gateError.classList.remove("show"), 2200);
  }
});

drawGateStars();
function drawGateStars() {
  const canvas = document.getElementById("gate-stars");
  const ctx = canvas.getContext("2d");
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);
  const stars = Array.from({ length: 180 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.2 + 0.2,
    tw: Math.random() * Math.PI * 2,
  }));
  let raf;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of stars) {
      s.tw += 0.02;
      const a = 0.4 + Math.sin(s.tw) * 0.35;
      ctx.beginPath();
      ctx.fillStyle = `rgba(247,231,176,${Math.max(0, a)})`;
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(draw);
  }
  draw();
  document.getElementById("gate").addEventListener("transitionend", () => {
    if (gate.classList.contains("gate-hidden")) cancelAnimationFrame(raf);
  });
}

/* =========================================================
   MAIN EXPERIENCE
   ========================================================= */
let scene, camera, renderer, canvas;
let planetGroup, starField;
let raycaster, pointer;
let wordSprites = [];
let dustParticles;
let introDone = false;
let autoRotate = true;
let rotationVelocity = { x: 0, y: 0.0009 };
let drag = { active: false, lastX: 0, lastY: 0, moved: 0 };
let introStart = 0;
let cameraTargetZ = 11;
let cameraZ = PREFERS_REDUCED_MOTION ? 11 : 55;
let sceneOpacity = PREFERS_REDUCED_MOTION ? 1 : 0;
let initialized = false;

function initExperience() {
  if (initialized) return;
  initialized = true;

  canvas = document.getElementById("scene");

  let gl;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    gl = renderer.getContext();
    if (!gl) throw new Error("no webgl");
  } catch (err) {
    showFallback();
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LOW_POWER ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x020204, 1);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 0, cameraZ);

  raycaster = new THREE.Raycaster();
  raycaster.params.Sprite = { threshold: 0.3 };
  pointer = new THREE.Vector2(10, 10);

  buildStarfield();
  buildCore();
  planetGroup = new THREE.Group();
  scene.add(planetGroup);
  buildWordRings();
  buildDust();

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    cancelAnimationFrame(rafId);
  });
  canvas.addEventListener("webglcontextrestored", () => {
    animate();
  });

  bindInteraction();
  bindUI();

  window.addEventListener("resize", onResize);

  introStart = performance.now();
  document.getElementById("loading-overlay").classList.add("hide");
  animate();
}

function showFallback() {
  document.getElementById("loading-overlay").classList.add("hide");
  const fb = document.getElementById("webgl-fallback");
  fb.hidden = false;
  const list = document.getElementById("fallback-list");
  list.innerHTML = GREETINGS.map(
    (g) => `<div><strong style="color:#D4AF37">${g.lang}:</strong> <span dir="auto">${g.greeting}</span></div>`
  ).join("");
}

/* ---------- starfield & core ---------- */

function buildStarfield() {
  const count = LOW_POWER ? 1400 : 3200;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 60 + Math.random() * 180;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = Math.random() * 1.6 + 0.3;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
  const mat = new THREE.PointsMaterial({
    color: 0xc7cbd4,
    size: 0.6,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  starField = new THREE.Points(geo, mat);
  scene.add(starField);
}

function buildCore() {
  const voidGeo = new THREE.SphereGeometry(2.1, 48, 48);
  const voidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
  const voidSphere = new THREE.Mesh(voidGeo, voidMat);
  scene.add(voidSphere);

  // soft golden glow rim around the void, via an additive backside sprite
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 256;
  glowCanvas.height = 256;
  const gctx = glowCanvas.getContext("2d");
  const grad = gctx.createRadialGradient(128, 128, 60, 128, 128, 128);
  grad.addColorStop(0, "rgba(212,175,55,0.55)");
  grad.addColorStop(0.5, "rgba(212,175,55,0.15)");
  grad.addColorStop(1, "rgba(212,175,55,0)");
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 256, 256);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(7.5, 7.5, 1);
  scene.add(glow);
}

/* ---------- text sprites ---------- */

function makeTextTexture(str, rtl, options = {}) {
  const { fontSize = 64, pad = 28, glow = true } = options;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = `${fontSize}px "Segoe UI", "Noto Sans", sans-serif`;
  const metrics = ctx.measureText(str);
  const w = Math.ceil(metrics.width) + pad * 2;
  const h = Math.ceil(fontSize * 1.5) + pad;
  canvas.width = w;
  canvas.height = h;

  ctx.font = `${fontSize}px "Segoe UI", "Noto Sans", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.direction = rtl ? "rtl" : "ltr";

  if (glow) {
    ctx.shadowColor = "rgba(212,175,55,0.9)";
    ctx.shadowBlur = fontSize * 0.35;
  }
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, "#F7E7B0");
  grad.addColorStop(1, "#D4AF37");
  ctx.fillStyle = grad;
  ctx.fillText(str, w / 2, h / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return { tex, aspect: w / h };
}

const textureCache = new Map();
function getTexture(str, rtl, fontSize) {
  const key = str + "|" + fontSize;
  if (!textureCache.has(key)) textureCache.set(key, makeTextTexture(str, rtl, { fontSize }));
  return textureCache.get(key);
}

function buildWordRings() {
  const replication = LOW_POWER ? 3 : 5;
  const ringDefs = [
    { radiusMin: 2.6, radiusMax: 3.4, tilt: 0.08, speed: 1.0, fontSize: 40, baseScale: 0.2, count: replication * 0.3 },
    { radiusMin: 4.0, radiusMax: 5.2, tilt: 0.42, speed: 0.6, fontSize: 56, baseScale: 0.28, count: replication * 0.45 },
    { radiusMin: 5.6, radiusMax: 7.0, tilt: -0.3, speed: 0.4, fontSize: 60, baseScale: 0.34, count: replication * 0.45 },
    { radiusMin: 7.4, radiusMax: 9.2, tilt: 0.65, speed: 0.25, fontSize: 52, baseScale: 0.3, count: replication * 0.5 },
  ];
  const haloCount = LOW_POWER ? 110 : 220;

  ringDefs.forEach((ring, ringIndex) => {
    const spriteCount = Math.round(replicationCountFor(ring, replication));
    for (let i = 0; i < spriteCount; i++) {
      const g = GREETINGS[i % GREETINGS.length];
      const { tex, aspect } = getTexture(g.greeting, g.rtl, ring.fontSize);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(mat);
      const scale = ring.baseScale * (0.85 + Math.random() * 0.3);
      sprite.scale.set(scale * aspect, scale, 1);

      const radius = ring.radiusMin + Math.random() * (ring.radiusMax - ring.radiusMin);
      const angle = Math.random() * Math.PI * 2;
      sprite.userData = {
        langIndex: i % GREETINGS.length,
        radius,
        angle,
        tilt: ring.tilt + (Math.random() - 0.5) * 0.12,
        speed: ring.speed * (0.8 + Math.random() * 0.4) * (Math.random() < 0.5 ? 1 : -1) * 0.15,
        verticalOffset: (Math.random() - 0.5) * 0.4,
        baseOpacity: 0.55 + Math.random() * 0.4,
        baseScale: scale * aspect,
        baseScaleY: scale,
        targetScaleMul: 1,
        currentScaleMul: 1,
        pullOffset: new THREE.Vector3(),
        ring: ringIndex,
      };
      positionWordSprite(sprite);
      planetGroup.add(sprite);
      wordSprites.push(sprite);
      sprite.material.opacity = 0;
    }
  });

  // spherical halo of smaller, dimmer wishes
  for (let i = 0; i < haloCount; i++) {
    const g = GREETINGS[i % GREETINGS.length];
    const { tex, aspect } = getTexture(g.greeting, g.rtl, 34);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 });
    const sprite = new THREE.Sprite(mat);
    const scale = 0.26 * (0.7 + Math.random() * 0.5);
    sprite.scale.set(scale * aspect, scale, 1);
    const radius = 10 + Math.random() * 4.5;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    sprite.userData = {
      langIndex: i % GREETINGS.length,
      radius,
      angle: theta,
      phi,
      tilt: 0,
      speed: 0.02 * (Math.random() < 0.5 ? 1 : -1),
      halo: true,
      baseOpacity: 0.25 + Math.random() * 0.25,
      baseScale: scale * aspect,
      baseScaleY: scale,
      targetScaleMul: 1,
      currentScaleMul: 1,
      pullOffset: new THREE.Vector3(),
    };
    positionHaloSprite(sprite);
    planetGroup.add(sprite);
    wordSprites.push(sprite);
    sprite.material.opacity = 0;
  }
}

function replicationCountFor(ring, replication) {
  return Math.round(GREETINGS.length * (ring.count / replication));
}

function positionWordSprite(sprite) {
  const u = sprite.userData;
  const x = Math.cos(u.angle) * u.radius;
  const z = Math.sin(u.angle) * u.radius;
  const y = u.verticalOffset + Math.sin(u.angle * 2) * 0.15;
  sprite.position.set(x, y, z);
  sprite.position.applyAxisAngle(new THREE.Vector3(1, 0, 0), u.tilt);
}

function positionHaloSprite(sprite) {
  const u = sprite.userData;
  const x = u.radius * Math.sin(u.phi) * Math.cos(u.angle);
  const y = u.radius * Math.cos(u.phi) * 0.6;
  const z = u.radius * Math.sin(u.phi) * Math.sin(u.angle);
  sprite.position.set(x, y, z);
}

function buildDust() {
  const count = LOW_POWER ? 200 : 450;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = 3 + Math.random() * 7;
    const theta = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * 2;
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xf7e7b0,
    size: 0.045,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  dustParticles = new THREE.Points(geo, mat);
  dustParticles.userData.baseOpacity = 0.5;
  scene.add(dustParticles);
}

/* ---------- interaction: drag, zoom, lens, click ---------- */

function bindInteraction() {
  canvas.addEventListener("pointerdown", (e) => {
    drag.active = true;
    drag.lastX = e.clientX;
    drag.lastY = e.clientY;
    drag.moved = 0;
  });
  window.addEventListener("pointerup", (e) => {
    if (drag.active && drag.moved < 6) handleClick(e);
    drag.active = false;
  });
  window.addEventListener("pointermove", (e) => {
    updatePointer(e.clientX, e.clientY);
    if (drag.active) {
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      rotationVelocity.y = dx * 0.0006;
      rotationVelocity.x = dy * 0.0006;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
    }
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      cameraTargetZ = THREE.MathUtils.clamp(cameraTargetZ + e.deltaY * 0.0065, 4, 24);
    },
    { passive: false }
  );

  // touch pinch zoom
  let pinchDist = null;
  canvas.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (pinchDist != null) {
          cameraTargetZ = THREE.MathUtils.clamp(cameraTargetZ - (dist - pinchDist) * 0.03, 4, 24);
        }
        pinchDist = dist;
      }
    },
    { passive: true }
  );
  canvas.addEventListener("touchend", () => (pinchDist = null));
}

function updatePointer(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(clientY / window.innerHeight) * 2 + 1;
}

function handleClick(e) {
  if (!introDone) return;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(wordSprites.filter((s) => s.material.opacity > 0.05));
  if (hits.length) openInfoPanel(hits[0].object.userData.langIndex);
}

function openInfoPanel(langIndex) {
  const g = GREETINGS[langIndex];
  document.getElementById("info-lang").textContent = g.lang;
  document.getElementById("info-native").textContent = g.native;
  document.getElementById("info-greeting").textContent = g.greeting;
  document.getElementById("info-meaning").textContent = "English: " + g.meaning;
  document.getElementById("info-panel").hidden = false;
}

/* ---------- UI bindings ---------- */

function bindUI() {
  document.getElementById("info-close").addEventListener("click", () => {
    document.getElementById("info-panel").hidden = true;
  });

  document.getElementById("skip-intro").addEventListener("click", () => {
    introStart = -99999;
  });

  const btnRotate = document.getElementById("btn-rotate");
  btnRotate.addEventListener("click", () => {
    autoRotate = !autoRotate;
    btnRotate.setAttribute("aria-pressed", String(autoRotate));
  });

  document.getElementById("btn-recenter").addEventListener("click", () => {
    cameraTargetZ = 11;
    planetGroup.rotation.set(0, planetGroup.rotation.y, 0);
  });

  const btnFs = document.getElementById("btn-fullscreen");
  btnFs.addEventListener("click", () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  const audio = document.getElementById("bg-audio");
  const btnSound = document.getElementById("btn-sound");
  let audioCtx, analyser, source, vizData;
  let audioReady = false;
  let seeked = false;
  audio.addEventListener("loadedmetadata", () => {
    if (!seeked) {
      audio.currentTime = 3;
      seeked = true;
    }
  });

  function setupAudioGraph() {
    if (audioReady) return;
    audioReady = true;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      source = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      vizData = new Uint8Array(analyser.frequencyBinCount);
      source.connect(analyser);
      analyser.connect(audioCtx.destination);
    } catch (err) {
      /* visualizer optional */
    }
  }

  btnSound.addEventListener("click", () => {
    const playing = !audio.paused;
    if (playing) {
      audio.pause();
      btnSound.setAttribute("aria-pressed", "false");
    } else {
      setupAudioGraph();
      if (!seeked && audio.readyState >= 1) {
        audio.currentTime = 3;
        seeked = true;
      }
      audio.play().catch(() => {});
      btnSound.setAttribute("aria-pressed", "true");
    }
  });

  document.getElementById("music-volume").addEventListener("input", (e) => {
    audio.volume = parseFloat(e.target.value);
  });
  audio.volume = 0.4;

  const vizCanvas = document.getElementById("music-visualizer");
  const vctx = vizCanvas.getContext("2d");
  function drawViz() {
    vctx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);
    if (analyser && !audio.paused) {
      analyser.getByteFrequencyData(vizData);
      const barW = vizCanvas.width / vizData.length;
      for (let i = 0; i < vizData.length; i++) {
        const h = (vizData[i] / 255) * vizCanvas.height;
        vctx.fillStyle = "#D4AF37";
        vctx.fillRect(i * barW, vizCanvas.height - h, barW * 0.7, h);
      }
    } else {
      vctx.strokeStyle = "rgba(212,175,55,0.4)";
      vctx.beginPath();
      vctx.moveTo(0, vizCanvas.height / 2);
      vctx.lineTo(vizCanvas.width, vizCanvas.height / 2);
      vctx.stroke();
    }
    requestAnimationFrame(drawViz);
  }
  drawViz();

  document.getElementById("personal-close").addEventListener("click", () => {
    document.getElementById("personal-message").classList.remove("show");
    setTimeout(() => (document.getElementById("personal-message").hidden = true), 700);
  });
}

function showPersonalMessage() {
  if (CONFIG.FRIEND_NAME) {
    const title = CONFIG.BIRTHDAY_AGE
      ? `Happy ${CONFIG.BIRTHDAY_AGE}th Birthday, ${CONFIG.FRIEND_NAME}!`
      : `Happy Birthday, ${CONFIG.FRIEND_NAME}!`;
    document.getElementById("personal-name-line").textContent = title;
  } else {
    document.getElementById("personal-name-line").textContent = CONFIG.PERSONAL_MESSAGE_SIGNOFF;
  }
  const el = document.getElementById("personal-message");
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("show"));
}

/* ---------- resize ---------- */

function onResize() {
  if (!renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

/* ---------- animation loop ---------- */

let rafId;
function animate() {
  rafId = requestAnimationFrame(animate);
  const now = performance.now();
  const elapsed = (now - introStart) / 1000;

  runIntro(elapsed);

  // inertial rotation
  if (!drag.active) {
    rotationVelocity.x *= 0.92;
    rotationVelocity.y *= 0.92;
    if (autoRotate && Math.abs(rotationVelocity.y) < 0.00035) rotationVelocity.y = 0.0007;
  }
  planetGroup.rotation.y += rotationVelocity.y;
  planetGroup.rotation.x = THREE.MathUtils.clamp(planetGroup.rotation.x + rotationVelocity.x, -0.6, 0.6);

  cameraZ += (cameraTargetZ - cameraZ) * 0.06;
  camera.position.z = cameraZ;
  camera.position.x += (pointer.x * 0.25 - camera.position.x) * 0.02;
  camera.position.y += (-pointer.y * 0.15 - camera.position.y) * 0.02;
  camera.lookAt(0, 0, 0);

  updateLensEffect();

  if (dustParticles) dustParticles.rotation.y += 0.0004;

  renderer.render(scene, camera);
}

function runIntro(elapsed) {
  if (introDone) return;
  const duration = 5.5;
  const t = PREFERS_REDUCED_MOTION ? 1 : THREE.MathUtils.clamp(elapsed / duration, 0, 1);
  const eased = easeOutCubic(t);

  cameraTargetZ = THREE.MathUtils.lerp(55, 11, eased);
  cameraZ = cameraTargetZ;
  camera.position.z = cameraZ;

  sceneOpacity = eased;
  for (const s of wordSprites) {
    const u = s.userData;
    s.material.opacity = (u.halo ? u.baseOpacity * 0.8 : u.baseOpacity) * sceneOpacity;
  }
  if (dustParticles) dustParticles.material.opacity = dustParticles.userData.baseOpacity * sceneOpacity;
  starField.material.opacity = 0.3 + 0.45 * sceneOpacity;

  const skipBtn = document.getElementById("skip-intro");
  if (t >= 1) {
    introDone = true;
    skipBtn.classList.add("hide");
    document.getElementById("hud-hint").classList.remove("hide");
    setTimeout(() => document.getElementById("hud-hint").classList.add("hide"), 5000);
    setTimeout(showPersonalMessage, 2600);
  } else if (t > 0.05) {
    skipBtn.classList.remove("hide");
  }
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function updateLensEffect() {
  const lensRadiusPx = IS_MOBILE ? 90 : 140;
  const vector = new THREE.Vector3();
  const halfW = window.innerWidth / 2;
  const halfH = window.innerHeight / 2;
  const hasPointer = pointer.x > -2 && pointer.x < 2;

  for (const s of wordSprites) {
    const u = s.userData;
    vector.copy(s.position).applyMatrix4(planetGroup.matrixWorld).project(camera);
    const sx = vector.x * halfW + halfW;
    const sy = -vector.y * halfH + halfH;
    const pxX = (pointer.x * halfW) + halfW;
    const pxY = (-pointer.y * halfH) + halfH;
    const dist = hasPointer ? Math.hypot(sx - pxX, sy - pxY) : 9999;

    let targetMul = 1;
    let pull = 0;
    if (dist < lensRadiusPx && vector.z < 1) {
      const falloff = 1 - dist / lensRadiusPx;
      targetMul = 1 + falloff * 1.6;
      pull = falloff * 0.12;
    }
    u.currentScaleMul += (targetMul - u.currentScaleMul) * 0.18;

    const scaleMul = u.currentScaleMul;
    s.scale.set(u.baseScale * scaleMul, u.baseScaleY * scaleMul, 1);

    const brightness = 1 + (scaleMul - 1) * 0.25;
    s.material.opacity = Math.min(1, (u.halo ? u.baseOpacity * 0.8 : u.baseOpacity) * sceneOpacity * brightness);

    if (pull > 0) {
      const dir = new THREE.Vector3(pxX - sx, -(pxY - sy), 0).normalize();
      u.pullOffset.lerp(new THREE.Vector3(dir.x * pull, dir.y * pull, 0), 0.3);
    } else {
      u.pullOffset.lerp(new THREE.Vector3(0, 0, 0), 0.2);
    }
  }

  // advance orbital motion
  for (const s of wordSprites) {
    const u = s.userData;
    u.angle += u.speed * 0.01;
    if (u.halo) positionHaloSprite(s);
    else positionWordSprite(s);
    s.position.x += u.pullOffset.x;
    s.position.y += u.pullOffset.y;
  }
}
