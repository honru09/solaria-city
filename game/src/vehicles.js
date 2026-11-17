// Solaria City - Procedural 3D Vehicles & Arcade Physics Engine

import { CONFIG } from './config.js';

export class Vehicle {
  constructor(scene, config, x = 0, z = 0, heading = 0) {
    this.scene = scene;
    this.config = config;
    this.id = 'veh_' + Math.random().toString(36).substring(2, 8);

    // Physics State
    this.position = { x, y: 0.35, z };
    this.velocity = 0;       // Current forward speed
    this.steeringAngle = 0;  // Front wheel steer angle
    this.heading = heading;  // Facing yaw angle (radians)
    this.health = 100;
    this.driver = null;      // Player or AI NPC
    this.isOccupied = false;
    this.isPolice = config.isPolice || false;
    this.sirenActive = this.isPolice;

    // Visual Roll & Pitch (suspension dynamics)
    this.chassisRoll = 0;
    this.chassisPitch = 0;

    // Lights
    this.headlights = [];
    this.brakeLights = [];
    this.sirenLights = [];
    this.sirenTimer = 0;

    // Build 3D Mesh
    this.group = new window.THREE.Group();
    this.wheels = [];
    this.buildMesh();

    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.y = this.heading;
    this.scene.add(this.group);
  }

  buildMesh() {
    const THREE = window.THREE;
    const { bodyColor, accentColor, type } = this.config;

    // 1. Chassis Body
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.25,
      metalness: 0.65,
    });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.1 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x1a252f,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85,
    });

    this.chassisGroup = new THREE.Group();

    // Main lower body
    let bodyWidth = 2.1;
    let bodyLength = 4.4;
    let bodyHeight = 0.9;

    if (type === 'suv') {
      bodyWidth = 2.3;
      bodyLength = 4.7;
      bodyHeight = 1.3;
    } else if (type === 'sports') {
      bodyWidth = 2.15;
      bodyLength = 4.3;
      bodyHeight = 0.75;
    }

    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength), bodyMat);
    mainBody.position.y = bodyHeight / 2 + 0.35;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    this.chassisGroup.add(mainBody);

    // Cabin / Roof
    let cabinWidth = bodyWidth * 0.82;
    let cabinLength = bodyLength * 0.52;
    let cabinHeight = type === 'suv' ? 1.0 : 0.72;
    let cabinOffsetZ = -0.15;

    if (type === 'sports') {
      cabinLength = bodyLength * 0.42;
      cabinOffsetZ = -0.3;
    }

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength), glassMat);
    cabin.position.set(0, bodyHeight + 0.35 + cabinHeight / 2, cabinOffsetZ);
    cabin.castShadow = true;
    this.chassisGroup.add(cabin);

    // Roof cap
    const roof = new THREE.Mesh(new THREE.BoxGeometry(cabinWidth * 0.95, 0.1, cabinLength * 0.9), bodyMat);
    roof.position.set(0, bodyHeight + 0.35 + cabinHeight + 0.05, cabinOffsetZ);
    this.chassisGroup.add(roof);

    // Special Addons
    if (type === 'police') {
      // White door panels
      const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth + 0.02, bodyHeight * 0.8, 1.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      doorPanel.position.set(0, bodyHeight / 2 + 0.35, 0);
      this.chassisGroup.add(doorPanel);

      // Lightbar on roof
      const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 0.4), blackMat);
      barBase.position.set(0, bodyHeight + 0.35 + cabinHeight + 0.15, cabinOffsetZ);
      this.chassisGroup.add(barBase);

      const redLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.35), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      redLight.position.set(-0.35, bodyHeight + 0.35 + cabinHeight + 0.2, cabinOffsetZ);
      const blueLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.35), new THREE.MeshBasicMaterial({ color: 0x0055ff }));
      blueLight.position.set(0.35, bodyHeight + 0.35 + cabinHeight + 0.2, cabinOffsetZ);
      this.chassisGroup.add(redLight, blueLight);
      this.sirenLights = [redLight, blueLight];
    } else if (type === 'taxi') {
      // Yellow Taxi Roof Sign
      const signMat = new THREE.MeshBasicMaterial({ color: 0xfffa65 });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.35), signMat);
      sign.position.set(0, bodyHeight + 0.35 + cabinHeight + 0.22, cabinOffsetZ);
      this.chassisGroup.add(sign);
    } else if (type === 'sports') {
      // Rear Spoiler
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
      const wing = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.95, 0.08, 0.45), wingMat);
      wing.position.set(0, bodyHeight + 0.8, -bodyLength / 2 + 0.25);
      this.chassisGroup.add(wing);
    }

    // Headlights (Front is +Z)
    const hlGeom = new THREE.BoxGeometry(0.4, 0.2, 0.1);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const hlLeft = new THREE.Mesh(hlGeom, hlMat);
    hlLeft.position.set(-bodyWidth * 0.35, bodyHeight * 0.65 + 0.2, bodyLength / 2 + 0.02);
    const hlRight = new THREE.Mesh(hlGeom, hlMat);
    hlRight.position.set(bodyWidth * 0.35, bodyHeight * 0.65 + 0.2, bodyLength / 2 + 0.02);
    this.chassisGroup.add(hlLeft, hlRight);
    this.headlights = [hlLeft, hlRight];

    // Taillights (Rear is -Z)
    const tlGeom = new THREE.BoxGeometry(0.45, 0.2, 0.1);
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xcc0000 });
    const tlLeft = new THREE.Mesh(tlGeom, tlMat);
    tlLeft.position.set(-bodyWidth * 0.35, bodyHeight * 0.65 + 0.2, -bodyLength / 2 - 0.02);
    const tlRight = new THREE.Mesh(tlGeom, tlMat);
    tlRight.position.set(bodyWidth * 0.35, bodyHeight * 0.65 + 0.2, -bodyLength / 2 - 0.02);
    this.chassisGroup.add(tlLeft, tlRight);
    this.brakeLights = [tlLeft, tlRight];

    this.group.add(this.chassisGroup);

    // 2. Wheels (4 Cylinders)
    const wheelRadius = type === 'suv' ? 0.48 : 0.38;
    const wheelWidth = 0.32;
    const wheelGeom = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    wheelGeom.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
    const rimMat = chromeMat;

    const wheelOffsets = [
      { x: -bodyWidth / 2 - 0.05, z: bodyLength * 0.32, isFront: true },  // Front Left
      { x: bodyWidth / 2 + 0.05, z: bodyLength * 0.32, isFront: true },   // Front Right
      { x: -bodyWidth / 2 - 0.05, z: -bodyLength * 0.32, isFront: false },// Rear Left
      { x: bodyWidth / 2 + 0.05, z: -bodyLength * 0.32, isFront: false }, // Rear Right
    ];

    wheelOffsets.forEach((wo) => {
      const wheelGroup = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeom, tireMat);
      tire.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius * 0.55, wheelRadius * 0.55, wheelWidth + 0.02, 8), rimMat);
      rim.rotateZ(Math.PI / 2);
      wheelGroup.add(tire, rim);

      wheelGroup.position.set(wo.x, wheelRadius, wo.z);
      this.group.add(wheelGroup);
      this.wheels.push({ mesh: wheelGroup, isFront: wo.isFront, radius: wheelRadius });
    });
  }

  updatePhysics(delta, input, city, audio) {
    const { topSpeed, accel, braking, turnSpeed } = this.config;

    // 1. Acceleration & Braking
    let throttle = 0;
    let brake = false;
    let handbrake = false;

    if (input) {
      if (input.forward) throttle += 1;
      if (input.backward) throttle -= 0.6;
      if (input.brake) handbrake = true;
    }

    if (throttle > 0) {
      this.velocity += accel * delta * throttle;
      if (this.velocity > topSpeed) this.velocity = topSpeed;
    } else if (throttle < 0) {
      this.velocity += accel * delta * throttle * 0.6;
      if (this.velocity < -topSpeed * 0.35) this.velocity = -topSpeed * 0.35;
    } else {
      // Natural friction deceleration
      const friction = handbrake ? 35 : 12;
      if (this.velocity > 0) {
        this.velocity = Math.max(0, this.velocity - friction * delta);
      } else if (this.velocity < 0) {
        this.velocity = Math.min(0, this.velocity + friction * delta);
      }
    }

    // Handbrake / Drift
    if (handbrake && Math.abs(this.velocity) > 6) {
      if (audio && Math.random() > 0.65) audio.playTireScreech();
    }

    // 2. Steering & Heading
    let steerInput = 0;
    if (input) {
      if (input.left) steerInput += 1;
      if (input.right) steerInput -= 1;
    }

    const targetSteer = steerInput * 0.55;
    this.steeringAngle += (targetSteer - this.steeringAngle) * delta * 8;

    // Turn vehicle only if moving
    const speedRatio = this.velocity / topSpeed;
    if (Math.abs(this.velocity) > 0.2) {
      const turnFactor = handbrake ? 1.55 : 1.0;
      const turnSign = this.velocity >= 0 ? 1 : -1;
      this.heading += this.steeringAngle * turnSpeed * turnFactor * turnSign * delta * Math.min(1.0, Math.abs(this.velocity) / 6);
    }

    // 3. Position Translation & Collision with City
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    const nextX = this.position.x + forwardX * this.velocity * delta;
    const nextZ = this.position.z + forwardZ * this.velocity * delta;

    const col = city.checkCollision(nextX, nextZ, 1.4);
    if (col) {
      // Crash impact!
      if (Math.abs(this.velocity) > 6) {
        if (audio) audio.playCrash(Math.abs(speedRatio));
        this.health -= Math.floor(Math.abs(this.velocity) * 1.5);
      }
      this.velocity = -this.velocity * 0.3; // Bounce back
    } else {
      this.position.x = nextX;
      this.position.z = nextZ;
    }

    // 4. Update Wheels Visuals
    const wheelRoll = (this.velocity * delta) / 0.4;
    this.wheels.forEach((w) => {
      w.mesh.children[0].rotation.x += wheelRoll;
      if (w.isFront) {
        w.mesh.rotation.y = this.steeringAngle;
      }
    });

    // 5. Suspension Body Roll & Pitch
    this.chassisRoll += (-this.steeringAngle * speedRatio * 0.12 - this.chassisRoll) * delta * 6;
    this.chassisPitch += (throttle * 0.05 - this.chassisPitch) * delta * 6;
    this.chassisGroup.rotation.z = this.chassisRoll;
    this.chassisGroup.rotation.x = this.chassisPitch;

    // 6. Update Police Siren Lightbar
    if (this.isPolice && this.sirenActive && this.sirenLights.length === 2) {
      this.sirenTimer += delta * 12;
      const flash = Math.sin(this.sirenTimer) > 0;
      this.sirenLights[0].material.color.setHex(flash ? 0xff0000 : 0x330000);
      this.sirenLights[1].material.color.setHex(!flash ? 0x0055ff : 0x001133);
    }

    // Update Transform
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.y = this.heading;
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

export class VehicleManager {
  constructor(scene, city, audio) {
    this.scene = scene;
    this.city = city;
    this.audio = audio;
    this.vehicles = [];
    this.playerVehicle = null;

    this.spawnInitialParkedCars();
  }

  spawnInitialParkedCars() {
    // No parked police cars: cruisers only ever come from the wanted system
    const keys = Object.keys(CONFIG.VEHICLES).filter((k) => k !== 'cruiser');
    // Spawn 10 parked vehicles along curbs
    for (let i = 0; i < 10; i++) {
      // Resample so nothing parks within 25m of the player start (10, -10)
      let roadPos = this.city.getRandomRoadPosition();
      for (let t = 0; t < 8; t++) {
        const dx = roadPos.x + 2.5 - 10;
        const dz = roadPos.z + 10;
        if (dx * dx + dz * dz >= 25 * 25) break;
        roadPos = this.city.getRandomRoadPosition();
      }
      const carKey = keys[i % keys.length];
      const cfg = CONFIG.VEHICLES[carKey];
      // Offset to curb
      const car = new Vehicle(this.scene, cfg, roadPos.x + 2.5, roadPos.z, roadPos.dir);
      this.vehicles.push(car);
    }

    // Spawn a guaranteed Solaria Venom GT near player start for fun
    const venomCfg = CONFIG.VEHICLES.venom;
    const showcaseVenom = new Vehicle(this.scene, venomCfg, 15, -15, 0);
    this.vehicles.push(showcaseVenom);
  }

  spawnPoliceCruiser(x, z, heading = 0) {
    const cruiserCfg = CONFIG.VEHICLES.cruiser;
    const policeCar = new Vehicle(this.scene, cruiserCfg, x, z, heading);
    policeCar.isPolice = true;
    policeCar.sirenActive = true;
    this.vehicles.push(policeCar);
    return policeCar;
  }

  getNearestVehicle(pos, maxDist = 4.5) {
    let nearest = null;
    let minDist = maxDist;

    for (let i = 0; i < this.vehicles.length; i++) {
      const v = this.vehicles[i];
      const dx = v.position.x - pos.x;
      const dz = v.position.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        nearest = v;
      }
    }
    return nearest;
  }

  update(delta, playerInput) {
    this.vehicles.forEach((veh) => {
      if (veh === this.playerVehicle) {
        veh.updatePhysics(delta, playerInput, this.city, this.audio);
        if (this.audio) {
          const speedRatio = Math.abs(veh.velocity) / veh.config.topSpeed;
          this.audio.updateEngine(speedRatio, playerInput.forward);
        }
      }
    });

    // Check collisions between vehicles
    for (let i = 0; i < this.vehicles.length; i++) {
      for (let j = i + 1; j < this.vehicles.length; j++) {
        const v1 = this.vehicles[i];
        const v2 = this.vehicles[j];
        const dx = v2.position.x - v1.position.x;
        const dz = v2.position.z - v1.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 3.2 && dist > 0.001) {
          // Push apart
          const nx = dx / dist;
          const nz = dz / dist;
          v1.position.x -= nx * 0.1;
          v1.position.z -= nz * 0.1;
          v2.position.x += nx * 0.1;
          v2.position.z += nz * 0.1;
          v1.velocity *= 0.5;
          v2.velocity *= 0.5;
        }
      }
    }
  }
}
