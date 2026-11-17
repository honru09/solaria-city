// Solaria City: Sunstate Underworld - Game Configuration & Constants

export const CONFIG = {
  TITLE: 'SOLARIA CITY: SUNSTATE UNDERWORLD',
  VERSION: '1.1.0',

  // City & World Dimensions
  CITY: {
    BLOCK_SIZE: 70,       // Size of each city block in world units
    GRID_COLS: 5,         // Number of block columns
    GRID_ROWS: 5,         // Number of block rows
    ROAD_WIDTH: 14,       // Width of streets
    SIDEWALK_WIDTH: 3.5,  // Width of sidewalks
    OCEAN_SIZE: 600,      // Size of ocean plane
    MARINA_Z: -180,       // Z coordinate where marina docks begin
    BEACH_X: 180,         // X coordinate where beach begins
  },

  // Districts definitions
  DISTRICTS: [
    { id: 'ocean_drive', name: 'Ocean Drive & Palma Beach', color: '#ff6b8b' },
    { id: 'downtown', name: 'Downtown Financial Center', color: '#00d2ff' },
    { id: 'marina', name: 'Palma Marina & Docks', color: '#2ed573' },
    { id: 'midtown', name: 'Midtown Neon Strip', color: '#ffa502' },
  ],

  // Vehicle Archetypes & Specifications
  VEHICLES: {
    venom: {
      id: 'venom',
      name: 'Solaria Venom GT',
      type: 'sports',
      topSpeed: 38,
      accel: 24,
      braking: 28,
      turnSpeed: 2.8,
      mass: 1.2,
      bodyColor: 0xe62020, // Vibrant red
      accentColor: 0x111111,
      roofType: 'convertible',
      soundPitch: 1.25,
    },
    titan: {
      id: 'titan',
      name: 'Titan 4x4 SUV',
      type: 'suv',
      topSpeed: 27,
      accel: 15,
      braking: 22,
      turnSpeed: 2.1,
      mass: 2.2,
      bodyColor: 0x1e3799, // Deep navy blue
      accentColor: 0x333333,
      roofType: 'suv',
      soundPitch: 0.85,
    },
    viper: {
      id: 'viper',
      name: 'Solaria Stallion V8',
      type: 'muscle',
      topSpeed: 33,
      accel: 20,
      braking: 25,
      turnSpeed: 2.4,
      mass: 1.5,
      bodyColor: 0x6f1e99, // Royal purple
      accentColor: 0xffffff,
      roofType: 'coupe',
      soundPitch: 1.05,
    },
    cruiser: {
      id: 'cruiser',
      name: 'Metro Police Interceptor',
      type: 'police',
      topSpeed: 36,
      accel: 23,
      braking: 27,
      turnSpeed: 2.6,
      mass: 1.6,
      bodyColor: 0x0a0a0a, // Black and white police livery
      accentColor: 0xf5f5f5,
      roofType: 'police',
      soundPitch: 1.15,
      isPolice: true,
    },
    taxi: {
      id: 'taxi',
      name: 'Solaria Yellow Cab',
      type: 'sedan',
      topSpeed: 29,
      accel: 17,
      braking: 24,
      turnSpeed: 2.3,
      mass: 1.4,
      bodyColor: 0xf6b93b, // Sun yellow
      accentColor: 0x111111,
      roofType: 'taxi',
      soundPitch: 0.95,
    },
  },

  // Player Attributes
  PLAYER: {
    WALK_SPEED: 5.5,
    RUN_SPEED: 11.0,
    JUMP_FORCE: 8.5,
    GRAVITY: 24.0,
    MAX_HEALTH: 100,
    MAX_ARMOR: 100,
    INTERACT_RADIUS: 4.5,
  },

  // Weapons
  WEAPONS: {
    fists: {
      id: 'fists',
      name: 'Fists',
      type: 'melee',
      damage: 25,
      range: 2.5,
      fireRate: 0.45,
      magSize: 0,
    },
    pistol: {
      id: 'pistol',
      name: '9mm Solaria Pistol',
      type: 'gun',
      damage: 42,
      range: 75,
      fireRate: 0.28,
      magSize: 12,
      maxAmmo: 120,
      reloadTime: 1.4,
    },
  },

  // Police & Wanted System
  WANTED: {
    LEVELS: [
      { stars: 0, description: 'Clear', policeCount: 0, aggressive: false },
      { stars: 1, description: 'Petty Crime', policeCount: 1, aggressive: false },
      { stars: 2, description: 'Assault / Car Theft', policeCount: 2, aggressive: true },
      { stars: 3, description: 'Officer Assault', policeCount: 3, aggressive: true },
      { stars: 4, description: 'Lethal Force Authorized', policeCount: 4, aggressive: true },
      { stars: 5, description: 'State Emergency Tactical Units', policeCount: 6, aggressive: true },
    ],
    DECAY_TIME_SECONDS: 14,
    COOLDOWN_FLASH_SPEED: 3.5,
  },

  // Story Missions Definition
  MISSIONS: [
    {
      id: 'mission_1',
      title: 'The Solaria Hustle',
      contact: 'Leo "Fin" Castillo',
      description: 'Fin needs a rare Solaria Venom sports car stolen from a beachfront villa and delivered to his Marina garage.',
      rewardCash: 2500,
      stages: [
        { id: 'meet', text: 'Meet Leo "Fin" Castillo at Palma Marina Docks', target: { x: 40, y: 1, z: -160 }, type: 'marker' },
        { id: 'steal', text: 'Steal the red Solaria Venom GT from Ocean Villa', target: { x: 190, y: 1, z: 20 }, type: 'car' },
        { id: 'lose_cops', text: 'Evade the Metro Police pursuit (1 Star)', target: null, type: 'evade', minStars: 1 },
        { id: 'deliver', text: 'Deliver the Venom to Fin\'s Underground Garage', target: { x: -80, y: 1, z: -40 }, type: 'garage' },
      ],
    },
    {
      id: 'mission_2',
      title: 'Neon Docks Ambush',
      contact: 'Leo "Fin" Castillo',
      description: 'A valuable contraband shipment has landed at the South Container Docks. Intercept it before the Syndicate does.',
      rewardCash: 5000,
      stages: [
        { id: 'reach_docks', text: 'Drive to the South Container Shipping Yard', target: { x: -140, y: 1, z: 150 }, type: 'marker' },
        { id: 'shootout', text: 'Eliminate Syndicate enforcers guarding the cargo', target: null, type: 'combat', enemyCount: 4 },
        { id: 'grab_loot', text: 'Secure the contraband briefcase', target: { x: -142, y: 1, z: 155 }, type: 'pickup' },
        { id: 'escape', text: 'Lose the 2-Star police dragnet and reach the Safehouse', target: { x: 10, y: 1, z: 80 }, type: 'safehouse', minStars: 2 },
      ],
    },
    {
      id: 'mission_3',
      title: 'Takedown on Ocean Drive',
      contact: 'Anonymous Broker',
      description: 'A corrupt Syndicate kingpin is escaping Solaria Bay. Intercept his convoy on Ocean Drive and take him out.',
      rewardCash: 10000,
      stages: [
        { id: 'intercept', text: 'Intercept the Syndicate Boss armored Titan SUV on Ocean Drive', target: { x: 175, y: 1, z: -60 }, type: 'intercept' },
        { id: 'destroy', text: 'Ram or shoot the Boss vehicle until disabled', target: null, type: 'boss_vehicle' },
        { id: 'eliminate', text: 'Eliminate the fleeing Syndicate Boss', target: null, type: 'boss_fight' },
        { id: 'clear_wanted', text: 'Evade tactical law enforcement units and claim bounty', target: { x: -30, y: 1, z: -100 }, type: 'safehouse', minStars: 3 },
      ],
    },
  ],
};
