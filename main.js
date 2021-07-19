import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import {
//   MapControls,
//   OrbitControls,
// } from 'three/examples/jsm/controls/OrbitControls';

import nipplejs from 'nipplejs';
import './style.css';

const SPEED = 15;
const HitBoxSideThreshold = 3.2;
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
camera.position.z = 5;
camera.position.y = 5;

// let cameraControls = new PointerLockControls(camera, renderer.domElement);

let terrain = new THREE.GridHelper(100, 20, 0x0a0a0a, 0x0a0a0a);
terrain.position.set(0, -0.5, 0);
scene.add(terrain);

let mixer,
  animations = {};

function loadModel(url) {
  return new Promise((resolve) => {
    new GLTFLoader().load(url, resolve);
  });
}

let model1, model2;
let p1 = loadModel('./resources/model/modelv2_stand.glb').then((result) => {
  model1 = result;
  mixer = new THREE.AnimationMixer(model1.scene);
  model1.animations.stand = mixer.clipAction(model1.animations[10]);
  model1.animations.stand.play();
  model1.scene.rotation.y = Math.PI;

  camera.lookAt(model1.scene.position);
  loadModel('./resources/model/modelv2_run_with_punch.glb').then((runModel) => {
    model1.animations.runAndPunch = mixer.clipAction(runModel.animations[0]);
  });
});
let p2 = loadModel('./resources/model/modelv2_stand.glb').then((result) => {
  model2 = result;
  mixer = new THREE.AnimationMixer(model2.scene);
  model2.animations.stand = mixer.clipAction(model2.animations[10]);
  model2.scene.rotation.y = Math.PI;
  model2.animations.stand.play();

  camera.lookAt(model2.scene.position);
  loadModel('./resources/model/modelv2_run_with_punch.glb').then((runModel) => {
    model2.animations.runAndPunch = mixer.clipAction(runModel.animations[0]);
  });
});

Promise.all([p1, p2]).then(() => {
  console.log(model1);
  console.log(model2);
  model1.scene.position.set(0, 0, 0);
  model1.animations.stand.play();
  model2.scene.position.set(0, 0, -5);
  model2.animations.stand.play();
  //add model to the scene
  scene.add(model1.scene);
  scene.add(model2.scene);
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
  // console.log(delta);
  if (mixer) updateMixer(delta);
  if (model1) {
    movePlayer(delta);
    checkCollision();
  }
  // let idealPosition = calculateCameraPosition();
  // let idealLookAt = calculateCameraLook();

  prevTime = time;
  renderer.render(scene, camera);
}

function movePlayer(delta) {
  if (velocity) {
    model1.animations.runAndPunch.play();
    model1.scene.position.x += (velocity.adjacent / SPEED) * delta;
    model1.scene.position.z += -(velocity.opposite / SPEED) * delta;
    camera.position.x += (velocity.adjacent / SPEED) * delta;
    camera.position.z -= (velocity.opposite / SPEED) * delta;
  }
}
function pushEnemyAway() {}
function checkCollision() {
  let model1pos = calculateFourSide(model1.scene.position);
  // console.log(model1pos);
  // console.log(model1.scene.position);
  // let model2pos = (calculateFourSide(model2.scene.position);
  let pos = model2.scene.position;
  if (model1pos[0].x < pos.x && model1pos[1].x > pos.x) {
    if (model1pos[0].z > pos.z && model1pos[1].z > pos.z) {
      console.log('collision');
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
function calculatePunchRange(x, z) {}
