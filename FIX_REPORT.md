# Solaria City — Fix & Polish Report

User play-test complaints addressed: (1) left/right reversed, (2) police car circling the player from the start, (3) constant loud buzzing / chaotic audio, (4) overall polish. All fixes were applied exactly per the diagnosed root causes A–G. No git commit/push, no make.fun resubmission, no files touched outside `game/src/` (plus FIX_PROGRESS.md / this report).

## Files changed

- **game/src/player.js**
  - (A) Strafe sign fixed in `updateOnFootMovement`: `worldMoveX = -nx*cos(camYaw) + nz*sin(camYaw)`, `worldMoveZ = nx*sin(camYaw) + nz*cos(camYaw)` — A/D now move screen-left/screen-right relative to the camera.
  - (B) Added `Player.selectWeapon(index)` (sets index, toggles `pistolMesh.visible`, plays the door/click sound); `switchWeapon()` now delegates to it.
  - (C) Player now starts with fists: `currentWeaponIndex = 0` and `pistolMesh.visible = false` at build time — no pistol in hand at spawn.
  - (G) On-foot camera now lerps toward the orbit target with factor `1 - exp(-10*delta)`, with a `_camInit` snap on the first frame and on respawn (flag reset in `respawn()`), so there is no swoop from the origin.

- **game/src/main.js**
  - (B) `Digit1` → `selectWeapon(0)` (fists), `Digit2` → `selectWeapon(1)` (pistol); `KeyQ` still cycles via `switchWeapon()`. Previously 1/2 preset the index and then incremented, landing on the wrong weapon.
  - (C) `mousedown` left-button attack now only registers when `document.pointerLockElement` is set, so the click that engages pointer lock no longer fires a shot (which used to instantly grant a wanted star + siren + pursuit). Keyboard F attack unchanged.
  - (G) New `syncHudVisibility()`: hides `#hud` while `state === 'START_SCREEN'`, shows it in PLAYING/PAUSED (staged-shots mode sets PLAYING, so the HUD shows there as before); the DOM write only happens on state change.

- **game/src/police.js**
  - (D) `lastPlayerPos` tracked at the top of `update()` (initialised to the player start 10, -10).
  - (D) `spawnCruisersForWantedLevel` samples up to 12 road positions: first sample 45–100 m from the player wins; fallback is the farthest sample. Cruisers can no longer spawn next to the player.
  - (D) Pursuit AI rewritten: turn rate capped at 2.2 rad/s; distance-based desired speed (full `24 + stars*3` beyond 40 m, otherwise `clamp((dist - stopDist) * 1.2, 0, max)` with stopDist 6 m on foot / 8 m in vehicle), velocity eased toward it (accel 8/s, brake 14/s); separation braking when another cruiser is within 5 m ahead; ram damage to the player's vehicle only when the cruiser's speed > 8. Net effect: cruisers approach, slow down and stop near the player instead of orbiting them at full speed forever.
  - (D) Busted check additionally requires the nearby cruiser to be nearly stopped (`|velocity| < 2`), so a drive-by can't bust the player.
  - (D) Siren centralised in `update()`: wanted > 0 and nearest cruiser < 70 m → `startSiren()` + `setSirenVolume(0.10 * (1 - dist/70) + 0.02)`; otherwise / wanted = 0 → `stopSiren()`. `startSiren()` removed from `addWantedStars` (kept in `clearWanted` as stop). The stolen-cruiser siren in player.js is untouched; the loop governs its volume (distance to own cruiser = 0) and exit still stops it.

- **game/src/audio.js**
  - (E) `DynamicsCompressorNode` (threshold −18, ratio 6) inserted between masterGain and destination.
  - (E) Music tamed: `musicGain` 0.40 → 0.16; `synthBass` sawtooth → triangle and gain 0.24 → 0.12; `synthPad` gain 0.06 → 0.04.
  - (E) Engine: start gain 0.12 → 0.05, lowpass 380 → 320 Hz, saw oscillator routed through its own 0.35-mix gain so the triangle sub carries the tone; `updateEngine` target volume now `0.035 + speedRatio*0.075 + (accel ? 0.025 : 0)`.
  - (E) Siren: sawtooth → sine, starts at gain 0; new `setSirenVolume(v)` (setTargetAtTime, clamped 0..0.12); LFO stored as `this.sirenLfo` and stopped in `stopSiren()` (previously leaked). Side note: the old code also created the LFO gain node but never routed the LFO through it (LFO connected straight to the frequency param, ±1 Hz wobble); the rewrite routes LFO → lfoGain(260) → frequency, so the two-tone wail actually modulates.

- **game/src/vehicles.js**
  - (F) `spawnInitialParkedCars`: `cruiser` config excluded from the parked rotation (police cars now only come from the wanted system), and spawns resampled up to 8 times to land ≥ 25 m from the player start (10, -10). The showcase Venom at (15, -15) is unchanged.

- **game/src/traffic.js**
  - (F) `initTrafficCars`: spawns resampled up to 10 times to land ≥ 30 m from (10, -10); each car stores `cruiseSpeed` at spawn.
  - (F) `update()`: simple braking — if the player (on foot or in a vehicle; player.position syncs either way) or another traffic car is within 7 m directly ahead (forward dot > 0.8), the car decelerates toward 0 at 30/s; when clear it eases back up to its cruise speed.

## Self-test results

- `node --check` passed for all six modified modules (player, main, police, audio, traffic, vehicles).
- Served `game/` with `python3 -m http.server` on port 8941 and loaded it in headless Chromium (`--headless=new --no-sandbox --disable-dev-shm-usage --no-proxy-server --enable-unsafe-swiftshader --virtual-time-budget=12000`) with console logging enabled:
  - Start menu renders correctly over the live 3D city scene.
  - **Zero page errors** — no Uncaught / SyntaxError / TypeError / ReferenceError and no failed resource loads in the console log.
  - Visible before/after difference: the HUD (mission box, wanted stars, cash, weapon, minimap, HP/ARM bars) no longer shows behind the start menu — fix G working.
  - Proof screenshot: `/tmp/solaria-fix-menu.png`
- Test server killed afterwards by exact PID (35486); port confirmed closed.

## Notes / limitations

- All diagnoses A–G matched the code as written; none had to be revised.
- The headless test verifies load, menu render and error-free startup only. The gameplay-feel items (strafe direction, pursuit stop distance, traffic braking, siren distance falloff) are implemented exactly to the specified formulas but can only be fully judged in an interactive play session — recommend a quick user re-test via the same trial link (note: the public githack link serves the GitHub repo copy, which still has the old code until someone commits/pushes; per instructions I did not commit or push).
