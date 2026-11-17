// Solaria City - Wanted System & Police Pursuit Law Enforcement Engine

import { CONFIG } from './config.js';

export class PoliceOfficer {
  constructor(scene, city, x, y, z) {
    this.scene = scene;
    this.city = city;
    this.position = { x, y: y || 0.35, z };
    this.heading = 0;
    this.health = 80;
    this.isDead = false;
    this.shootTimer = 1.0;

    this.group = new window.THREE.Group();
    this.buildMesh();
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.scene.add(this.group);
  }

  buildMesh() {
    const THREE = window.THREE;
    const uniformMat = new THREE.MeshStandardMaterial({ color: 0x192a56, roughness: 0.6 }); // Navy blue uniform
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdf9e76, roughness: 0.8 });
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0xf1c40f }); // Gold badge

    // Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.85, 0.4), uniformMat);
    this.torso.position.y = 1.2;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Gold badge on chest
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.05), badgeMat);
    badge.position.set(0.18, 1.4, 0.22);
    this.group.add(badge);

    // Head & Cap
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.38), skinMat);
    this.head.position.y = 1.85;
    this.head.castShadow = true;

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.46), uniformMat);
    cap.position.set(0, 0.2, 0.04);
    this.head.add(cap);
    this.group.add(this.head);

    // Legs
    const legGeom = new THREE.BoxGeometry(0.24, 0.8, 0.24);
    this.leftLeg = new THREE.Mesh(legGeom, uniformMat);
    this.leftLeg.position.set(-0.16, 0.42, 0);
    this.rightLeg = new THREE.Mesh(legGeom, uniformMat);
    this.rightLeg.position.set(0.16, 0.42, 0);
    this.group.add(this.leftLeg, this.rightLeg);
  }

  takeDamage(amount, onDeath) {
    if (this.isDead) return;
    this.health -= amount;
    if (this.health <= 0) {
      this.isDead = true;
      this.group.rotation.x = Math.PI / 2;
      this.group.position.y = 0.2;
      if (onDeath) onDeath(this);
    }
  }

  update(delta, player, audio) {
    if (this.isDead || !player) return;

    // Face player
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    this.heading = Math.atan2(dx, dz);
    this.group.rotation.y = this.heading;

    // Advance towards player if far
    if (dist > 12) {
      this.position.x += Math.sin(this.heading) * 4.5 * delta;
      this.position.z += Math.cos(this.heading) * 4.5 * delta;
    } else if (dist < 40) {
      // Shoot at player
      this.shootTimer -= delta;
      if (this.shootTimer <= 0) {
        this.shootTimer = 1.2 + Math.random() * 0.8;
        if (audio) audio.playGunshot();
        player.takeDamage(14);
      }
    }

    this.group.position.set(this.position.x, this.position.y, this.position.z);
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

export class PoliceManager {
  constructor(scene, city, vehicleManager, audio) {
    this.scene = scene;
    this.city = city;
    this.vehicleManager = vehicleManager;
    this.audio = audio;

    this.wantedStars = 0;
    this.decayTimer = 0;
    this.isFlashing = false;
    this.flashTimer = 0;

    this.policeCars = [];
    this.policeOfficers = [];
    this.bustedTimer = 0;
    this.isBusted = false;

    // Last known player position (used to spawn cruisers at a distance)
    this.lastPlayerPos = { x: 10, z: -10 };
  }

  addWantedStars(count = 1) {
    this.wantedStars = Math.min(5, this.wantedStars + count);
    this.decayTimer = CONFIG.WANTED.DECAY_TIME_SECONDS;
    this.isFlashing = false;

    // Siren start/volume is managed centrally in update() by distance.
    this.spawnCruisersForWantedLevel();
  }

  reportCrime(crimeType, location) {
    if (crimeType === 'theft') {
      this.addWantedStars(1);
    } else if (crimeType === 'gunshot') {
      if (this.wantedStars === 0 && Math.random() > 0.4) {
        this.addWantedStars(1);
      }
    } else if (crimeType === 'hit_and_run') {
      this.addWantedStars(2);
    } else if (crimeType === 'murder') {
      this.addWantedStars(2);
    }
  }

  clearWanted() {
    this.wantedStars = 0;
    this.decayTimer = 0;
    this.isFlashing = false;

    // Despawn police cruisers
    this.policeCars.forEach((c) => c.destroy());
    this.policeCars = [];

    // Despawn police officers
    this.policeOfficers.forEach((o) => o.destroy());
    this.policeOfficers = [];

    if (this.audio) {
      this.audio.stopSiren();
    }
  }

  spawnCruisersForWantedLevel() {
    const targetCount = CONFIG.WANTED.LEVELS[this.wantedStars].policeCount;
    while (this.policeCars.length < targetCount) {
      // Sample road positions: cruisers must arrive from 45-100m away,
      // never spawn next to the player. Fallback is the farthest sample.
      let best = null;
      let bestDist = -1;
      for (let i = 0; i < 12; i++) {
        const sample = this.city.getRandomRoadPosition();
        const dx = sample.x - this.lastPlayerPos.x;
        const dz = sample.z - this.lastPlayerPos.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d > bestDist) {
          bestDist = d;
          best = sample;
        }
        if (d >= 45 && d <= 100) {
          best = sample;
          break;
        }
      }
      const cruiser = this.vehicleManager.spawnPoliceCruiser(best.x, best.z, best.dir);
      this.policeCars.push(cruiser);
    }

    // Spawn foot officers at 3+ stars
    if (this.wantedStars >= 3 && this.policeOfficers.length < 3) {
      const swPos = this.city.getRandomSidewalkPosition();
      const officer = new PoliceOfficer(this.scene, this.city, swPos.x, swPos.y, swPos.z);
      this.policeOfficers.push(officer);
    }
  }

  checkHitscan(origin, dir, maxDist, damage) {
    for (let i = 0; i < this.policeOfficers.length; i++) {
      const off = this.policeOfficers[i];
      if (off.isDead) continue;
      const dx = off.position.x - origin.x;
      const dz = off.position.z - origin.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= maxDist) {
        const dot = (dx * dir.x + dz * dir.z) / dist;
        if (dot > 0.9) {
          off.takeDamage(damage, () => {
            this.addWantedStars(1); // Killing police escalates wanted level!
          });
          return true;
        }
      }
    }
    return false;
  }

  update(delta, player) {
    if (!player) return;

    // Track the player's position for distance-based cruiser spawns
    this.lastPlayerPos.x = player.position.x;
    this.lastPlayerPos.z = player.position.z;

    // 1. Wanted Decay / Evade logic
    if (this.wantedStars > 0) {
      // Check distance to closest active police
      let closestDist = 999;
      this.policeCars.forEach((car) => {
        const dx = player.position.x - car.position.x;
        const dz = player.position.z - car.position.z;
        closestDist = Math.min(closestDist, Math.sqrt(dx * dx + dz * dz));
      });

      if (closestDist > 65) {
        // Player broke line of sight / out of search radius -> stars flash!
        this.isFlashing = true;
        this.flashTimer += delta * 4;
        this.decayTimer -= delta;

        if (this.decayTimer <= 0) {
          this.clearWanted(); // Escaped!
          if (this.audio) this.audio.playMissionPass();
        }
      } else {
        // Spotted again -> reset decay
        this.isFlashing = false;
        this.decayTimer = CONFIG.WANTED.DECAY_TIME_SECONDS;
      }
    }

    // 2. Police Cruiser Pursuit AI
    const maxChaseSpeed = 24 + this.wantedStars * 3;
    this.policeCars.forEach((car) => {
      if (car === this.vehicleManager.playerVehicle) return; // Player stole cruiser

      const dx = player.position.x - car.position.x;
      const dz = player.position.z - car.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Steer towards player with a capped turn rate (arcs, not instant spins)
      const targetAngle = Math.atan2(dx, dz);
      let angleDiff = targetAngle - car.heading;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      const maxTurnStep = 2.2 * delta;
      car.heading += Math.max(-maxTurnStep, Math.min(maxTurnStep, angleDiff));

      // Distance-based target speed: full chase when far, ease to a stop near the player
      const stopDist = player.inVehicle ? 8 : 6;
      let desiredSpeed = maxChaseSpeed;
      if (dist <= 40) {
        desiredSpeed = Math.max(0, Math.min(maxChaseSpeed, (dist - stopDist) * 0.9));
      }

      // Separation: brake when another cruiser is close ahead
      const fwdX = Math.sin(car.heading);
      const fwdZ = Math.cos(car.heading);
      for (const other of this.policeCars) {
        if (other === car || other === this.vehicleManager.playerVehicle) continue;
        const ox = other.position.x - car.position.x;
        const oz = other.position.z - car.position.z;
        const od = Math.sqrt(ox * ox + oz * oz);
        if (od < 5 && od > 0.001 && (ox * fwdX + oz * fwdZ) / od > 0.7) {
          desiredSpeed = 0;
          break;
        }
      }

      // Accelerate / brake velocity toward the desired speed
      const rate = desiredSpeed < car.velocity ? 20 : 8;
      if (car.velocity < desiredSpeed) {
        car.velocity = Math.min(desiredSpeed, car.velocity + rate * delta);
      } else {
        car.velocity = Math.max(desiredSpeed, car.velocity - rate * delta);
      }

      // Ramming collision with player vehicle (only at speed)
      if (player.inVehicle && dist < 3.8 && Math.abs(car.velocity) > 8) {
        player.currentVehicle.velocity *= 0.6;
        player.currentVehicle.health -= 5;
        if (this.audio) this.audio.playCrash(0.8);
      }

      // Step physics
      const forwardX = Math.sin(car.heading);
      const forwardZ = Math.cos(car.heading);
      car.position.x += forwardX * car.velocity * delta;
      car.position.z += forwardZ * car.velocity * delta;

      car.group.position.set(car.position.x, car.position.y, car.position.z);
      car.group.rotation.y = car.heading;

      // Rotate wheels
      const wheelRoll = (car.velocity * delta) / 0.4;
      car.wheels.forEach((w) => {
        w.mesh.children[0].rotation.x += wheelRoll;
      });

      // Update Siren Flashes
      if (car.sirenLights.length === 2) {
        car.sirenTimer += delta * 12;
        const flash = Math.sin(car.sirenTimer) > 0;
        car.sirenLights[0].material.color.setHex(flash ? 0xff0000 : 0x330000);
        car.sirenLights[1].material.color.setHex(!flash ? 0x0055ff : 0x001133);
      }
    });

    // 3. Police Foot Officers AI
    this.policeOfficers.forEach((off) => off.update(delta, player, this.audio));

    // 4. Siren management (centralised): distance-attenuated while wanted
    if (this.audio) {
      if (this.wantedStars > 0) {
        let nearestDist = 999;
        this.policeCars.forEach((car) => {
          const dx = player.position.x - car.position.x;
          const dz = player.position.z - car.position.z;
          nearestDist = Math.min(nearestDist, Math.sqrt(dx * dx + dz * dz));
        });
        if (nearestDist < 70) {
          this.audio.startSiren();
          this.audio.setSirenVolume(0.10 * (1 - nearestDist / 70) + 0.02);
        } else {
          this.audio.stopSiren();
        }
      } else {
        this.audio.stopSiren();
      }
    }

    // 5. Busted Detection (surrounded while stopped)
    if (this.wantedStars > 0 && !player.isWasted) {
      let nearbyPoliceCount = 0;
      this.policeCars.forEach((c) => {
        const dx = player.position.x - c.position.x;
        const dz = player.position.z - c.position.z;
        // The cruiser must be nearly stopped too: a drive-by can't bust the player
        if (dx * dx + dz * dz < 7.0 * 7.0 && Math.abs(c.velocity) < 2) nearbyPoliceCount++;
      });

      const playerSpeed = player.inVehicle ? Math.abs(player.currentVehicle.velocity) : Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.z * player.velocity.z);
      if (nearbyPoliceCount > 0 && playerSpeed < 1.5) {
        this.bustedTimer += delta;
        if (this.bustedTimer > 2.5) {
          this.isBusted = true;
          this.clearWanted();
          player.takeDamage(100); // Triggers busted/wasted sequence
        }
      } else {
        this.bustedTimer = 0;
      }
    }
  }
}
