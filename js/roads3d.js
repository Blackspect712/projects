/* Meridian Planning — 3D background: a dirty street transforming into a clean, green street.
   Loaded after three.js. Finds the first [data-roads3d] host on the page and runs the scene in it. */
(function () {
  "use strict";

  var host = document.querySelector("[data-roads3d]");
  if (!host) return;

  if (typeof THREE === "undefined") {
    host.classList.add("no-3d");
    return;
  }

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------- renderer / scene / camera ---------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    host.classList.add("no-3d");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  host.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, host.clientWidth / Math.max(host.clientHeight, 1), 0.1, 400);
  camera.position.set(0, 3.2, 26);
  camera.lookAt(0, 2.2, -40);

  /* ---------- palettes (dirty → clean) ---------- */
  var C_SKY_OLD = new THREE.Color(0xb9a98c);   // hazy dust sky
  var C_SKY_NEW = new THREE.Color(0xcfe8f5);   // clear blue
  var C_FOG_OLD = new THREE.Color(0xcbbda3);
  var C_FOG_NEW = new THREE.Color(0xdff0f8);
  var C_GND_OLD = new THREE.Color(0xa08b6a);   // dusty earth
  var C_GND_NEW = new THREE.Color(0x7fbf7a);   // green verges
  var C_ROAD_OLD = new THREE.Color(0x8a7f6d);   // broken mud-track road
  var C_ROAD_NEW = new THREE.Color(0x3a3d42);   // fresh asphalt
  var C_BUILD_OLD = new THREE.Color(0xa5967f);  // grimy concrete
  var C_BUILD_NEW = new THREE.Color(0xf2f4f7);  // clean white

  var skyColor = C_SKY_OLD.clone();
  var fogColor = C_FOG_OLD.clone();
  scene.fog = new THREE.Fog(fogColor, 30, 150);

  var hemi = new THREE.HemisphereLight(0xffffff, 0x777766, 0.9);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xfff3dd, 0.9);
  sun.position.set(-18, 30, 14);
  scene.add(sun);

  /* ---------- helpers ---------- */
  function lerp3(target, a, b, t) {
    target.r = a.r + (b.r - a.r) * t;
    target.g = a.g + (b.g - a.g) * t;
    target.b = a.b + (b.b - a.b) * t;
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }

  /* ---------- canvas textures ---------- */
  function makeRoadTexture(clean) {
    var c = document.createElement("canvas");
    c.width = 256; c.height = 512;
    var g = c.getContext("2d");
    var i;
    if (clean) {
      g.fillStyle = "#3a3d42"; g.fillRect(0, 0, 256, 512);
      for (i = 0; i < 900; i++) {
        g.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
        g.fillRect(Math.random() * 256, Math.random() * 512, 2, 2);
      }
      g.fillStyle = "#f4f6f8";
      g.fillRect(120, 30, 16, 120);   // dashed centre line
      g.fillRect(120, 300, 16, 120);
      g.fillRect(18, 0, 6, 512);      // edge lines
      g.fillRect(232, 0, 6, 512);
    } else {
      g.fillStyle = "#7d7261"; g.fillRect(0, 0, 256, 512);
      // mud patches
      for (i = 0; i < 46; i++) {
        g.fillStyle = "rgba(" + (96 + Math.random() * 50 | 0) + "," + (80 + Math.random() * 40 | 0) + "," + (55 + Math.random() * 30 | 0) + ",0.55)";
        g.beginPath();
        g.ellipse(Math.random() * 256, Math.random() * 512, 10 + Math.random() * 40, 8 + Math.random() * 26, Math.random() * 3, 0, 6.3);
        g.fill();
      }
      // potholes
      for (i = 0; i < 12; i++) {
        var px = 30 + Math.random() * 196, py = 20 + Math.random() * 472, r = 7 + Math.random() * 16;
        g.fillStyle = "rgba(40,34,26,0.85)";
        g.beginPath(); g.ellipse(px, py, r, r * 0.8, 0, 0, 6.3); g.fill();
        g.fillStyle = "rgba(30,25,18,0.6)";
        g.beginPath(); g.ellipse(px + 2, py + 2, r * 0.6, r * 0.5, 0, 0, 6.3); g.fill();
      }
      // cracks
      g.strokeStyle = "rgba(50,44,34,0.7)"; g.lineWidth = 2;
      for (i = 0; i < 14; i++) {
        g.beginPath();
        var x = Math.random() * 256, y = Math.random() * 512;
        g.moveTo(x, y);
        for (var s = 0; s < 5; s++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; g.lineTo(x, y); }
        g.stroke();
      }
      // faded worn line
      g.fillStyle = "rgba(220,210,180,0.18)";
      g.fillRect(122, 60, 12, 90); g.fillRect(122, 330, 12, 90);
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 14);
    tex.anisotropy = 4;
    return tex;
  }

  function makeBuildingTexture(clean) {
    var c = document.createElement("canvas");
    c.width = 128; c.height = 256;
    var g = c.getContext("2d");
    var i;
    if (clean) {
      g.fillStyle = "#f2f4f7"; g.fillRect(0, 0, 128, 256);
      g.fillStyle = "#dfe4ea"; g.fillRect(0, 0, 128, 10);
      for (var row = 0; row < 6; row++) {
        for (var col = 0; col < 4; col++) {
          g.fillStyle = Math.random() > 0.25 ? "#a9c9de" : "#8fb6d0";
          g.fillRect(12 + col * 30, 26 + row * 38, 20, 24);
        }
      }
      g.fillStyle = "#1f6f5c"; g.fillRect(0, 246, 128, 10);
    } else {
      g.fillStyle = "#94856d"; g.fillRect(0, 0, 128, 256);
      // grime streaks
      for (i = 0; i < 60; i++) {
        g.fillStyle = "rgba(60,52,40," + (0.08 + Math.random() * 0.2) + ")";
        g.fillRect(Math.random() * 128, 0, 3 + Math.random() * 10, 256);
      }
      // broken / dark windows
      for (var r2 = 0; r2 < 6; r2++) {
        for (var c2 = 0; c2 < 4; c2++) {
          g.fillStyle = Math.random() > 0.7 ? "#3d372e" : "#57503f";
          g.fillRect(12 + c2 * 30, 26 + r2 * 38, 20, 24);
        }
      }
      // patched-up patches
      for (i = 0; i < 14; i++) {
        g.fillStyle = "rgba(" + (110 + Math.random() * 50 | 0) + "," + (96 + Math.random() * 40 | 0) + "," + (70 + Math.random() * 30 | 0) + ",0.8)";
        g.fillRect(Math.random() * 110, Math.random() * 230, 14 + Math.random() * 26, 10 + Math.random() * 18);
      }
      g.fillStyle = "#6b6152"; g.fillRect(0, 246, 128, 10);
    }
    var tex = new THREE.CanvasTexture(c);
    return tex;
  }

  /* ---------- ground ---------- */
  var groundMat = new THREE.MeshLambertMaterial({ color: C_GND_OLD.clone() });
  var ground = new THREE.Mesh(new THREE.PlaneGeometry(360, 360), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  scene.add(ground);

  /* ---------- road (two stacked quads, cross-faded) ---------- */
  var roadOldMat = new THREE.MeshLambertMaterial({ map: makeRoadTexture(false), color: 0xffffff, transparent: true, opacity: 1 });
  var roadNewMat = new THREE.MeshLambertMaterial({ map: makeRoadTexture(true), color: 0xffffff, transparent: true, opacity: 0 });
  var roadGeo = new THREE.PlaneGeometry(10, 300);
  var roadOld = new THREE.Mesh(roadGeo, roadOldMat);
  roadOld.rotation.x = -Math.PI / 2;
  roadOld.position.set(0, 0, -40);
  scene.add(roadOld);
  var roadNew = new THREE.Mesh(roadGeo, roadNewMat);
  roadNew.rotation.x = -Math.PI / 2;
  roadNew.position.set(0, 0.03, -40);
  scene.add(roadNew);

  /* ---------- buildings: old set fades out, new set fades in ---------- */
  var texOld = makeBuildingTexture(false);
  var texNew = makeBuildingTexture(true);
  var buildOldMat = new THREE.MeshLambertMaterial({ map: texOld, transparent: true, opacity: 1 });
  var buildNewMat = new THREE.MeshLambertMaterial({ map: texNew, transparent: true, opacity: 0 });
  var oldGroup = new THREE.Group();
  var newGroup = new THREE.Group();
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

  for (var side = -1; side <= 1; side += 2) {
    for (var b = 0; b < 9; b++) {
      var w = 5 + rnd() * 4;
      var h = 4 + rnd() * 7;
      var z = 18 - b * 14 - rnd() * 3;
      var x = side * (9 + rnd() * 3);

      var geoB = new THREE.BoxGeometry(w, h, 7);

      var oldB = new THREE.Mesh(geoB, buildOldMat);
      oldB.position.set(x, h / 2 - rnd() * 0.6, z);   // slightly sunk / uneven
      oldB.rotation.y = (rnd() - 0.5) * 0.1;
      oldGroup.add(oldB);

      var nh = h + 2 + rnd() * 5;
      var newB = new THREE.Mesh(new THREE.BoxGeometry(w, nh, 7), buildNewMat);
      newB.position.set(x, nh / 2, z);
      newGroup.add(newB);
    }
  }
  scene.add(oldGroup);
  scene.add(newGroup);

  /* ---------- trees (grow in) ---------- */
  var trees = [];
  var trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3c });
  var leafMat = new THREE.MeshLambertMaterial({ color: 0x3e9e5f });
  for (var t = 0; t < 12; t++) {
    var tz = 14 - t * 13;
    var tx = (t % 2 === 0 ? -1 : 1) * 6.4;
    var gTree = new THREE.Group();
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 2.6, 7), trunkMat);
    trunk.position.y = 1.3;
    gTree.add(trunk);
    var crown1 = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), leafMat);
    crown1.position.y = 3.6;
    gTree.add(crown1);
    var crown2 = new THREE.Mesh(new THREE.SphereGeometry(1.2, 9, 7), leafMat);
    crown2.position.set(0.9, 4.6, 0.2);
    gTree.add(crown2);
    gTree.position.set(tx, 0, tz);
    gTree.scale.setScalar(0.001);
    scene.add(gTree);
    trees.push(gTree);
  }

  /* ---------- streetlights (fade in) ---------- */
  var lampMat = new THREE.MeshLambertMaterial({ color: 0xb9bec6, transparent: true, opacity: 0 });
  var glowMat = new THREE.MeshBasicMaterial({ color: 0xfff0bf, transparent: true, opacity: 0 });
  var lamps = [];
  for (var l = 0; l < 8; l++) {
    var lmp = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 5.4, 6), lampMat);
    pole.position.y = 2.7;
    lmp.add(pole);
    var armM = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.12), lampMat);
    armM.position.set(-0.8, 5.35, 0);
    lmp.add(armM);
    var head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.3), glowMat);
    head.position.set(-1.6, 5.3, 0);
    lmp.add(head);
    lmp.position.set(l % 2 === 0 ? 6.6 : -6.6, 0, 10 - l * 18);
    if (l % 2 !== 0) lmp.rotation.y = Math.PI;
    scene.add(lmp);
    lamps.push(lmp);
  }

  /* ---------- dust particles (fade out) ---------- */
  var dustCount = 320;
  var dustGeo = new THREE.BufferGeometry();
  var dustPos = new Float32Array(dustCount * 3);
  for (var d = 0; d < dustCount; d++) {
    dustPos[d * 3] = (Math.random() - 0.5) * 40;
    dustPos[d * 3 + 1] = Math.random() * 7;
    dustPos[d * 3 + 2] = 20 - Math.random() * 140;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  var dustMat = new THREE.PointsMaterial({ color: 0xcbb992, size: 0.32, transparent: true, opacity: 0.75, depthWrite: false });
  var dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* ---------- state: 0 = dirty, 1 = clean & green ---------- */
  function applyState(p) {
    var e = easeInOut(clamp01(p));
    lerp3(skyColor, C_SKY_OLD, C_SKY_NEW, e);
    lerp3(fogColor, C_FOG_OLD, C_FOG_NEW, e);
    scene.fog.near = 30 + 30 * e;
    scene.fog.far = 150 + 130 * e;

    lerp3(groundMat.color, C_GND_OLD, C_GND_NEW, e);
    hemi.intensity = 0.75 + 0.45 * e;
    sun.intensity = 0.7 + 0.6 * e;

    // road cross-fade in the middle of the transition
    var roadP = clamp01((p - 0.2) / 0.6);
    roadOldMat.opacity = 1 - roadP;
    roadNewMat.opacity = roadP;

    // buildings: old sinks away, new rises in
    var bP = clamp01((p - 0.15) / 0.7);
    buildOldMat.opacity = 1 - bP;
    buildNewMat.opacity = bP;
    oldGroup.position.y = -6 * bP;
    newGroup.position.y = 6 * (1 - bP);

    // trees grow with a staggered wave
    for (var i = 0; i < trees.length; i++) {
      var tp = clamp01((p - 0.35 - i * 0.03) / 0.35);
      var s = easeInOut(tp) * (0.9 + 0.1 * Math.sin(Date.now() * 0.001 + i));
      trees[i].scale.setScalar(Math.max(s, 0.001));
    }

    // lamps fade in late
    var lp = clamp01((p - 0.55) / 0.35);
    lampMat.opacity = lp;
    glowMat.opacity = lp;

    // dust clears early
    dustMat.opacity = 0.75 * (1 - clamp01(p / 0.5));
    dust.visible = dustMat.opacity > 0.01;
  }

  /* ---------- animation loop: dirty → clean → hold → back ---------- */
  var CYCLE = 16; // seconds for a full loop
  function progressAt(t) {
    var ph = (t % CYCLE) / CYCLE;
    if (ph < 0.45) return ph / 0.45;                  // become clean over ~7.2s
    if (ph < 0.8) return 1;                           // hold clean
    return 1 - (ph - 0.8) / 0.2;                      // drift back to dirty
  }

  var badgeLabel = document.querySelector("[data-scene-label]");
  var badgeFill = document.querySelector("[data-scene-fill]");
  var lastLabel = "";

  var start = Date.now();
  var running = true;
  var rafId = null;

  function frame() {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    var t = (Date.now() - start) / 1000;
    var p = reduceMotion ? 1 : progressAt(t);
    applyState(p);
    if (!reduceMotion) {
      camera.position.x = Math.sin(t * 0.12) * 2.2;
      camera.position.y = 3.2 + Math.sin(t * 0.2) * 0.35;
      camera.lookAt(0, 2.2, -40);
    }
    if (badgeFill) badgeFill.style.width = Math.round(easeInOut(clamp01(p)) * 100) + "%";
    if (badgeLabel) {
      var txt = p < 0.35 ? "Dirty street" : p < 0.8 ? "Transforming…" : "Clean & green street";
      if (txt !== lastLabel) { badgeLabel.textContent = txt; lastLabel = txt; }
    }
    renderer.render(scene, camera);
  }

  function startLoop() { if (!running) { running = true; frame(); } }
  function stopLoop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

  // pause when tab hidden or hero scrolled out of view
  document.addEventListener("visibilitychange", function () {
    document.hidden ? stopLoop() : startLoop();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      entries[0].isIntersecting ? startLoop() : stopLoop();
    }, { threshold: 0.02 }).observe(host);
  }

  function onResize() {
    var w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  applyState(reduceMotion ? 1 : 0);
  frame();
})();
