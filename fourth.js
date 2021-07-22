import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { io } from 'socket.io-client';
import nipplejs from 'nipplejs';
import './style.css';
import {
  Plane,
  Body,
  Sphere,
  Vec3,
  World,
  Quaternion,
  Cylinder,
} from 'cannon-es';
import { VERSION } from 'rollup';

const socket = io('ws://localhost:8000');
const SPEED = 15;
const CAMERAOFFSET = { z: 6 };
const DAMPING = 0.5;
const HitBoxSideThreshold = 10;
const PUSHRANGE = 3;
const PUSHRADIUS = 120;
const PUSHRADIAN = PUSHRADIUS * (Math.PI / 180);
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
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
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
const world = new World();
world.gravity.set(0, -9.82, 0);

const radius = 4;

// let terrain = new THREE.GridHelper(100, 20, 0x0a0a0a, 0x0a0a0a);
// terrain.position.set(0, 0, 0);
// scene.add(terrain);

const generalMaterial = new THREE.MeshLambertMaterial({ color: 0xdddddd });
const normalMaterial = new THREE.MeshNormalMaterial();
const phongMaterial = new THREE.MeshPhongMaterial();

const planeGeometry = new THREE.PlaneGeometry(25, 25);
const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
planeMesh.rotateX(-Math.PI / 2);
planeMesh.receiveShadow = true;
scene.add(planeMesh);
const planeShape = new Plane();
const planeBody = new Body({ mass: 0 });
planeBody.addShape(planeShape);
planeBody.quaternion.setFromAxisAngle(new Vec3(1, 0, 0), -Math.PI / 2);
world.addBody(planeBody);

const sphereGeometry = new THREE.SphereGeometry(radius / 2);
const sphereMesh = new THREE.Mesh(sphereGeometry, generalMaterial);
sphereMesh.position.set(-2, radius, 5);
scene.add(sphereMesh);
const sphereShape = new Sphere(radius / 2);
const sphereBody = new Body({ mass: 1 });
sphereBody.addShape(sphereShape);
sphereBody.position.x = sphereMesh.position.x;
sphereBody.position.y = sphereMesh.position.y;
sphereBody.position.z = sphereMesh.position.z;
world.addBody(sphereBody);

const model1Shape = new Cylinder(1, 1, 2, 6);
const model1Body = new Body({ mass: 1 });
const model1Quaternion = new Quaternion();
model1Quaternion.setFromAxisAngle(new Vec3(1, 0, 0), Math.PI / 2);
model1Body.addShape(model1Shape, new Vec3(), model1Quaternion);
world.addBody(model1Body);
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
  model1.scene.position.set(0, 3, 0);
  model1Body.position.x = model1.scene.position.x;
  model1Body.position.y = model1.scene.position.y;
  model1Body.position.z = model1.scene.position.z;
  // model2.scene.position.set(-5, 0, 0);
  //add model to the scene
  scene.add(model1.scene);
  // scene.add(model2.scene);
  window.setInterval(() => {
    checkCollision(model1, sphereBody);
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
    // model1.scene.rotation.y = data.angle.radian + Math.PI / 2;
    var axis = new Vec3(0, 1, 0);
    var angle = data.angle.radian + Math.PI / 2;
    model1Body.quaternion.setFromAxisAngle(axis, angle);

    velocity = findTriangleSide(data.angle.degree, data.distance);
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
    world.step(delta);
    model1.scene.position.copy(model1Body.position);
    model1.scene.quaternion.copy(model1Body.quaternion);
    sphereMesh.position.copy(sphereBody.position);
    sphereMesh.quaternion.copy(sphereBody.quaternion);
    // camera.position.x = modelBox.position.x;
    // camera.position.z = modelBox.position.z + CAMERAOFFSET.z;
    movePlayer(model1Body, delta);
  }
  prevTime = time;
  renderer.render(scene, camera);
}

function movePlayer(player, delta) {
  if (velocity) {
    // model1.scene.position.x += (velocity.adjacent / SPEED) * delta;
    // model1.scene.position.z += -(velocity.opposite / SPEED) * delta;
    player.position.x += (velocity.adjacent / SPEED) * delta;
    player.position.z += -(velocity.opposite / SPEED) * delta;
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + CAMERAOFFSET.z;
    socket.on('message', (text) => {
      console.log(text);
    });
    socket.emit('message', {
      position: player.position,
      rotation: player.rotation,
    });
    // camera.position.z -= (velocity.opposite / SPEED) * delta;
  }
}
function pushEnemyAway() {}
function checkCollision(mainTarget, secondTargetBody) {
  const force = 100;
  let { distance, radian, a, b } = calculateDistanceAndRadianBetweenTwoPoints(
    mainTarget.scene.position,
    secondTargetBody.position
  );
  a = force / a;
  b = force / b;
  if (distance < PUSHRANGE) {
    if (
      mainTarget.scene.rotation.y + PUSHRADIAN / 2 > radian &&
      mainTarget.scene.rotation.y - PUSHRADIAN / 2 < radian
    ) {
      console.log('collision');
      secondTargetBody.applyForce(new Vec3(a, 0, b));
    }
  }
}
function calculateDistanceAndRadianBetweenTwoPoints(pointOne, pointTwo) {
  let a = pointTwo.x - pointOne.x;
  let b = pointTwo.z - pointOne.z;
  let temp = Math.atan2(b * -1, a);
  if (temp < 0) {
    temp += Math.PI * 2;
  }
  return {
    distance: Math.sqrt(a * a + b * b),
    radian: temp + Math.PI / 2,
    a,
    b,
  };
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
// function applyForce(firstTarget, secondTarget) {
//   let force = 100;
//   let a = secondTarget.position.x - firstTarget.position.x;
//   let b = secondTarget.position.z - firstTarget.position.z;
//   a = force / a;
//   b = force / b;
//   secondTarget.applyForce(new Vec3(a, 0, b));
//   // secondTarget.applyForce(force);
// }
//version2 somewhat working example with physics, collision etc.
