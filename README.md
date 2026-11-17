# Solaria City: Sunstate Underworld

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/honru09/solaria-city/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/honru09/solaria-city/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original 3D open-world crime action game built with Three.js, designed to run completely offline in a desktop web browser with zero external network requests.

Built for the make.fun bounty `gta6-01` ("Make GTA 6").

---

## Overview

Set in the sun-soaked coastal metropolis of **Solaria Bay**, you play as **Jax Rivera**, navigating through palm-lined coastal boulevards, glass downtown skyscrapers, and luxury yacht marinas. Take on contracts from local fixer **Leo "Fin" Castillo**, steal high-performance vehicles, outrun aggressive Metro Police pursuits, and engage rival syndicate enforcers across the city.

All code, setting, characters, vehicles, story missions, art, audio, and visual direction are 100% original.

---

## Core Systems & Features

1. **Procedural 3D Coastal City (`game/src/city.js`)**
   - Diverse districts: Ocean Drive beachfront promenade, Downtown Financial Center, Marina Yacht Docks, and Industrial Shipping Yards.
   - Road network with asphalt lanes, crosswalks, double-yellow centerlines, and traffic signals.
   - Street furniture: palm trees, streetlights, fire hydrants, benches, boardwalk piers, and moored luxury yachts.
   - Real-time collision system and spatial query index.

2. **On-Foot Player & Combat (`game/src/player.js`)**
   - Third-person character model with walk, sprint, and jump animations.
   - Mouse-orbit third-person camera with over-the-shoulder aim mode.
   - Unarmed melee punch combat with knockback.
   - 9mm Solaria Pistol with aim zoom, raycast hit detection, muzzle flash, and ammo management.

3. **Arcade Vehicle Physics (`game/src/vehicles.js`)**
   - 5 distinct vehicle archetypes:
     - **Solaria Venom GT**: Low-slung sports coupe with high acceleration and top speed.
     - **Titan 4x4 SUV**: Heavy all-terrain vehicle with high durability and mass.
     - **Solaria Stallion V8**: Classic muscle car with high drift responsiveness.
     - **Metro Police Interceptor**: High-speed patrol cruiser with rooftop emergency lightbars.
     - **Solaria Yellow Cab**: City taxi cab.
   - Enter/exit vehicles seamlessly with `[E]`.
   - Physics simulation: acceleration, braking, reverse, handbrake drift, wheel turning, chassis roll, and crash impacts.

4. **Living Traffic & Pedestrians (`game/src/traffic.js`)**
   - Ambient AI cars driving along road lanes and navigating intersections.
   - Pedestrians walking along sidewalks and crossing at intersections.
   - Panic and fleeing behavior: pedestrians react and run away when gunshots occur or vehicles jump curbs.
   - Cash pickups dropped upon neutralizing threats.

5. **Wanted System & Police Pursuit (`game/src/police.js`)**
   - 1 to 5 Wanted Stars responding to crimes (theft, assault, hit-and-run, officer confrontation).
   - Dynamic police AI pursuit: cruisers spawn and pursue, executing ramming maneuvers and roadblocks.
   - Tactical backup: armed foot officers deploy at higher wanted levels.
   - Evasion mechanic: break line of sight and remain undetected to trigger wanted star decay and call off the search.
   - Busted / Wasted screen with hospital/precinct respawn.

6. **Story Campaign & Missions (`game/src/missions.js`)**
   - Narrative campaign featuring multi-stage missions:
     - **Mission 1: The Solaria Hustle** — Meet Fin at the Marina, infiltrate an Ocean Villa, steal the Venom GT, and lose the Metro PD pursuit.
     - **Mission 2: Neon Docks Ambush** — Drive to the South Container Shipping Yard, eliminate Syndicate guards in a gunfight, and secure the contraband briefcase.
     - **Mission 3: Takedown on Ocean Drive** — Intercept the Syndicate boss armored convoy on Ocean Drive, disable the vehicle, and escape the tactical response.
   - Floating 3D golden waypoint diamond beacons with ground rings and GPS minimap routing.
   - Dialogue banner with character names and mission objective HUD.

7. **HUD & Live Minimap (`game/src/hud.js`)**
   - Real-time circular radar minimap showing roads, ocean, buildings, player heading arrow, traffic cars, police pursuit blips, and mission GPS path.
   - Health and Armor status bars.
   - Cash counter and 5-star wanted level indicators.
   - Analog/digital speedometer (MPH) and vehicle name display.
   - Contextual interaction prompt (`[E] Enter Vehicle`, `[E] Exit Vehicle`).
   - Weapon display with active ammo counters.

8. **WebAudio Procedural Sound Synthesis (`game/src/audio.js`)**
   - 100% synthesized audio via the Web Audio API (no external sound files required):
     - Dynamic engine oscillator linked to vehicle RPM and acceleration.
     - Oscillating dual-tone police sirens.
     - Gunshot noise bursts and low-frequency punch thumps.
     - Collision crashes, tire squeals, and UI feedback clicks.
     - Procedural 118 BPM synthwave radio soundtrack (analog bassline, drum beat, synth pads).
     - Mute toggle (`M`).

9. **Persistence & Save System (`game/src/save.js`)**
   - Automatic progress saving to browser `localStorage` (cash, missions completed, position, weapons).
   - "Continue" button on the start screen restores saved progress.

10. **Screenshots & Staged Scenes (`game/src/shots.js`)**
    - Deterministic scene staging via URL query parameter (`?shot=cover`, `?shot=skyline`, `?shot=action`, `?shot=mission`) for reproducible high-fidelity renders.

---

## Controls

| Action | Key / Input |
|---|---|
| Move / Steer | **W, A, S, D** or **Arrow Keys** |
| Sprint / Boost | **Shift** |
| Jump / Handbrake Drift | **Space** |
| Enter / Exit Vehicle | **E** |
| Attack / Punch / Shoot | **Left Mouse Click** or **F** |
| Aim Weapon | **Right Mouse Click** |
| Switch Weapon | **Q** or **1, 2** |
| Camera Orbit / Look | **Mouse Movement** |
| Pause Menu | **Escape** or **P** |
| Mute / Unmute Audio | **M** |

---

## How to Run Locally

Prerequisites: Node.js 22 or later.

1. Start the local development server:
   ```bash
   node serve.ts
   ```
2. Open your desktop browser to:
   ```
   http://localhost:8080
   ```
3. Click **NEW GAME** to explore Solaria City!

---

## Generating the Dossier

To bundle and generate the dossier for competition evaluation:
```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

## License

This project is licensed under the [MIT License](LICENSE).

<sub>Entered on [make.fun](https://make.fun/?ref=vjfcejxy&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
