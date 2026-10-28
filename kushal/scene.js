import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { animate, hover, frame as motionFrame, cancelFrame } from 'motion';
import { threeEffect } from 'motion/three';

animate.addEffect(threeEffect);

const TAU = Math.PI * 2;
const random = (n) => { const value = Math.sin(n * 127.1 + 31.7) * 43758.5453; return value - Math.floor(value); };

function makeMaterials() {
  return {
    chrome: new THREE.MeshPhysicalMaterial({ color: 0xc8c9c4, metalness: 1, roughness: .17, clearcoat: 1, clearcoatRoughness: .12 }),
    black: new THREE.MeshPhysicalMaterial({ color: 0x171a15, metalness: .82, roughness: .24, clearcoat: 1 }),
    orange: new THREE.MeshPhysicalMaterial({ color: 0xff660b, metalness: .48, roughness: .24, clearcoat: 1 }),
    pale: new THREE.MeshPhysicalMaterial({ color: 0xf0e5d6, metalness: .35, roughness: .28, clearcoat: .5 }),
    glowing: new THREE.MeshStandardMaterial({ color: 0xff7a21, emissive: 0xff4b0c, emissiveIntensity: .9, roughness: .35 })
  };
}

function mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

function createMonogram(materials) {
  const shape = new THREE.Shape();
  const points = [[-.95, -1.5], [-.28, -1.5], [-.28, -.34], [.72, -1.5], [1.52, -1.5], [.19, .08], [1.4, 1.5], [.57, 1.5], [-.28, .46], [-.28, 1.5], [-.95, 1.5]];
  shape.moveTo(...points[0]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(...points[i]);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .43, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .09, bevelThickness: .09, curveSegments: 16 });
  geometry.center();
  return new THREE.Mesh(geometry, [materials.chrome, materials.black]);
}

function createHero(group, materials) {
  const subject = new THREE.Group();
  group.add(subject);
  const monogram = createMonogram(materials);
  monogram.rotation.set(.05, -.12, -.12);
  monogram.scale.setScalar(1.13);
  subject.add(monogram);

  const circuit = new THREE.Group();
  subject.add(circuit);
  circuit.rotation.set(.4, -.38, -.22);
  mesh(new THREE.TorusGeometry(2.23, .075, 12, 140), materials.black, circuit).scale.set(1, 1.15, 1);
  const inner = mesh(new THREE.TorusGeometry(2.05, .025, 8, 130, Math.PI * 1.72), materials.chrome, circuit);
  inner.scale.y = 1.15;
  const markerGeometry = new THREE.BoxGeometry(.075, .18, .09);
  for (let i = 0; i < 56; i += 1) {
    const angle = i / 56 * TAU;
    const marker = mesh(markerGeometry, i % 7 === 0 ? materials.orange : materials.black, circuit, Math.cos(angle) * 2.38, Math.sin(angle) * 2.38 * 1.15, 0);
    marker.rotation.z = angle - Math.PI / 2;
  }
  const satellite = mesh(new THREE.SphereGeometry(.13, 16, 16), materials.orange, circuit);
  const speedPositions = new Float32Array(54 * 6);
  for (let i = 0; i < 54; i += 1) {
    const x = (random(i + 1) - .5) * 9;
    const y = (random(i + 77) - .5) * 7;
    speedPositions.set([x, y, -1.5, x + .2 + random(i + 22) * .7, y + .1, -1.5], i * 6);
  }
  const lines = new THREE.BufferGeometry();
  lines.setAttribute('position', new THREE.BufferAttribute(speedPositions, 3));
  group.add(new THREE.LineSegments(lines, new THREE.LineBasicMaterial({ color: 0x4d210d, transparent: true, opacity: .18 })));
  return (time, input) => {
    subject.rotation.y = -.22 + input.x * .23 + input.dragX;
    subject.rotation.x = -.1 + input.y * .14 + input.dragY;
    subject.rotation.z = -.08 + Math.sin(time * .34) * .035;
    subject.position.y = Math.sin(time * .7) * .09 - input.scroll * .25;
    circuit.rotation.z = -.22 + time * .045;
    satellite.position.set(Math.cos(time * .45) * 2.23, Math.sin(time * .45) * 2.23 * 1.15, .02);
  };
}

function createNetwork(group, materials) {
  const orb = new THREE.Group();
  group.add(orb);
  const positions = [];
  const nodeGeometry = new THREE.IcosahedronGeometry(.14, 2);
  for (let i = 0; i < 23; i += 1) {
    const angle = i * 2.39996;
    const y = 1 - i / 22 * 2;
    const radius = Math.sqrt(1 - y * y) * 1.65;
    const position = new THREE.Vector3(Math.cos(angle) * radius, y * 1.5, Math.sin(angle) * radius);
    positions.push(position);
    const node = mesh(nodeGeometry, i % 4 === 0 ? materials.chrome : materials.black, orb, position.x, position.y, position.z);
    node.scale.setScalar(i % 4 === 0 ? 1.5 : .85);
  }
  const segments = [];
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      if (positions[i].distanceTo(positions[j]) < 1.3) segments.push(...positions[i].toArray(), ...positions[j].toArray());
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));
  orb.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0x362512, transparent: true, opacity: .45 })));
  const ring = mesh(new THREE.TorusGeometry(2.15, .022, 6, 120), materials.black, group);
  ring.rotation.set(1.2, .3, .2);
  return (time, input) => {
    orb.rotation.set(.2 + input.y * .08, time * .12 + input.x * .14, -.12);
    ring.rotation.z = time * .08;
  };
}

function createWaveform(group, materials) {
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(.085, 1, .12), materials.orange, 64);
  bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(bars);
  group.rotation.set(.15, -.27, -.12);
  const plane = mesh(new THREE.BoxGeometry(5.3, .035, 1.35), materials.black, group, 0, -.03, -.2);
  const base = mesh(new THREE.BoxGeometry(5.4, .018, 1.5), materials.chrome, group, 0, -.055, -.2);
  plane.visible = base.visible = true;
  const dummy = new THREE.Object3D();
  return (time) => {
    for (let i = 0; i < 64; i += 1) {
      const column = i % 32;
      const row = Math.floor(i / 32);
      const height = .25 + Math.pow((Math.sin(column * .28 - time * 1.3 + row * 1.8) + 1) * .5, 2) * 1.8;
      dummy.position.set((column - 15.5) * .155, height / 2, row * -.68 + .2);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      bars.setMatrixAt(i, dummy.matrix);
    }
    bars.instanceMatrix.needsUpdate = true;
    group.position.y = -.5;
  };
}

function createShield(group, materials) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 1.45);
  shape.lineTo(1.1, 1.03);
  shape.lineTo(.95, -.3);
  shape.quadraticCurveTo(.65, -1.05, 0, -1.5);
  shape.quadraticCurveTo(-.65, -1.05, -.95, -.3);
  shape.lineTo(-1.1, 1.03);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .24, bevelEnabled: true, bevelSize: .07, bevelThickness: .07, bevelSegments: 4, curveSegments: 28 });
  const shield = new THREE.Group();
  group.add(shield);
  mesh(geometry, materials.black, shield).scale.set(1.13, 1.1, .8);
  mesh(geometry, materials.orange, shield, 0, 0, .12);
  const check = new THREE.Shape();
  check.moveTo(-.6, .1); check.lineTo(-.22, -.28); check.lineTo(.65, .58); check.lineTo(.83, .4); check.lineTo(-.22, -.65); check.lineTo(-.8, -.09); check.closePath();
  mesh(new THREE.ExtrudeGeometry(check, { depth: .03, bevelEnabled: false }), materials.black, shield, 0, 0, .46);
  const ring = mesh(new THREE.TorusGeometry(1.95, .033, 8, 120), materials.chrome, group);
  ring.rotation.set(.9, -.2, .1);
  return (time, input) => {
    shield.rotation.set(-.05 + input.y * .06, -.3 + Math.sin(time * .5) * .18 + input.x * .12, -.06);
    shield.position.y = Math.sin(time * .8) * .09;
    ring.rotation.y = -.2 + Math.sin(time * .3) * .15;
  };
}

function createWindows(group, materials) {
  const windows = [];
  for (let i = 0; i < 3; i += 1) {
    const windowGroup = new THREE.Group();
    group.add(windowGroup);
    windowGroup.position.set((i - 1) * .32, (i - 1) * .25, (i - 1) * .48);
    mesh(new THREE.BoxGeometry(2.65, 1.8, .13), i === 2 ? materials.pale : materials.black, windowGroup);
    mesh(new THREE.BoxGeometry(2.48, .15, .025), materials.orange, windowGroup, 0, .68, .08);
    for (let j = 0; j < 3; j += 1) mesh(new THREE.SphereGeometry(.035, 8, 8), materials.black, windowGroup, -.98 + j * .13, .68, .11);
    mesh(new THREE.BoxGeometry(.62, 1.16, .025), materials.black, windowGroup, -.83, -.09, .09);
    for (let j = 0; j < 4; j += 1) mesh(new THREE.BoxGeometry(j % 2 ? .87 : 1.16, .13, .04), j % 2 ? materials.orange : materials.chrome, windowGroup, j % 2 ? .58 : .39, .37 - j * .28, .1);
    windows.push(windowGroup);
  }
  group.rotation.set(-.15, -.4, -.12);
  return (time, input) => {
    for (let i = 0; i < windows.length; i += 1) windows[i].position.y = (i - 1) * .25 + Math.sin(time * .75 + i) * .06;
    group.rotation.y = -.4 + input.x * .12;
  };
}

function createDimSum(group, materials) {
  const platter = new THREE.Group();
  group.add(platter);
  const bamboo = new THREE.MeshStandardMaterial({ color: 0xad7540, roughness: .75, metalness: 0, side: THREE.DoubleSide });
  const bambooLight = new THREE.MeshStandardMaterial({ color: 0xd9ac71, roughness: .7 });
  const bambooDark = new THREE.MeshStandardMaterial({ color: 0x81532b, roughness: .8 });
  const dough = new THREE.MeshStandardMaterial({ color: 0xeee1bd, roughness: .8, metalness: 0 });
  const fold = new THREE.MeshStandardMaterial({ color: 0xd3bf94, roughness: .9 });
  const scallion = new THREE.MeshStandardMaterial({ color: 0x376333, roughness: .85 });

  mesh(new THREE.CylinderGeometry(1.89, 1.85, .09, 72), materials.black, platter, 0, -.68, 0);
  mesh(new THREE.CylinderGeometry(1.7, 1.63, .67, 80, 1, true), bamboo, platter, 0, -.3, 0);
  mesh(new THREE.CylinderGeometry(1.6, 1.6, .06, 72), bambooDark, platter, 0, -.59, 0);
  for (const [radius, y, thickness] of [[1.71, .04, .065], [1.67, -.22, .025], [1.64, -.62, .055]]) {
    const rim = mesh(new THREE.TorusGeometry(radius, thickness, 10, 100), bambooLight, platter, 0, y, 0);
    rim.rotation.x = Math.PI / 2;
  }
  const grainGeometry = new THREE.BoxGeometry(.022, .57, .012);
  for (let i = 0; i < 80; i += 1) {
    const angle = i / 80 * TAU;
    const strip = mesh(grainGeometry, i % 3 === 0 ? bambooDark : bambooLight, platter, Math.sin(angle) * 1.68, -.3, Math.cos(angle) * 1.68);
    strip.rotation.y = angle;
  }
  for (let i = -8; i <= 8; i += 1) {
    const offset = i * .17;
    const length = Math.sqrt(1.58 ** 2 - offset ** 2) * 2;
    mesh(new THREE.BoxGeometry(length, .035, .065), bambooLight, platter, 0, -.52, offset);
    const cross = mesh(new THREE.BoxGeometry(length, .025, .055), bamboo, platter, offset, -.49, 0);
    cross.rotation.y = Math.PI / 2;
  }

  const profile = new THREE.SplineCurve([[0, 0], [.3, .025], [.5, .11], [.57, .3], [.53, .5], [.36, .67], [.14, .79], [.07, .83], [0, .81]].map(([x, y]) => new THREE.Vector2(x, y))).getPoints(44);
  const dumplingGeometry = new THREE.LatheGeometry(profile, 64);
  const positions = dumplingGeometry.attributes.position;
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const pleat = 1 + Math.sin(Math.atan2(z, x) * 12) * .055 * THREE.MathUtils.smoothstep(y, .25, .8);
    positions.setXYZ(i, x * pleat, y, z * pleat);
  }
  dumplingGeometry.computeVertexNormals();
  for (const [x, z, angle] of [[-.64, .48, -.2], [.64, .42, .3], [0, -.65, .1]]) {
    const dumpling = new THREE.Group();
    dumpling.position.set(x, -.3, z);
    dumpling.rotation.y = angle;
    platter.add(dumpling);
    mesh(dumplingGeometry, dough, dumpling);
    const seam = mesh(new THREE.TorusGeometry(.064, .016, 6, 20), fold, dumpling, 0, .805, 0);
    seam.rotation.x = Math.PI / 2;
    for (let j = 0; j < 10; j += 1) {
      const a = j / 10 * TAU;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(a) * .44, .58, Math.sin(a) * .44),
        new THREE.Vector3(Math.cos(a + .05) * .28, .72, Math.sin(a + .05) * .28),
        new THREE.Vector3(Math.cos(a + .1) * .075, .815, Math.sin(a + .1) * .075)
      ]);
      mesh(new THREE.TubeGeometry(curve, 10, .009, 4, false), fold, dumpling);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    const garnish = mesh(new THREE.BoxGeometry(.06, .025, .13), scallion, platter, (random(i + 2) - .5) * 2, -.43, (random(i + 44) - .5) * 1.5);
    garnish.rotation.y = random(i + 31) * TAU;
  }

  const steamUniforms = [];
  for (let i = 0; i < 3; i += 1) {
    const uniforms = { uTime: { value: 0 }, uPhase: { value: i * 2.1 } };
    const material = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vUv; uniform float uTime; uniform float uPhase; void main() { vUv = uv; vec3 p = position; p.x += sin(uv.y * 7.0 - uTime * 1.2 + uPhase) * 0.1 * uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
      fragmentShader: 'varying vec2 vUv; uniform float uTime; uniform float uPhase; void main() { float center = 0.5 + sin(vUv.y * 8.0 - uTime * 1.3 + uPhase) * 0.12; float width = 0.05 + vUv.y * 0.15; float mist = exp(-pow((vUv.x - center) / width, 2.0)); float fade = sin(vUv.y * 3.14159) * (0.75 + sin(vUv.y * 12.0 - uTime + uPhase) * 0.25); gl_FragColor = vec4(1.0, 0.96, 0.85, mist * fade * 0.27); }'
    });
    mesh(new THREE.PlaneGeometry(.54, 1.15, 12, 20), material, platter, (i - 1) * .48, 1.08, .05);
    steamUniforms.push(uniforms);
  }
  group.rotation.set(.45, -.18, -.03);
  group.position.y = -.08;
  const update = (time) => {
    group.rotation.y = -.18 + Math.sin(time * .25) * .07;
    for (let i = 0; i < steamUniforms.length; i += 1) steamUniforms[i].uTime.value = time;
  };
  update.hoverTarget = platter;
  return update;
}

function createContact(group, materials) {
  const knot = mesh(new THREE.TorusKnotGeometry(1.08, .34, 170, 22, 2, 3), materials.black, group);
  const ring = mesh(new THREE.TorusGeometry(2, .04, 10, 120), materials.chrome, group);
  ring.rotation.set(.6, .3, .2);
  return (time, input) => {
    knot.rotation.set(time * .09 + input.y * .1, time * .13 + input.x * .18, -.25);
    ring.rotation.z = time * -.08;
  };
}

const factories = { hero: createHero, embeded: createNetwork, cppsey: createWaveform, goalguard: createShield, whatselectron: createWindows, dimsum: createDimSum, contact: createContact };

export function createPortfolioScenes() {
  const canvas = document.querySelector('#webgl');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .04).texture;
  room.dispose();
  pmrem.dispose();

  const entries = [...document.querySelectorAll('[data-scene]')].map((element) => ({ element, rect: null, scene: null }));
  let width = 0;
  let height = 0;
  let layoutDirty = true;
  let disposed = false;
  let contextLost = false;
  let scheduled = false;
  let lastTime = 0;
  let elapsed = .5;
  let motion = document.body.dataset.motion !== 'off';
  const input = { x: 0, y: 0, dragX: 0, dragY: 0, scroll: 0 };
  const target = { x: 0, y: 0, dragX: 0, dragY: 0 };

  function setup(entry) {
    const scene = new THREE.Scene();
    scene.environment = environment;
    const isFood = entry.element.dataset.scene === 'dimsum';
    scene.environmentIntensity = isFood ? .65 : 1.3;
    scene.add(new THREE.HemisphereLight(0xffe9d2, 0x24261d, isFood ? 1 : 2));
    const key = new THREE.DirectionalLight(0xfff3e6, isFood ? 2.2 : 4.5);
    key.position.set(-3, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xff8a33, isFood ? 1.2 : 3);
    rim.position.set(4, -1, -3);
    scene.add(rim);
    const camera = new THREE.PerspectiveCamera(38, 1, .1, 50);
    camera.position.set(0, 0, entry.element.dataset.scene === 'hero' ? 9.1 : entry.element.dataset.scene === 'dimsum' ? 5.7 : 7.3);
    const group = new THREE.Group();
    scene.add(group);
    const materials = makeMaterials();
    const update = factories[entry.element.dataset.scene](group, materials);
    if (update.hoverTarget) {
      const moveDish = (over) => {
        if (!motion || document.hidden) return;
        entry.animation = animate(update.hoverTarget, { y: over ? .14 : 0, rotateZ: over ? 3 : 0 }, { type: 'spring', stiffness: 180, damping: 23, onUpdate: invalidate });
      };
      entry.hoverTarget = update.hoverTarget;
      entry.cleanupHover = hover(entry.element.closest('.project-art'), () => {
        moveDish(true);
        return () => moveDish(false);
      });
    }
    entry.scene = { scene, camera, update };
    return entry.scene;
  }

  function tick({ timestamp }) { render(timestamp); }
  function invalidate() {
    if (!scheduled && !disposed && !contextLost && !document.hidden) {
      scheduled = true;
      motionFrame.render(tick);
    }
  }
  function layout() {
    const nextWidth = canvas.clientWidth;
    const nextHeight = canvas.clientHeight;
    if (nextWidth !== width || nextHeight !== height) {
      width = nextWidth;
      height = nextHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 760 ? 1.25 : 1.5));
      renderer.setSize(width, height, false);
    }
    for (const entry of entries) entry.rect = entry.element.getBoundingClientRect();
    layoutDirty = false;
  }

  function render(now) {
    scheduled = false;
    if (disposed || contextLost || document.hidden) return;
    const delta = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0;
    lastTime = now;
    const active = motion && !document.body.classList.contains('modal-open');
    if (active) elapsed += delta;
    input.x += (target.x - input.x) * .07;
    input.y += (target.y - input.y) * .07;
    input.dragX += (target.dragX - input.dragX) * .12;
    input.dragY += (target.dragY - input.dragY) * .12;
    input.scroll = window.scrollY / Math.max(window.innerHeight, 1);
    if (layoutDirty) layout();
    renderer.setScissorTest(false);
    renderer.clear(true, true, true);
    renderer.setScissorTest(true);
    let visible = false;
    const header = width < 760 ? 74 : 86;
    for (const entry of entries) {
      const rect = entry.rect;
      if (rect.width < 1 || rect.height < 1 || rect.bottom <= header || rect.top >= height) continue;
      visible = true;
      const { scene, camera, update } = entry.scene || setup(entry);
      const clipTop = Math.max(header, rect.top);
      const clipBottom = Math.min(height, rect.bottom);
      const clipLeft = Math.max(0, rect.left);
      const clipRight = Math.min(width, rect.right);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      update(elapsed, input);
      renderer.setViewport(rect.left, height - rect.bottom, rect.width, rect.height);
      renderer.setScissor(clipLeft, height - clipBottom, Math.max(0, clipRight - clipLeft), Math.max(0, clipBottom - clipTop));
      renderer.clearDepth();
      renderer.render(scene, camera);
      entry.element.classList.add('webgl-ready');
    }
    document.documentElement.dataset.webgl = 'ready';
    const settling = Math.abs(target.x - input.x) + Math.abs(target.y - input.y) + Math.abs(target.dragX - input.dragX) + Math.abs(target.dragY - input.dragY) > .002;
    if ((active && visible) || settling) invalidate();
  }

  function onLayout() { layoutDirty = true; invalidate(); }
  window.addEventListener('scroll', onLayout, { passive: true });
  window.addEventListener('resize', onLayout, { passive: true });
  window.addEventListener('portfolio:layout', onLayout);
  window.addEventListener('portfolio:motion', (event) => {
    motion = event.detail;
    if (!motion) for (const entry of entries) {
      entry.animation?.stop();
      if (entry.hoverTarget) { entry.hoverTarget.position.y = 0; entry.hoverTarget.rotation.z = 0; }
    }
    lastTime = 0;
    invalidate();
  });
  window.addEventListener('portfolio:reset', () => { target.x = target.y = target.dragX = target.dragY = 0; invalidate(); });
  document.addEventListener('visibilitychange', () => {
    lastTime = 0;
    if (document.hidden) { cancelFrame(tick); scheduled = false; } else onLayout();
  });
  document.fonts.ready.then(onLayout);
  const resizeObserver = new ResizeObserver(onLayout);
  for (const entry of entries) resizeObserver.observe(entry.element);

  const hero = document.querySelector('.hero-scene');
  let dragging = false;
  let previousX = 0;
  let previousY = 0;
  hero.addEventListener('pointerdown', (event) => {
    dragging = true;
    previousX = event.clientX;
    previousY = event.clientY;
    hero.setPointerCapture(event.pointerId);
  });
  hero.addEventListener('pointermove', (event) => {
    const rect = hero.getBoundingClientRect();
    target.x = (event.clientX - rect.left) / rect.width * 2 - 1;
    target.y = (event.clientY - rect.top) / rect.height * 2 - 1;
    if (dragging) {
      target.dragX += (event.clientX - previousX) * .008;
      target.dragY = THREE.MathUtils.clamp(target.dragY + (event.clientY - previousY) * .004, -.7, .7);
      previousX = event.clientX;
      previousY = event.clientY;
    }
    invalidate();
  });
  const endDrag = () => { dragging = false; };
  hero.addEventListener('pointerup', endDrag);
  hero.addEventListener('pointercancel', endDrag);
  hero.addEventListener('lostpointercapture', endDrag);
  hero.addEventListener('pointerleave', () => { if (!dragging) { target.x = target.y = 0; invalidate(); } });
  hero.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'r', 'R'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'ArrowLeft') target.dragX -= .16;
    if (event.key === 'ArrowRight') target.dragX += .16;
    if (event.key === 'ArrowUp') target.dragY = Math.max(-.7, target.dragY - .1);
    if (event.key === 'ArrowDown') target.dragY = Math.min(.7, target.dragY + .1);
    if (event.key.toLowerCase() === 'r') target.dragX = target.dragY = target.x = target.y = 0;
    invalidate();
  });

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    contextLost = true;
    cancelFrame(tick);
    scheduled = false;
    for (const entry of entries) entry.element.classList.remove('webgl-ready');
    document.documentElement.dataset.webgl = 'fallback';
  });
  canvas.addEventListener('webglcontextrestored', () => { contextLost = false; onLayout(); });
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    disposed = true;
    cancelFrame(tick);
    resizeObserver.disconnect();
    const geometries = new Set();
    const materials = new Set();
    for (const entry of entries) {
      entry.cleanupHover?.();
      entry.animation?.stop();
      entry.scene?.scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (object.material) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      });
    }
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    environment.dispose();
    renderer.dispose();
  });
  invalidate();
}
