import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
// import {
//   MapControls,
//   OrbitControls,
// } from 'three/examples/jsm/controls/OrbitControls';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

import nipplejs from 'nipplejs';
import './style.css';
import { LoopOnce } from 'three';

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

const punchButton = document.querySelector('#punch-button');

punchButton.addEventListener('click', () => {
  animations.run.stop();
  animations.punch.reset();
  animations.punch.play();
});

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
  if (_model) {
    _model.rotation.y = data.angle.radian + Math.PI / 2;
    velocity = findTriangleSide(data.angle.degree, data.distance);
    // _model.position.x += velocity.adjacent / 200;
    // _model.position.z += -(velocity.opposite / 200);
  }
});
joyStick.on('end', (event, data) => {
  joyStickInput = null;
  if (_model) {
    velocity = null;
  }
  animations.run.stop();
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
camera.position.y = 2;

let cameraControls = new PointerLockControls(camera, renderer.domElement);

let terrain = new THREE.GridHelper(100, 20, 0x0a0a0a, 0x0a0a0a);
terrain.position.set(0, -0.5, 0);
scene.add(terrain);

const loader = new GLTFLoader();

let _model,
  mixer,
  animations = {};
loader.load(
  './resources/model/modelv2_stand.glb',
  (model) => {
    // model.scale.setScalar(0.01);
    scene.add(model.scene);
    _model = model.scene;
    mixer = new THREE.AnimationMixer(_model);
    animations.stand = mixer.clipAction(model.animations[10]);
    animations.stand.play();
    _model.rotation.y = Math.PI;

    loader.load('./resources/model/modelv2_run.glb', (runModel) => {
      animations.run = mixer.clipAction(runModel.animations[10]);
    });
    loader.load('./resources/model/modelv2_punch.glb', (punchModel) => {
      animations.punch = mixer.clipAction(punchModel.animations[10]);
      animations.punch.setLoop(LoopOnce);
    });
  },
  (prog) => {
    console.log(prog);
  },
  (err) => {
    console.log(err);
  }
);
// loader.load('./resources/model/modelv2_run.glb', (model) => {
//   _;
// });

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
  if (_model) {
    movePlayer(delta);
  }
  // let idealPosition = calculateCameraPosition();
  // let idealLookAt = calculateCameraLook();

  prevTime = time;
  renderer.render(scene, camera);
}

function movePlayer(delta) {
  if (velocity) {
    animations.run.play();
    _model.position.x += (velocity.adjacent / 10) * delta;
    _model.position.z += -(velocity.opposite / 10) * delta;
    cameraControls.moveRight((velocity.adjacent / 10) * delta);
    cameraControls.moveForward((velocity.opposite / 10) * delta);
  }
}
