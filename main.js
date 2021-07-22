import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { io } from 'socket.io-client';
import nipplejs from 'nipplejs';
import './style.css';

let PLAYERS = [];
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
let velocity = { adjacent: null, opposite: null },
  rotation;
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
const radius = 4;
const generalMaterial = new THREE.MeshLambertMaterial({ color: 0xdddddd });
const normalMaterial = new THREE.MeshNormalMaterial();
const phongMaterial = new THREE.MeshPhongMaterial();

const planeGeometry = new THREE.PlaneGeometry(25, 25);
const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial);
planeMesh.rotateX(-Math.PI / 2);
planeMesh.receiveShadow = true;
scene.add(planeMesh);

const dummy1Geo = new THREE.SphereGeometry(radius / 2, 32, 32);
const dummy1 = new THREE.Mesh(dummy1Geo, generalMaterial);
dummy1.position.set(0, radius / 2, 5);
scene.add(dummy1);

const light = new THREE.AmbientLight(0xffffff); // soft white light
scene.add(light);

// const floorGeometry = new THREE.PlaneBufferGeometry(300, 300, 100, 100);
// floorGeometry.rotateX(-Math.PI / 2);
// const floor = new THREE.Mesh(floorGeometry, generalMaterial);
// floor.receiveShadow = true;
// scene.add(floor);

function loadModel(url) {
  return new Promise((resolve) => {
    new GLTFLoader().load(url, resolve);
  });
}

let model1,
  model2 = {};
let p1 = loadModel('./resources/model/modelv2_stand_with_punchv2.glb').then(
  (result) => {
    model1 = result;
    model1.mixer = new THREE.AnimationMixer(model1.scene);
    model1.scene.rotation.y = Math.PI;
    model1.animations.stand = model1.mixer.clipAction(model1.animations[10]);
    model1.animations.stand.clampWhenFinished = true;
    model1.animations.stand.setLoop(THREE.LoopRepeat);
    camera.lookAt(model1.scene.position);
    loadModel('./resources/model/modelv2_run_with_punchv5.glb').then(
      (runModel) => {
        model1.animations.runAndPunch = model1.mixer.clipAction(
          runModel.animations[0]
        );
        model1.animations.runAndPunch.clampWhenFinished = true;
        model1.animations.runAndPunch.setLoop(THREE.LoopRepeat);
        model1.animations.stand.play();
      }
    );
  }
);

class Player {
  constructor(uuid, position, rotation) {
    this._promise = loadModel(
      './resources/model/modelv2_stand_with_punchv2.glb'
    ).then((result) => {
      this.scene = result.scene;
      this.animations = result.animations;
      this.mixer = new THREE.AnimationMixer(this.scene);
      this.scene.rotation.y = Math.PI;
      this.scene.name = uuid;
      this.animations.stand = this.mixer.clipAction(this.animations[10]);
      this.animations.stand.clampWhenFinished = true;
      this.animations.stand.setLoop(THREE.LoopRepeat);
      camera.lookAt(this.scene.position);
      loadModel('./resources/model/modelv2_run_with_punchv5.glb').then(
        (runModel) => {
          this.animations.runAndPunch = this.mixer.clipAction(
            runModel.animations[0]
          );
          this.animations.runAndPunch.clampWhenFinished = true;
          this.animations.runAndPunch.setLoop(THREE.LoopRepeat);
          this.animations.stand.play();
        }
      );
    });
  }
}
Promise.all([p1]).then(() => {
  // model1.scene.position.set(0, 0, 0);
  // model1.scene.name = socket.id;
  // model2.scene = new THREE.Group();
  // model2.scene.copy(model1.scene);
  // console.log(model2);
  // console.log(model1.scene);
  let model3 = new Player(
    model1.scene.name,
    model1.scene.position,
    model1.scene.rotation
  );
  console.log(model3);
  // scene.add(model3.scene);
  socket.on('players', (res) => {
    PLAYERS = res;
    res.map((el, index) => {
      el.scene = model1.scene;
    });
  });
  socket.emit('playerAdd', {
    uuid: model1.scene.name,
    position: model1.scene.position,
    rotation: model1.scene.rotation,
  });
  window.setInterval(() => {
    PLAYERS.map((el, index) => {
      checkCollision(model1, dummy1);
    });
  }, 1000);
});

socket.on('players', (res) => {});

joyStick.on('move', (event, data) => {
  if (model1) {
    rotation = data.angle.radian + Math.PI / 2;
    velocity = findTriangleSide(data.angle.degree, data.distance);
    // console.log(model1.scene.position);
    // console.log(model1.scene.position);
    // console.log(model1.sceneShape.position);
  }
});
joyStick.on('end', (event, data) => {
  if (model1) {
    velocity.adjacent = velocity.opposite = null;
    model1.animations.runAndPunch.stop();
    model1.animations.runAndPunch.reset();
    model1.animations.stand.play();
  }
});

function updateMixer(deltaTime) {
  model1.mixer.update(deltaTime);
}

function updatePlayer(uuid, pos, rotationY) {
  uuid.scene.position.copy(pos);
  uuid.scene.rotation.y = rotationY;
}

function movePlayer(player, delta) {
  if (velocity.opposite && velocity.adjacent) {
    console.log(player.scene.position);
    if (
      player.scene.position.x < 13 &&
      player.scene.position.x > -13 &&
      player.scene.position.z < 13 &&
      player.scene.position.z > -13
    ) {
      player.animations.stand.stop();
      player.animations.runAndPunch.play();
      player.animations.runAndPunch.setLoop(THREE.LoopRepeat);
      player.scene.rotation.y = rotation;
      player.scene.position.x += (velocity.adjacent / SPEED) * delta;
      player.scene.position.z += -(velocity.opposite / SPEED) * delta;
      camera.position.x = player.scene.position.x;
      camera.position.z = player.scene.position.z + CAMERAOFFSET.z;
      socket.emit('playerMove', {
        uuid: player.scene.name,
        position: player.scene.position,
        rotation: player.scene.rotation,
      });
    }
    // camera.position.z -= (velocity.opposite / SPEED) * delta;
  }
}
function pushEnemyAway() {}
function checkCollision(mainTarget, secondTarget) {
  const force = 1;
  let { distance, radian, a, b } = findDistanceRadianBetweenPoints(
    mainTarget.scene.position,
    secondTarget.position
  );
  if (distance < PUSHRANGE) {
    // && (a > 2 || b > 2 || a < -2 || b < -2)
    if (
      mainTarget.scene.rotation.y + PUSHRADIAN / 2 > radian &&
      mainTarget.scene.rotation.y - PUSHRADIAN / 2 < radian
    ) {
      // let forceX = force / a;
      // let forceZ = force / b;
      console.log('collision', a, b);
      console.log(secondTarget.position);
      secondTarget.position.x += a;
      secondTarget.position.z += b;
      // console.log(secondTarget.position);

      //     applyForce(mainTarget.scene, secondTarget);
    }
  }
}
function findDistanceRadianBetweenPoints(pointOne, pointTwo) {
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
//working example without collision and physic

render();
function render() {
  requestAnimationFrame(render);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;

  // sphereMesh.position.copy(box.position);
  // sphereMesh.quaternion.copy(box.quaternion);
  if (model1) {
    if (model1.mixer) updateMixer(delta);
    // camera.position.x = modelBox.position.x;
    // camera.position.z = modelBox.position.z + CAMERAOFFSET.z;
    movePlayer(model1, delta);
    // if (pushVelocity) {
    // }
  }
  prevTime = time;
  renderer.render(scene, camera);
}
