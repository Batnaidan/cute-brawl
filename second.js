import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import {
//   MapControls,
//   OrbitControls,
// } from 'three/examples/jsm/controls/OrbitControls';
import { World, Vec3, Box, Body, Plane, Sphere } from 'cannon-es';
import nipplejs from 'nipplejs';
import './style.css';

const SPEED = 15;
const TIMESTEP = 1 / 60;
const CAMERAOFFSET = { z: 6 };
const DAMPING = 0.5;
const HitBoxSideThreshold = 10;
const CollisionSideThreshold = 2.3;
let renderer, scene, camera, joyStickInput;
let prevTime = performance.now();
let velocity;
const direction = new THREE.Vector3();
const vertex = new THREE.Vector3();
// init();
// render();
function findTriangleSide(degree, side) {
  let sine = Math.sin(degree * (Math.PI / 180));
  let cosine = Math.cos(degree * (Math.PI / 180));
  return { opposite: sine * side, adjacent: cosine * side, degree };
}

let container = document.getElementById('joystick');
var joyStick = nipplejs.create({
  zone: container,
  // mode: 'static',
  // position: { left: '50%', top: '50%' },
  color: 'red',
});

let characterControls = {
  keys: {
    forward: false,
    backward: false,
    left: false,
    right: false,
    punch: false,
    jump: false,
  },
};

joyStick.on('move', (event, data) => {
  joyStickInput = data;
  if (model1) {
    // model1.animations.stand.reset();
    model1.animations.stand.stop();
    model1.animations.runAndPunch.play();
    model1.animations.runAndPunch.setLoop(THREE.LoopRepeat);
    model1.scene.rotation.y = data.angle.radian + Math.PI / 2;
    velocity = findTriangleSide(data.angle.degree, data.distance);
    // model1.position.x += velocity.adjacent / 200;
    // model1.position.z += -(velocity.opposite / 200);
  }
});
joyStick.on('end', (event, data) => {
  joyStickInput = null;
  if (model1) {
    velocity = null;
  }
  model1.animations.stand.play();
  model1.animations.runAndPunch.stop();
});

renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: document.querySelector('#threejs'),
});
renderer.setSize(window.innerWidth, window.innerHeight);

scene = new THREE.Scene();

scene.background = new THREE.Color(0xfafafa);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = CAMERAOFFSET.z;
camera.position.y = 7;

// let cameraControls = new PointerLockControls(camera, renderer.domElement);

let terrain = new THREE.GridHelper(100, 20, 0x0a0a0a, 0x0a0a0a);
terrain.position.set(0, 0, 0);
scene.add(terrain);

let world = new World({
  gravity: new Vec3(0, -10, 0),
  allowSleep: false,
});

const groundBody = new Body({
  type: Body.STATIC, // can also be achieved by setting the mass to 0
  shape: new Plane(),
});

groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // make it face up
world.addBody(groundBody);

const radius = 4;
// let box = new Body({
//   mass: 2,
//   shape: new Box(new Vec3(radius / 2, radius / 2, radius / 2)),
// });
let box = new Body({
  mass: 2,
  shape: new Sphere(radius / 2),
});
box.position.set(5, radius, 0);
world.addBody(box);

let modelBox = new Body({ mass: 10, shape: new Box(new Vec3(0.6, 1, 0.6)) });
// modelBox.position.set(-2, (Math.random() - 0.5) * 1 + 2, 0);
modelBox.position.set(0, 1, 0);
world.addBody(modelBox);

const geometry = new THREE.SphereGeometry(radius / 2);
const material = new THREE.MeshNormalMaterial();
const sphereMesh = new THREE.Mesh(geometry, material);
scene.add(sphereMesh);

let mixer,
  mixer2,
  animations = {};

function loadModel(url) {
  return new Promise((resolve) => {
    new GLTFLoader().load(url, resolve);
  });
}

let model1, model2;
let p1 = loadModel('./resources/model/modelv2_stand_with_punchv2.glb').then(
  (result) => {
    console.log(result);
    model1 = result;
    mixer = new THREE.AnimationMixer(model1.scene);
    model1.scene.rotation.y = Math.PI;

    model1.animations.stand = mixer.clipAction(model1.animations[10]);
    model1.animations.stand.clampWhenFinished = true;
    model1.animations.stand.setLoop(THREE.LoopRepeat);
    model1.animations.stand.clampWhenFinished = true;
    camera.lookAt(model1.scene.position);
    loadModel('./resources/model/modelv2_run_with_punchv5.glb').then(
      (runModel) => {
        console.log(runModel);
        model1.animations.runAndPunch = mixer.clipAction(
          runModel.animations[0]
        );
        model1.animations.runAndPunch.clampWhenFinished = true;
        model1.animations.runAndPunch.setLoop(THREE.LoopRepeat);
        model1.animations.stand.play();
      }
    );
  }
);
let p2 = loadModel('./resources/model/modelv2_stand.glb').then((result) => {
  model2 = result;
  mixer2 = new THREE.AnimationMixer(model2.scene);
  model2.animations.stand = mixer.clipAction(model2.animations[10]);
  model2.animations.stand.clampWhenFinished = true;
  model2.scene.rotation.y = Math.PI;

  loadModel('./resources/model/modelv2_run_with_punchv3.glb').then(
    (runModel2) => {
      model2.animations.runAndPunch = mixer.clipAction(runModel2.animations[0]);
    }
  );
});

Promise.all([p1, p2]).then(() => {
  // model1.scene.position.set(0, 0, 0);

  model2.scene.position.set(-5, 0, 0);
  //add model to the scene
  scene.add(model1.scene);
  scene.add(model2.scene);
  window.setInterval(() => {
    checkCollision();
  }, 1000);
});

function updateMixer(deltaTime) {
  mixer.update(deltaTime);
}

const light = new THREE.AmbientLight(0xffffff); // soft white light
scene.add(light);

render();
function render() {
  requestAnimationFrame(render);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  world.step(TIMESTEP, delta);
  sphereMesh.position.copy(box.position);
  sphereMesh.quaternion.copy(box.quaternion);
  if (mixer) updateMixer(delta);
  if (model1) {
    model1.scene.position.copy(modelBox.position);
    // camera.position.x = modelBox.position.x;
    // camera.position.z = modelBox.position.z + CAMERAOFFSET.z;
    movePlayer(delta);
  }
  prevTime = time;
  renderer.render(scene, camera);
}

function movePlayer(delta) {
  if (velocity) {
    // model1.scene.position.x += (velocity.adjacent / SPEED) * delta;
    // model1.scene.position.z += -(velocity.opposite / SPEED) * delta;
    modelBox.position.x += (velocity.adjacent / SPEED) * delta;
    modelBox.position.z += -(velocity.opposite / SPEED) * delta;
    camera.position.x = modelBox.position.x;
    camera.position.z = modelBox.position.z + CAMERAOFFSET.z;
    // camera.position.z -= (velocity.opposite / SPEED) * delta;
  }
}
function pushEnemyAway() {}
function checkCollision() {
  let model1pos = calculateFourSide(model1.scene.position);
  // console.log(model1pos);
  // console.log(model1.scene.position);
  // let model2pos = (calculateFourSide(model2.scene.position);
  let pos = sphereMesh.position;
  console.log;
  if (model1pos[0].x < pos.x && model1pos[1].x > pos.x) {
    if (model1pos[0].z > pos.z && model1pos[1].z > pos.z) {
      applyForce();
    }
  }
  // console.log('collision');
  // } else {
  //   console.log(pos);
  //   console.log(model1pos);
  // }
}
function calculateFourSide({ x, z }) {
  let hitBoxGrid = []; //[0] = A, [1] = B, [2] = C, [3] = D
  hitBoxGrid.push({
    x: x - HitBoxSideThreshold / 2,
    z: z + HitBoxSideThreshold / 2,
  });
  hitBoxGrid.push({
    x: x + HitBoxSideThreshold / 2,
    z: z + HitBoxSideThreshold / 2,
  });
  hitBoxGrid.push({
    x: x + HitBoxSideThreshold / 2,
    z: 0,
  });
  hitBoxGrid.push({
    x: x - HitBoxSideThreshold / 2,
    z: 0,
  });
  return hitBoxGrid;
}
function calculateOppositeAndAdjacent(x1, z1, x2, z2) {}

function applyForce() {
  box.linearDamping = DAMPING;
  box.angularDamping = DAMPING;
  let a = box.position.x - modelBox.position.x;
  let b = box.position.z - modelBox.position.z;
  console.log(box.position.x, modelBox.position.x);
  a = a > 5 ? 5 : a;
  b = b > 5 ? 5 : b;
  // let c = Math.sqrt(a*a + b*b);
  console.log(a, b);
  const force = new Vec3(a * 100, 0, b * 100);
  console.log(force);
  box.applyForce(force);
}
