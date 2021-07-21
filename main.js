import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { io } from 'socket.io-client';
import nipplejs from 'nipplejs';
import './style.css';

const socket = io('ws://localhost:8000');
const SPEED = 15;
const CAMERAOFFSET = { z: 6 };
const DAMPING = 0.5;
const HitBoxSideThreshold = 10;
const CollisionSideThreshold = 2.3;
let renderer, scene, camera, joyStickInput;
let prevTime = performance.now();
let velocity;
// init();
// render();
function findTriangleSide(degree, side) {
  let sine = Math.sin(degree * (Math.PI / 180));
  let cosine = Math.cos(degree * (Math.PI / 180));
  return { opposite: sine * side, adjacent: cosine * side, degree };
}

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

let container = document.getElementById('joystick');
var joyStick = nipplejs.create({
  zone: container,
  // mode: 'static',
  // position: { left: '50%', top: '50%' },
  color: 'red',
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
const radius = 4;
let generalMaterial = new THREE.MeshLambertMaterial({ color: 0xdddddd });

let terrain = new THREE.GridHelper(100, 20, 0x0a0a0a, 0x0a0a0a);
terrain.position.set(0, 0, 0);
scene.add(terrain);

const dummyGeo = new THREE.SphereGeometry(radius / 2);
const dummy1 = new THREE.Mesh(dummyGeo, generalMaterial);
dummy1.position.set(0, 0, 5);
scene.add(dummy1);

// const floorGeometry = new THREE.PlaneBufferGeometry(300, 300, 100, 100);
// floorGeometry.rotateX(-Math.PI / 2);
// const floor = new THREE.Mesh(floorGeometry, generalMaterial);
// floor.receiveShadow = true;
// scene.add(floor);

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
    model1 = result;
    mixer = new THREE.AnimationMixer(model1.scene);
    model1.scene.rotation.y = Math.PI;
    model1.animations.stand = mixer.clipAction(model1.animations[10]);
    model1.animations.stand.clampWhenFinished = true;
    model1.animations.stand.setLoop(THREE.LoopRepeat);
    camera.lookAt(model1.scene.position);
    loadModel('./resources/model/modelv2_run_with_punchv5.glb').then(
      (runModel) => {
        model1.animations.runAndPunch = mixer.clipAction(
          runModel.animations[0]
        );
        model1.animations.runAndPunch.clampWhenFinished = true;
        model1.animations.runAndPunch.setLoop(THREE.LoopRepeat);
        model1.animations.stand.play();
        setTimeout(() => {
          model1.animations.stand.stop();
        }, 3000);
      }
    );
  }
);
// let p2 = loadModel('./resources/model/modelv2_stand_with_punchv2.glb').then(
//   (result) => {
//     console.log(result);
//     model2 = result;
//     mixer = new THREE.AnimationMixer(model2.scene);
//     model2.scene.rotation.y = Math.PI;

//     model2.animations.stand = mixer.clipAction(model2.animations[10]);
//     model2.animations.stand.clampWhenFinished = true;
//     model2.animations.stand.setLoop(THREE.LoopRepeat);
//     loadModel('./resources/model/modelv2_run_with_punchv5.glb').then(
//       (runModel) => {
//         console.log(runModel);
//         model2.animations.runAndPunch = mixer.clipAction(
//           runModel.animations[0]
//         );
//         model2.animations.runAndPunch.clampWhenFinished = true;
//         model2.animations.runAndPunch.setLoop(THREE.LoopRepeat);
//         // model2.animations.stand.play();
//       }
//     );
//   }
// );

Promise.all([p1]).then(() => {
  model1.scene.position.set(0, 0, 0);
  // model2.scene.position.set(-5, 0, 0);
  //add model to the scene
  scene.add(model1.scene);
  // scene.add(model2.scene);
  window.setInterval(() => {
    checkCollision(model1, dummy1);
  }, 1000);
});

function updateMixer(deltaTime) {
  mixer.update(deltaTime);
}

joyStick.on('move', (event, data) => {
  if (model1) {
    model1.animations.stand.stop();
    model1.animations.runAndPunch.play();
    model1.animations.runAndPunch.setLoop(THREE.LoopRepeat);
    model1.scene.rotation.y = data.angle.radian + Math.PI / 2;
    velocity = findTriangleSide(data.angle.degree, data.distance);
    // model1.position.x += velocity.adjacent / 200;
    // model1.position.z += -(velocity.opposite / 200);
    // console.log(model1.scene.position);
    // console.log(model1.scene.position);
    // console.log(model1.sceneShape.position);
  }
});
joyStick.on('end', (event, data) => {
  if (model1) {
    velocity = null;
    model1.animations.runAndPunch.stop();
    model1.animations.runAndPunch.reset();
    model1.animations.stand.play();
  }
});

const light = new THREE.AmbientLight(0xffffff); // soft white light
scene.add(light);

render();
function render() {
  // setTimeout(function () {
  // }, 1000 / 30);
  requestAnimationFrame(render);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  // sphereMesh.position.copy(box.position);
  // sphereMesh.quaternion.copy(box.quaternion);
  if (mixer) updateMixer(delta);
  if (model1) {
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
    model1.scene.position.x += (velocity.adjacent / SPEED) * delta;
    model1.scene.position.z += -(velocity.opposite / SPEED) * delta;
    camera.position.x = model1.scene.position.x;
    camera.position.z = model1.scene.position.z + CAMERAOFFSET.z;
    socket.on('message', (text) => {
      console.log(text);
    });
    socket.emit('message', {
      position: model1.scene.position,
      rotation: model1.scene.rotation,
    });
    // camera.position.z -= (velocity.opposite / SPEED) * delta;
  }
}
function pushEnemyAway() {}
function checkCollision(mainTarget, secondTarget) {
  let mainTargetPos = calculateFourSide(mainTarget.scene.position);
  let pos = secondTarget.position;
  if (mainTargetPos[0].x < pos.x && mainTargetPos[1].x > pos.x) {
    if (
      mainTargetPos[0].z < pos.z &&
      mainTargetPos[1].z < pos.z &&
      mainTargetPos[2].z > pos.z &&
      mainTargetPos[3].z > pos.z
    ) {
      console.log('collision');
      applyForce(mainTarget.scene, secondTarget);
    }
  }
}
function calculateFourSide({ x, z }) {
  let hitBoxGrid = []; //[0] = A, [1] = B, [2] = C, [3] = D
  hitBoxGrid.push({
    x: x - HitBoxSideThreshold / 2,
    z: z - HitBoxSideThreshold / 2,
  });
  hitBoxGrid.push({
    x: x + HitBoxSideThreshold / 2,
    z: z - HitBoxSideThreshold / 2,
  });
  hitBoxGrid.push({
    x: x + HitBoxSideThreshold / 2,
    z: z,
  });
  hitBoxGrid.push({
    x: x - HitBoxSideThreshold / 2,
    z: z,
  });
  return hitBoxGrid;
}
function applyForce(firstTarget, secondTarget) {
  let force = 100;
  let a = secondTarget.position.x - firstTarget.position.x;
  let b = secondTarget.position.z - firstTarget.position.z;
  a = a > 5 ? 5 : a;
  b = b > 5 ? 5 : b;
  // let mass = Math.sqrt(a * a + b * b);
  // force /= mass;
  a = force / a;
  b = force / b;
  // secondTarget.applyForce(force);
}
