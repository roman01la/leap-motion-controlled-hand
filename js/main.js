/* global THREE, Leap */

var container, scene, renderer, camera, light, loader;
var WIDTH, HEIGHT, VIEW_ANGLE, ASPECT, NEAR, FAR;

var splash = document.querySelector('.splash'),
    splashMsg = document.querySelector('.splash h1');

splash.style.width = window.innerWidth + 'px';
splash.style.height = window.innerHeight + 'px';
splashMsg.style.top = (window.innerHeight - splashMsg.clientHeight) / 2 + 'px';

container = document.querySelector('.viewport');

WIDTH = window.innerWidth;
HEIGHT = window.innerHeight;

VIEW_ANGLE = 45;
ASPECT = WIDTH / HEIGHT;
NEAR = 1;
FAR = 10000;

// Setup scene
scene = new THREE.Scene();

renderer = new THREE.WebGLRenderer({antialias: true});

renderer.setSize(WIDTH, HEIGHT);
renderer.shadowMapEnabled = true;
renderer.shadowMapSoft = true;
renderer.shadowMapType = THREE.PCFShadowMap;
renderer.shadowMapAutoUpdate = true;

container.appendChild(renderer.domElement);

camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

camera.position.set(30, 10, 0);
camera.lookAt(scene.position);
camera.lookAt(scene.position);
scene.add(camera);

light = new THREE.DirectionalLight(0xffffff);

light.position.set(0, 300, 0);
light.castShadow = true;
light.shadowCameraLeft = -60;
light.shadowCameraTop = -60;
light.shadowCameraRight = 60;
light.shadowCameraBottom = 60;
light.shadowCameraNear = 1;
light.shadowCameraFar = 1000;
light.shadowBias = -0.0001;
light.shadowMapWidth = light.shadowMapHeight = 1024;
light.shadowDarkness = 0.7;

scene.add(light);

var loader = new THREE.JSONLoader();

// Load model
loader.load('/js/models/hand_rig.js', function (geometry, materials) {
  var hand, material;

  hand = new THREE.SkinnedMesh(
    geometry,
    new THREE.MeshFaceMaterial(materials)
  );

  material = hand.material.materials;

  for (var i = 0; i < materials.length; i++) {
    var mat = materials[i];

    mat.skinning = true;
  }

  hand.castShadow = true;
  hand.receiveShadow = true;

  scene.add(hand);

  render();

  // Init Leap
  Leap.loop(function (frame) {
    animate(frame, hand); // pass frame and hand model
  });
});

function render() {
  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function animate (frame, handMesh) {
  if (frame.hands.length > 0) { // do stuff if at least one hand is detected
    var leapHand = frame.hands[0], // grab the first hand
        leapFingers = frame.pointables, // grab fingers
        handObj, fingersObj;

    // grab, structure and apply hand position data
    handObj = {
      position: {
        z: -leapHand.palmPosition[0]/4,
        y: leapHand.palmPosition[1]/6-30,
        x: -leapHand.palmPosition[2]/4+10
      },
      rotation: {
        z: leapHand.palmNormal[2],
        y: leapHand.palmNormal[0],
        x: -Math.atan2(leapHand.palmNormal[0], leapHand.palmNormal[1]) + Math.PI
      },
      update: function() {
        var VectorDir = new THREE.Vector3(leapHand.direction[0], -leapHand.direction[1]+0.6, leapHand.direction[2]);

        handMesh.lookAt(VectorDir.add(handMesh.position)); // setup view
        handMesh.position = this.position; // apply position
        handMesh.bones[1].rotation.set(this.rotation.x, this.rotation.y, this.rotation.z); // apply rotation
      }
    };

    // grab, structure and apply fingers position data
    fingersObj = {
      update: function (boneNum, fingerNum, isThumb) {
        var bone = handMesh.bones[boneNum], // define main bone
            phalanges = [handMesh.bones[boneNum+1], handMesh.bones[boneNum+2]], // define phalanges bones
            finger = leapFingers[fingerNum], // grab finger
            dir = finger.direction; // grab direction

        // if current finger is thumb, use only one additional phalange
        if (!!isThumb) {
          phalanges = [handMesh.bones[boneNum+1]];
        }

        // make sure fingers won't go into weird position
        for (var i = 0, length = dir.length; i < length; i++) {
          if (dir[i] >= 0.1) {
            dir[i] = 0.1;
          }
        }

        bone.rotation.set(0, -dir[0], -dir[1]); // apply rotation to the main bone

        // apply rotation to additional phalanges
        for (var i = 0, length = phalanges.length; i < length; i++) {
          var phalange = phalanges[i];

          phalange.rotation.set(0, 0, -dir[1]);
        }
      },

      /*
       * define each finger and update its position
       * passing main bone number and finger number
       */
      fingers: {
        pinky: function() {
          fingersObj.update(3, 3);
        },
        ring: function() {
          fingersObj.update(7, 1);
        },
        mid: function() {
          fingersObj.update(11, 0);
        },
        index: function() {
          fingersObj.update(15, 2);
        },
        thumb: function() {
          fingersObj.update(19, 4, true);
        }
      },

      // update all fingers function
      updateAll: function() {
        var fingers = this.fingers;

        for (var finger in fingers) {
          fingers[finger]();
        }
      }
    };

    handObj.update(); // update hand postion

    // update fingers position if there are all five fingers is detected
    if (leapFingers.length === 5) {
      fingersObj.updateAll();
    }
  }
}

// define connection settings
var leap = new Leap.Controller({
  host: '127.0.0.1',
  port: 6437
});

// connection alerts
leap.on('connect', function() {
  splash.style.display = 'none';
});
leap.on('deviceConnected', function() {
  splash.style.display = 'none';
});
leap.on('deviceDisconnected', function() {
  splash.style.display = 'block';
});
leap.on('disconnect', function() {
  splash.style.display = 'block';
});

// connect controller
leap.connect();
