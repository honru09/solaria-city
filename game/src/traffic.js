// Solaria City - Ambient Traffic AI & Pedestrian Simulation System

import { CONFIG } from './config.js';
import { Vehicle } from './vehicles.js';

export class Pedestrian {
  constructor(scene, city, x, y, z) {
    this.scene = scene;
    this.city = city;
    this.position = { x, y: y || 0.35, z };
    this.heading = Math.random() * Math.PI * 2;
    this.speed = 2.2 + Math.random() * 1.2;
    this.health = 50;
    this.isDead = false;
    this.isFleeing = false;
    this.fleeTimer = 0;

    // Build 3D low poly pedestrian mesh
    this.group = new window.THREE.Group();
    this.buildMesh();
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.scene.add(this.group);
  }

  buildMesh() {
    const THREE = window.THREE;
    const skinColors = [0xf5d0b5, 0xdf9e76, 0x8d5524, 0xc68642];
    const shirtColors = [0xff6b6b, 0x48dbfb, 0x1dd1a1, 0xfeca57, 0x5f27cd, 0xff9ff3];
    const pantsColors = [0x341f97, 0x576574, 0x222f3e, 0xee5253];

    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColors[Math.floor(Math.random() * skinColors.length)],
      roughness: 0.8,
    });
    const shirtMat = new THREE.MeshStandardMaterial({
      color: shirtColors[Math.floor(Math.random() * shirtColors.length)],
      roughness: 0.7,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: pantsColors[Math.floor(Math.random() * pantsColors.length)],
      roughness: 0.8,
    });

    // Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.35), shirtMat);
    this.torso.position.y = 1.1;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Head
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), skinMat);
    this.head.position.y = 1.7;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Legs
    const legGeom = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    this.leftLeg = new THREE.Mesh(legGeom, pantsMat);
    this.leftLeg.position.set(-0.15, 0.4, 0);
    this.leftLeg.castShadow = true;

    this.rightLeg = new THREE.Mesh(legGeom, pantsMat);
    this.rightLeg.position.set(0.15, 0.4, 0);
    this.rightLeg.castShadow = true;

    this.group.add(this.leftLeg, this.rightLeg);
  }

  fleeFrom(dangerPos) {
    this.isFleeing = true;
    this.fleeTimer = 7.0; // Flee for 7 seconds
    this.speed = 6.8;     // Sprinting speed
    // Face opposite direction of danger
    const dx = this.position.x - dangerPos.x;
    const dz = this.position.z - dangerPos.z;
    this.heading = Math.atan2(dx, dz);
  }

  takeDamage(amount, onDeath) {
    if (this.isDead) return;
    this.health -= amount;
    this.fleeFrom(this.position);

    if (this.health <= 0) {
      this.isDead = true;
      // Fall over ragdoll
      this.group.rotation.x = Math.PI / 2;
      this.group.position.y = 0.2;
      if (onDeath) onDeath(this);
    }
  }

  update(delta) {
    if (this.isDead) return;

    if (this.isFleeing) {
      this.fleeTimer -= delta;
      if (this.fleeTimer <= 0) {
        this.isFleeing = false;
        this.speed = 2.4;
      }
    } else {
      // Occasional random turn
      if (Math.random() < 0.015) {
        this.heading += (Math.random() - 0.5) * 1.5;
      }
    }

    // Step forward
    const nextX = this.position.x + Math.sin(this.heading) * this.speed * delta;
    const nextZ = this.position.z + Math.cos(this.heading) * this.speed * delta;

    // Check collision with city walls
    const col = this.city.checkCollision(nextX, nextZ, 0.45);
    if (col) {
      this.heading += Math.PI * 0.75; // Turn around
    } else {
      this.position.x = nextX;
      this.position.z = nextZ;
    }

    // Walking animation
    const anim = performance.now() * 0.01 * (this.isFleeing ? 2.0 : 1.0);
    const swing = Math.sin(anim) * 0.4;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;

    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.y = this.heading;
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

export class TrafficManager {
  constructor(scene, city, vehicleManager, audio) {
    this.scene = scene;
    this.city = city;
    this.vehicleManager = vehicleManager;
    this.audio = audio;

    this.pedestrians = [];
    this.trafficCars = [];
    this.cashPickups = [];

    this.initTrafficCars(14);
    this.initPedestrians(28);
  }

  initTrafficCars(count) {
    const carTypes = ['venom', 'titan', 'viper', 'taxi'];
    for (let i = 0; i < count; i++) {
      // Resample so no traffic car spawns within 30m of the player start (10, -10)
      let roadPos = this.city.getRandomRoadPosition();
      for (let t = 0; t < 10; t++) {
        const dx = roadPos.x - 10;
        const dz = roadPos.z + 10;
        if (dx * dx + dz * dz >= 30 * 30) break;
        roadPos = this.city.getRandomRoadPosition();
      }
      const carType = carTypes[Math.floor(Math.random() * carTypes.length)];
      const cfg = CONFIG.VEHICLES[carType];
      const car = new Vehicle(this.scene, cfg, roadPos.x, roadPos.z, roadPos.dir);
      car.velocity = 12 + Math.random() * 8; // Ambient cruising speed
      car.cruiseSpeed = car.velocity; // Braking recovery target
      car.isOccupied = true; // Ambient NPC driver
      this.trafficCars.push(car);
      this.vehicleManager.vehicles.push(car);
    }
  }

  initPedestrians(count) {
    for (let i = 0; i < count; i++) {
      const swPos = this.city.getRandomSidewalkPosition();
      const ped = new Pedestrian(this.scene, this.city, swPos.x, swPos.y, swPos.z);
      this.pedestrians.push(ped);
    }
  }

  alertPedestriansNearby(pos, radius = 25) {
    this.pedestrians.forEach((p) => {
      const dx = p.position.x - pos.x;
      const dz = p.position.z - pos.z;
      if (dx * dx + dz * dz < radius * radius) {
        p.fleeFrom(pos);
      }
    });
  }

  spawnCashPickup(x, z, amount = 150) {
    const THREE = window.THREE;
    const group = new THREE.Group();
    const cashMat = new THREE.MeshBasicMaterial({ color: 0x2ed573 });
    const cashMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.35), cashMat);
    group.add(cashMesh);
    group.position.set(x, 0.45, z);
    this.scene.add(group);

    this.cashPickups.push({
      mesh: group,
      position: { x, z },
      amount,
      rotation: 0,
    });
  }

  checkHitscan(origin, dir, maxDist, damage, onCrimeCallback) {
    // 1. Check against Pedestrians
    for (let i = 0; i < this.pedestrians.length; i++) {
      const ped = this.pedestrians[i];
      if (ped.isDead) continue;
      const dx = ped.position.x - origin.x;
      const dz = ped.position.z - origin.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= maxDist) {
        // Dot product to check if in front of shooter
        const dot = (dx * dir.x + dz * dir.z) / dist;
        if (dot > 0.92) {
          ped.takeDamage(damage, (deadPed) => {
            this.spawnCashPickup(deadPed.position.x, deadPed.position.z, 200);
            if (onCrimeCallback) onCrimeCallback('murder');
          });
          this.alertPedestriansNearby(ped.position, 28);
          return true;
        }
      }
    }
    return false;
  }

  checkCarCollisionsWithPlayer(player, onPlayerHit) {
    if (!player || player.inVehicle) return;
    this.trafficCars.forEach((car) => {
      if (Math.abs(car.velocity) > 4) {
        const dx = player.position.x - car.position.x;
        const dz = player.position.z - car.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 2.2) {
          player.takeDamage(35);
          if (onPlayerHit) onPlayerHit();
        }
      }
    });
  }

  checkCarCollisionsWithPedestrians(playerVehicle, onCrimeCallback) {
    if (!playerVehicle || Math.abs(playerVehicle.velocity) < 6) return;
    this.pedestrians.forEach((ped) => {
      if (ped.isDead) return;
      const dx = ped.position.x - playerVehicle.position.x;
      const dz = ped.position.z - playerVehicle.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 2.5) {
        ped.takeDamage(100, (deadPed) => {
          this.spawnCashPickup(deadPed.position.x, deadPed.position.z, 150);
          if (onCrimeCallback) onCrimeCallback('hit_and_run');
        });
        if (this.audio) this.audio.playCrash(0.6);
        this.alertPedestriansNearby(playerVehicle.position, 30);
      }
    });
  }

  update(delta, player) {
    // 1. Update Pedestrians
    this.pedestrians.forEach((p) => p.update(delta));

    // 2. Update AI Traffic Cars
    this.trafficCars.forEach((car) => {
      if (car === this.vehicleManager.playerVehicle) return;

      // Simple AI Lane Following
      const forwardX = Math.sin(car.heading);
      const forwardZ = Math.cos(car.heading);

      // Simple braking: stop for the player or another traffic car close ahead,
      // then ease back up to cruise speed once the way is clear
      const isAhead = (tx, tz) => {
        const ox = tx - car.position.x;
        const oz = tz - car.position.z;
        const od = Math.sqrt(ox * ox + oz * oz);
        return od < 7 && od > 0.001 && (ox * forwardX + oz * forwardZ) / od > 0.8;
      };
      let blocked = player ? isAhead(player.position.x, player.position.z) : false;
      if (!blocked) {
        for (const other of this.trafficCars) {
          if (other === car) continue;
          if (isAhead(other.position.x, other.position.z)) {
            blocked = true;
            break;
          }
        }
      }
      if (blocked) {
        car.velocity = Math.max(0, car.velocity - 30 * delta);
      } else if (car.cruiseSpeed !== undefined && car.velocity < car.cruiseSpeed) {
        car.velocity = Math.min(car.cruiseSpeed, car.velocity + 10 * delta);
      }

      const nextX = car.position.x + forwardX * car.velocity * delta;
      const nextZ = car.position.z + forwardZ * car.velocity * delta;

      // Obstacle detection
      const col = this.city.checkCollision(nextX, nextZ, 1.6);
      if (col) {
        // Turn 90 degrees at boundary/intersection
        car.heading += Math.PI / 2;
        car.velocity *= 0.5;
      } else {
        car.position.x = nextX;
        car.position.z = nextZ;
      }

      car.group.position.set(car.position.x, car.position.y, car.position.z);
      car.group.rotation.y = car.heading;

      // Rotate wheels
      const wheelRoll = (car.velocity * delta) / 0.4;
      car.wheels.forEach((w) => {
        w.mesh.children[0].rotation.x += wheelRoll;
      });
    });

    // 3. Update Cash Pickups (Spin & Check Collect)
    for (let i = this.cashPickups.length - 1; i >= 0; i--) {
      const p = this.cashPickups[i];
      p.rotation += delta * 3.5;
      p.mesh.rotation.y = p.rotation;
      p.mesh.position.y = 0.45 + Math.sin(p.rotation * 1.5) * 0.12;

      // Collect near player
      const dx = player.position.x - p.position.x;
      const dz = player.position.z - p.position.z;
      if (dx * dx + dz * dz < 4.0) {
        player.cash += p.amount;
        if (this.audio) this.audio.playUIClick();
        this.scene.remove(p.mesh);
        this.cashPickups.splice(i, 1);
      }
    }
  }
}
