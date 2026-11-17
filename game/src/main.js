// Solaria City: Sunstate Underworld - Main Game Orchestrator & Game Loop

import { CONFIG } from './config.js';
import { AudioManager } from './audio.js';
import { City } from './city.js';
import { VehicleManager } from './vehicles.js';
import { Player } from './player.js';
import { TrafficManager } from './traffic.js';
import { PoliceManager } from './police.js';
import { MissionManager } from './missions.js';
import { HUD } from './hud.js';
import { SaveSystem } from './save.js';
import { ShotsManager } from './shots.js';

export class Game {
  constructor() {
    this.state = 'START_SCREEN'; // 'START_SCREEN', 'PLAYING', 'PAUSED'
    this.isPaused = false;
    this.isStaged = false;
    this.clock = null;
    this.lastTime = performance.now();

    // Input State
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      sprint: false,
      jump: false,
      brake: false,
      attack: false,
      aim: false,
    };

    this.initGraphics();
    this.initAudio();
    this.initWorld();
    this.initHUD();
    this.setupInputListeners();
    this.setupMenus();

    // Check if deterministic staged shot query is present
    const isShot = ShotsManager.checkAndApplyStagedShot(this);
    if (isShot) {
      this.state = 'PLAYING';
      const menuEl = document.getElementById('menu-start');
      if (menuEl) menuEl.classList.add('hidden');
    }

    // Start Main RAF Loop
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initGraphics() {
    const THREE = window.THREE;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x74b9ff); // Sun-soaked coastal sky blue
    this.scene.fog = new THREE.FogExp2(0x74b9ff, 0.0035);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 800);

    const canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Sunlight (Directional) with shadows - Warm golden angle from behind/side
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.15);
    this.sunLight.position.set(80, 140, -100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 400;
    const shadowD = 90;
    this.sunLight.shadow.camera.left = -shadowD;
    this.sunLight.shadow.camera.right = shadowD;
    this.sunLight.shadow.camera.top = shadowD;
    this.sunLight.shadow.camera.bottom = -shadowD;
    this.scene.add(this.sunLight);

    // Warm coastal ambient & ground bounce
    this.hemiLight = new THREE.HemisphereLight(0x74b9ff, 0x3d7042, 0.45);
    this.scene.add(this.hemiLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.35);
    this.scene.add(ambient);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  initAudio() {
    this.audio = new AudioManager();
  }

  initWorld() {
    this.city = new City(this.scene);
    this.vehicleManager = new VehicleManager(this.scene, this.city, this.audio);
    this.player = new Player(this.scene, this.camera, this.city, this.audio);
    this.trafficManager = new TrafficManager(this.scene, this.city, this.vehicleManager, this.audio);
    this.policeManager = new PoliceManager(this.scene, this.city, this.vehicleManager, this.audio);
    this.missionManager = new MissionManager(this.scene, this.audio);
  }

  initHUD() {
    const hudContainer = document.getElementById('hud');
    this.hud = new HUD(hudContainer);
  }

  setupInputListeners() {
    window.addEventListener('keydown', (e) => {
      this.audio.ensureContext();
      const code = e.code;

      if (code === 'KeyW' || code === 'ArrowUp') this.input.forward = true;
      if (code === 'KeyS' || code === 'ArrowDown') this.input.backward = true;
      if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.input.right = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight') this.input.sprint = true;
      if (code === 'Space') {
        this.input.jump = true;
        this.input.brake = true;
      }
      if (code === 'KeyF') this.input.attack = true;

      // Enter / Exit Vehicle (E)
      if (code === 'KeyE') {
        if (this.player.inVehicle) {
          this.player.exitVehicle();
          this.vehicleManager.playerVehicle = null;
        } else {
          const nearVeh = this.vehicleManager.getNearestVehicle(this.player.position, 4.2);
          if (nearVeh) {
            this.player.enterVehicle(nearVeh);
            this.vehicleManager.playerVehicle = nearVeh;
            if (nearVeh.isPolice) {
              this.policeManager.reportCrime('theft', this.player.position);
            }
          }
        }
      }

      // Switch Weapon (Q cycles, 1 = fists, 2 = pistol)
      if (code === 'KeyQ') this.player.switchWeapon();
      if (code === 'Digit1') this.player.selectWeapon(0);
      if (code === 'Digit2') this.player.selectWeapon(1);

      // Mute audio (M)
      if (code === 'KeyM') this.audio.toggleMute();

      // Pause menu (Escape / KeyP)
      if (code === 'Escape' || code === 'KeyP') {
        if (this.state === 'PLAYING') this.togglePause();
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      if (code === 'KeyW' || code === 'ArrowUp') this.input.forward = false;
      if (code === 'KeyS' || code === 'ArrowDown') this.input.backward = false;
      if (code === 'KeyA' || code === 'ArrowLeft') this.input.left = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.input.right = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') this.input.sprint = false;
      if (code === 'Space') {
        this.input.jump = false;
        this.input.brake = false;
      }
      if (code === 'KeyF') this.input.attack = false;
    });

    // Mouse Controls
    window.addEventListener('mousedown', (e) => {
      this.audio.ensureContext();
      if (this.state !== 'PLAYING') return;

      if (e.button === 0) { // Left Click: Attack / Shoot
        // Ignore the click that engages pointer lock (it would instantly fire)
        if (document.pointerLockElement) {
          this.input.attack = true;
        }
      } else if (e.button === 2) { // Right Click: Aim
        this.input.aim = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.input.attack = false;
      if (e.button === 2) this.input.aim = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse movement for Camera Look
    window.addEventListener('mousemove', (e) => {
      if (this.state !== 'PLAYING') return;
      // When mouse moves, adjust camera yaw and pitch
      if (document.pointerLockElement || e.buttons > 0 || this.player.isAiming) {
        const sens = 0.0035;
        this.player.camYaw -= e.movementX * sens;
        this.player.camPitch = Math.max(-0.4, Math.min(0.85, this.player.camPitch + e.movementY * sens));
      }
    });

    // Canvas click to request pointer lock for full 3D control
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('click', () => {
      if (this.state === 'PLAYING' && !document.pointerLockElement) {
        canvas.requestPointerLock?.();
      }
    });
  }

  setupMenus() {
    const startMenu = document.getElementById('menu-start');
    const pauseMenu = document.getElementById('menu-pause');
    const btnNewGame = document.getElementById('btn-new-game');
    const btnContinue = document.getElementById('btn-continue');
    const btnResume = document.getElementById('btn-resume');
    const btnMissions = document.getElementById('btn-missions');

    if (btnNewGame) {
      btnNewGame.addEventListener('click', () => {
        this.audio.ensureContext();
        SaveSystem.reset();
        this.state = 'PLAYING';
        startMenu.classList.add('hidden');
        this.missionManager.startMission('mission_1');
      });
    }

    if (btnContinue) {
      if (!SaveSystem.hasSave()) {
        btnContinue.classList.add('disabled');
      }
      btnContinue.addEventListener('click', () => {
        this.audio.ensureContext();
        SaveSystem.load(this.player, this.missionManager, this.policeManager);
        this.state = 'PLAYING';
        startMenu.classList.add('hidden');
      });
    }

    if (btnResume) {
      btnResume.addEventListener('click', () => {
        this.togglePause();
      });
    }

    if (btnMissions) {
      btnMissions.addEventListener('click', () => {
        this.missionManager.startMission('mission_1');
        this.togglePause();
      });
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    const pauseMenu = document.getElementById('menu-pause');
    if (this.isPaused) {
      this.state = 'PAUSED';
      if (pauseMenu) pauseMenu.classList.remove('hidden');
      SaveSystem.save(this.player, this.missionManager, this.policeManager);
    } else {
      this.state = 'PLAYING';
      if (pauseMenu) pauseMenu.classList.add('hidden');
    }
  }

  syncHudVisibility() {
    // HUD is hidden on the start screen, visible while playing/paused.
    // DOM write only happens when the state actually changes.
    if (this._hudVisibleState === this.state) return;
    this._hudVisibleState = this.state;
    const hudEl = document.getElementById('hud');
    if (hudEl) {
      hudEl.style.display = this.state === 'START_SCREEN' ? 'none' : '';
    }
  }

  loop(now) {
    requestAnimationFrame(this.loop);

    const delta = Math.min((now - this.lastTime) / 1000, 0.06);
    this.lastTime = now;

    if (this.state === 'PLAYING') {
      // 1. Update Core Simulation Systems
      this.player.update(delta, this.input, this.trafficManager, this.policeManager, this.isStaged);
      this.vehicleManager.update(delta, this.input);
      this.trafficManager.update(delta, this.player);
      this.policeManager.update(delta, this.player);
      this.missionManager.update(delta, this.player, this.policeManager);
      this.city.update(delta);

      // Check car vs pedestrians & player collision
      if (this.player.inVehicle) {
        this.trafficManager.checkCarCollisionsWithPedestrians(this.player.currentVehicle, () => {
          this.policeManager.reportCrime('hit_and_run', this.player.position);
        });
      } else {
        this.trafficManager.checkCarCollisionsWithPlayer(this.player);
      }

      // Dynamic sunlight following player
      this.sunLight.position.x = this.player.position.x + 120;
      this.sunLight.position.z = this.player.position.z + 90;
      this.sunLight.target.position.set(this.player.position.x, 0, this.player.position.z);
      this.sunLight.target.updateMatrixWorld();

      // Respawn timer on death
      if (this.player.isWasted) {
        if (!this.wastedTimer) this.wastedTimer = 0;
        this.wastedTimer += delta;
        if (this.wastedTimer > 3.5) {
          this.player.respawn();
          this.policeManager.clearWanted();
          this.wastedTimer = 0;
        }
      }
    }

    // 2. Update HUD
    this.syncHudVisibility();
    if (this.hud) {
      this.hud.update(
        this.player,
        this.city,
        this.vehicleManager,
        this.trafficManager,
        this.policeManager,
        this.missionManager
      );
    }

    // 3. Render Three.js Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.solariaGame = new Game();
});
