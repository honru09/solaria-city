// Solaria City - Third-Person Player Controller, 3D Character & Combat

import { CONFIG } from './config.js';

export class Player {
  constructor(scene, camera, city, audio) {
    this.scene = scene;
    this.camera = camera;
    this.city = city;
    this.audio = audio;

    // State
    this.position = { x: 10, y: 0.35, z: -10 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.heading = 0;       // Horizontal facing angle
    this.isGrounded = true;
    this.isSprinting = false;
    this.health = CONFIG.PLAYER.MAX_HEALTH;
    this.armor = 50;
    this.cash = 3500;
    this.isWasted = false;

    // Vehicle State
    this.inVehicle = false;
    this.currentVehicle = null;

    // Weapon Inventory
    this.weapons = ['fists', 'pistol'];
    this.currentWeaponIndex = 0; // Start with fists (no accidental first-shot)
    this.ammo = { pistol: 48 };
    this.isAiming = false;
    this.shootCooldown = 0;
    this.punchCooldown = 0;

    // Camera Orbit State
    this.camYaw = 0;
    this.camPitch = 0.25; // Slight downward look
    this.camDist = 5.2;

    // Build 3D Character Mesh
    this.group = new window.THREE.Group();
    this.buildCharacterMesh();
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.scene.add(this.group);

    // Muzzle flash light & visual
    this.buildMuzzleFlash();
  }

  buildCharacterMesh() {
    const THREE = window.THREE;
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xdf9e76, roughness: 0.7 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: 0x00d2d3, roughness: 0.6 }); // Cyan tropical shirt
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x222f3e, roughness: 0.8 }); // Dark jeans
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, roughness: 0.9 });
    const shadesMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.1 });

    // 1. Torso
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.45), shirtMat);
    this.torso.position.y = 1.35;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // 2. Head & Sunglasses
    this.head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.42), skinMat);
    this.head.position.set(0, 2.05, 0);
    this.head.castShadow = true;

    // Hair
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.44), hairMat);
    hair.position.set(0, 0.22, 0);
    this.head.add(hair);

    // Sunglasses
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.12), shadesMat);
    shades.position.set(0, 0.05, 0.22);
    this.head.add(shades);

    this.group.add(this.head);

    // 3. Limbs (Arms & Legs for Walk/Punch Animation)
    const armGeom = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    this.leftArm = new THREE.Mesh(armGeom, shirtMat);
    this.leftArm.position.set(-0.48, 1.35, 0);
    this.leftArm.castShadow = true;

    this.rightArm = new THREE.Mesh(armGeom, shirtMat);
    this.rightArm.position.set(0.48, 1.35, 0);
    this.rightArm.castShadow = true;

    this.group.add(this.leftArm, this.rightArm);

    // Weapon mesh held in right hand (hidden while fists are equipped)
    this.pistolMesh = this.buildPistolModel();
    this.pistolMesh.position.set(0, -0.4, 0.25);
    this.pistolMesh.visible = false;
    this.rightArm.add(this.pistolMesh);

    // Legs
    const legGeom = new THREE.BoxGeometry(0.25, 0.85, 0.25);
    this.leftLeg = new THREE.Mesh(legGeom, pantsMat);
    this.leftLeg.position.set(-0.2, 0.48, 0);
    this.leftLeg.castShadow = true;

    this.rightLeg = new THREE.Mesh(legGeom, pantsMat);
    this.rightLeg.position.set(0.2, 0.48, 0);
    this.rightLeg.castShadow = true;

    this.group.add(this.leftLeg, this.rightLeg);
  }

  buildPistolModel() {
    const THREE = window.THREE;
    const pistolGroup = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.85, roughness: 0.2 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.7 });

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.32), metalMat);
    barrel.position.set(0, 0.08, 0.1);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.1), gripMat);
    grip.position.set(0, -0.06, 0);
    grip.rotation.x = 0.25;

    pistolGroup.add(barrel, grip);
    return pistolGroup;
  }

  buildMuzzleFlash() {
    const THREE = window.THREE;
    this.muzzleGroup = new THREE.Group();
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff066 });
    const flashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), flashMat);
    this.muzzleLight = new THREE.PointLight(0xffaa00, 0, 10);
    this.muzzleGroup.add(flashMesh, this.muzzleLight);
    this.muzzleGroup.visible = false;
    this.scene.add(this.muzzleGroup);
  }

  getCurrentWeapon() {
    return CONFIG.WEAPONS[this.weapons[this.currentWeaponIndex]];
  }

  switchWeapon() {
    this.selectWeapon((this.currentWeaponIndex + 1) % this.weapons.length);
  }

  selectWeapon(index) {
    if (index < 0 || index >= this.weapons.length) return;
    this.currentWeaponIndex = index;
    const cur = this.getCurrentWeapon();
    this.pistolMesh.visible = cur.id === 'pistol';
    if (this.audio) this.audio.playDoor();
  }

  enterVehicle(veh) {
    this.inVehicle = true;
    this.currentVehicle = veh;
    veh.isOccupied = true;
    veh.driver = this;
    this.group.visible = false;
    if (this.audio) {
      this.audio.playDoor();
      this.audio.startEngine(veh.config.soundPitch);
      if (veh.isPolice) this.audio.startSiren();
    }
  }

  exitVehicle() {
    if (!this.inVehicle || !this.currentVehicle) return;
    const veh = this.currentVehicle;
    // Step out to the left
    const exitAngle = veh.heading + Math.PI / 2;
    this.position.x = veh.position.x + Math.sin(exitAngle) * 2.2;
    this.position.z = veh.position.z + Math.cos(exitAngle) * 2.2;
    this.position.y = 0.35;
    this.heading = veh.heading;

    veh.isOccupied = false;
    veh.driver = null;
    this.currentVehicle = null;
    this.inVehicle = false;
    this.group.visible = true;

    if (this.audio) {
      this.audio.playDoor();
      this.audio.stopEngine();
      this.audio.stopSiren();
    }
  }

  takeDamage(amount) {
    if (this.isWasted) return;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, amount * 0.7);
      this.armor -= absorbed;
      amount -= absorbed;
    }
    this.health = Math.max(0, this.health - amount);
    if (this.audio) this.audio.playPunch();

    if (this.health <= 0) {
      this.isWasted = true;
      if (this.audio) this.audio.playMissionFail();
    }
  }

  respawn() {
    this.health = CONFIG.PLAYER.MAX_HEALTH;
    this.armor = 25;
    this.cash = Math.max(0, this.cash - 500); // Hospital fee
    this.isWasted = false;
    this.position = { x: 10, y: 0.35, z: -10 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this._camInit = false; // Snap the follow camera on the next frame
    if (this.inVehicle) this.exitVehicle();
    this.group.visible = true;
  }

  update(delta, input, trafficManager, policeManager, isStaged = false) {
    if (this.isWasted) return;

    if (this.shootCooldown > 0) this.shootCooldown -= delta;
    if (this.punchCooldown > 0) this.punchCooldown -= delta;

    if (this.inVehicle) {
      // In Vehicle: Sync player position with vehicle
      this.position.x = this.currentVehicle.position.x;
      this.position.y = this.currentVehicle.position.y;
      this.position.z = this.currentVehicle.position.z;
      this.heading = this.currentVehicle.heading;
      if (!isStaged) {
        this.updateCarCamera(delta);
      }
      return;
    }

    // On Foot: Handle Movement
    this.updateOnFootMovement(delta, input);
    this.updateCombat(input, trafficManager, policeManager);
    if (!isStaged) {
      this.updateOnFootCamera(delta);
    }
  }

  updateOnFootMovement(delta, input) {
    const { WALK_SPEED, RUN_SPEED, JUMP_FORCE, GRAVITY } = CONFIG.PLAYER;
    const isMoving = input.forward || input.backward || input.left || input.right;
    this.isSprinting = input.sprint && isMoving;
    const currentSpeed = this.isSprinting ? RUN_SPEED : WALK_SPEED;

    // Movement relative to camera yaw
    let moveX = 0;
    let moveZ = 0;

    if (input.forward) moveZ += 1;
    if (input.backward) moveZ -= 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      // Normalize input vector
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      const nx = moveX / len;
      const nz = moveZ / len;

      // Rotate by camera yaw (camera forward = (sinYaw, cosYaw), screen-right = (-cosYaw, sinYaw))
      const worldMoveX = -nx * Math.cos(this.camYaw) + nz * Math.sin(this.camYaw);
      const worldMoveZ = nx * Math.sin(this.camYaw) + nz * Math.cos(this.camYaw);

      this.velocity.x = worldMoveX * currentSpeed;
      this.velocity.z = worldMoveZ * currentSpeed;

      // Face direction of movement (or aim direction if aiming)
      if (this.isAiming) {
        this.heading = this.camYaw;
      } else {
        this.heading = Math.atan2(worldMoveX, worldMoveZ);
      }
    } else {
      this.velocity.x = 0;
      this.velocity.z = 0;
      if (this.isAiming) {
        this.heading = this.camYaw;
      }
    }

    // Jump & Gravity
    if (input.jump && this.isGrounded) {
      this.velocity.y = JUMP_FORCE;
      this.isGrounded = false;
      if (this.audio) this.audio.playUIClick();
    }

    if (!this.isGrounded) {
      this.velocity.y -= GRAVITY * delta;
    }

    // Next Position & City Obstacle Collision
    const nextX = this.position.x + this.velocity.x * delta;
    const nextZ = this.position.z + this.velocity.z * delta;
    const nextY = this.position.y + this.velocity.y * delta;

    const resolved = this.city.resolveCollision({ x: nextX, z: nextZ }, 0.55);
    this.position.x = resolved.x;
    this.position.z = resolved.z;

    if (nextY <= 0.35) {
      this.position.y = 0.35;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else {
      this.position.y = nextY;
      this.isGrounded = false;
    }

    // Procedural Walking & Arm Swing Animation
    const animTime = performance.now() * 0.008 * (this.isSprinting ? 1.6 : 1.0);
    if (isMoving && this.isGrounded) {
      const swing = Math.sin(animTime) * 0.45;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      if (!this.isAiming) {
        this.leftArm.rotation.x = -swing;
        this.rightArm.rotation.x = swing;
      }
    } else {
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      if (!this.isAiming) {
        this.leftArm.rotation.x = 0;
        this.rightArm.rotation.x = 0;
      }
    }

    // Aim Stance
    if (this.isAiming) {
      this.rightArm.rotation.x = Math.PI / 2 - this.camPitch;
      this.leftArm.rotation.x = Math.PI / 3;
    }

    // Update 3D Group Transform
    this.group.position.set(this.position.x, this.position.y, this.position.z);
    this.group.rotation.y = this.heading;
  }

  updateCombat(input, trafficManager, policeManager) {
    const curWep = this.getCurrentWeapon();
    this.isAiming = input.aim && curWep.id === 'pistol';

    // Shoot / Punch
    if (input.attack) {
      if (curWep.id === 'pistol' && this.shootCooldown <= 0 && this.ammo.pistol > 0) {
        this.firePistol(trafficManager, policeManager);
        this.shootCooldown = curWep.fireRate;
      } else if (curWep.id === 'fists' && this.punchCooldown <= 0) {
        this.punch(trafficManager, policeManager);
        this.punchCooldown = curWep.fireRate;
      }
    }

    // Muzzle Flash Decay
    if (this.muzzleGroup && this.muzzleGroup.visible) {
      this.muzzleGroup.visible = false;
      this.muzzleLight.intensity = 0;
    }
  }

  firePistol(trafficManager, policeManager) {
    this.ammo.pistol--;
    if (this.audio) this.audio.playGunshot();

    // Muzzle flash at gun tip
    const gunPos = new window.THREE.Vector3(0.5, 1.4, 0.8);
    gunPos.applyAxisAngle(new window.THREE.Vector3(0, 1, 0), this.heading);
    gunPos.add(new window.THREE.Vector3(this.position.x, this.position.y, this.position.z));
    this.muzzleGroup.position.copy(gunPos);
    this.muzzleGroup.visible = true;
    this.muzzleLight.intensity = 4.0;

    // Firing gunshot alerts police!
    if (policeManager) {
      policeManager.reportCrime('gunshot', this.position);
    }

    // Raycast hit detection forward
    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    // Check hit against pedestrians
    if (trafficManager) {
      trafficManager.checkHitscan(this.position, { x: forwardX, z: forwardZ }, 65, CONFIG.WEAPONS.pistol.damage, () => {
        if (policeManager) policeManager.addWantedStars(1);
      });
    }
    // Check hit against police on foot
    if (policeManager) {
      policeManager.checkHitscan(this.position, { x: forwardX, z: forwardZ }, 65, CONFIG.WEAPONS.pistol.damage);
    }
  }

  punch(trafficManager, policeManager) {
    if (this.audio) this.audio.playPunch();
    // Quick punch arm swing
    this.rightArm.rotation.x = Math.PI / 2.2;
    setTimeout(() => {
      if (this.rightArm) this.rightArm.rotation.x = 0;
    }, 120);

    const forwardX = Math.sin(this.heading);
    const forwardZ = Math.cos(this.heading);

    if (trafficManager) {
      trafficManager.checkHitscan(this.position, { x: forwardX, z: forwardZ }, 3.0, CONFIG.WEAPONS.fists.damage, () => {
        if (policeManager) policeManager.addWantedStars(1);
      });
    }
  }

  updateOnFootCamera(delta) {
    // Smooth third person follow camera (exponential lerp toward the orbit target)
    const targetDist = this.isAiming ? 3.2 : this.camDist;
    const camX = this.position.x - Math.sin(this.camYaw) * targetDist * Math.cos(this.camPitch);
    const camZ = this.position.z - Math.cos(this.camYaw) * targetDist * Math.cos(this.camPitch);
    const camY = this.position.y + 1.8 + Math.sin(this.camPitch) * targetDist;

    if (!this._camInit) {
      // First frame after spawn/respawn: snap, don't swoop in from the origin
      this.camera.position.set(camX, camY, camZ);
      this._camInit = true;
    } else {
      const k = 1 - Math.exp(-10 * delta);
      this.camera.position.x += (camX - this.camera.position.x) * k;
      this.camera.position.y += (camY - this.camera.position.y) * k;
      this.camera.position.z += (camZ - this.camera.position.z) * k;
    }
    this.camera.lookAt(this.position.x, this.position.y + 1.5, this.position.z);
  }

  updateCarCamera(delta) {
    const veh = this.currentVehicle;
    const behindDist = 7.5;
    const heightOffset = 3.2;

    const camX = veh.position.x - Math.sin(veh.heading) * behindDist;
    const camZ = veh.position.z - Math.cos(veh.heading) * behindDist;
    const camY = veh.position.y + heightOffset;

    // Smooth camera lerp
    this.camera.position.x += (camX - this.camera.position.x) * delta * 7;
    this.camera.position.y += (camY - this.camera.position.y) * delta * 7;
    this.camera.position.z += (camZ - this.camera.position.z) * delta * 7;

    this.camera.lookAt(veh.position.x, veh.position.y + 1.2, veh.position.z);
  }
}
