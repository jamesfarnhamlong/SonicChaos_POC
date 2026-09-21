/// @description  System

// Settings
global.screenSize = 0; //0 = Auto Size, 1 = Widescreen (16:9), 2 = Retro (4:3)
global.windowSize = 3; // Window multiplication: 1x, 2x, 3x..
global.buttons = 1; // Show touch buttons (0 = off / 1 = on)
global.music = 1; // Play music (0 = off / 1 = on)
global.saveGame = 1; //Memory Card Slot
global.memoryCards = 5; //How many cards?

// Rotes
global.zoneGoto = 1; // Zone code
global.specialStageGoto = 1; // Special Stage code

// Unlocks
global.specialStage = false; // Go to Special Stage?
global.allZones = false; // Clear all zones?

// Points
score = 0;
global.ringBonus = 0;
global.timeBonus = 0;

/// Player

// Characters
global.player = 1; // 1 = Sonic / 2 = Tails / 3 = Knuckles

// Phisics
global.valGravity = 0; // Gravity
global.valSpeed = 0; // Speed you add when you walk
global.valSpeedMax = 0; // Speed limit
global.valJumpMax = 0; // Jump pressure
global.valVspeed = 0; // Drop limit
global.valSpinSpeed = 0; // Spin Dash Release Speed

// Object Physics
global.jumpSpringMax = 0; // Spring height limit
global.monitorJump = 0; // Jump height when you destroy the monitor

// Actions
global.playerBlink = false; // Lost rings invincibility
global.playerSuper = false; // If player is a Super 
global.playerWater = false; // If player is underwater
global.playerJump = false; // If player is jumping
global.playerJumpSpring = false; // If player is jumping in the spring
global.playerSpinDash = false; // If player Spin Dash is true
global.playerFly = false; // If player is flying
global.playerPlate = false; // If goal plate finish is true

// Sprites mode
global.playerSprite = 0; // Colors palette (0 = normal / 1 = underwater)

/// Level Objects

global.life = 3; // Player lifes
global.ring = 0; // Collected rings
global.chaoEmerald = 0; // Collected Chao Emeralds

// If you have the power ...
global.powerShield = false;
global.powerShieldMagnet = false;
global.powerShieldFlame = false;
global.powerInv = false;

global.checkPoint = false; // If you have caught...
global.checkPointX = 0; // Coordinate X to create the player
global.checkPointY = 0; // Coordinate Y to create the player

// Time
global.seconds = 0;
global.minutes = 0;

/// Settings

// Open Archive
ini_open ("settings.ini");

// Load Varibles
global.screenSize = ini_read_real ("system", "screenSize", global.screenSize);
global.windowSize = ini_read_real ("system", "windowSize", global.windowSize);
global.buttons = ini_read_real ("system", "buttons", global.buttons);
global.music = ini_read_real ("system", "music", global.music);
global.saveGame = ini_read_real ("system", "saveGame", global.saveGame);

// Close Archive
ini_close ();

/// Create Data Slots

for (i = 0; i < global.memoryCards; i++)
{
    // Open Archive
    ini_open ("saveGame" + string(i) + ".ini");
    
    // Create Sections
    if !(ini_section_exists("classicMode"))
    {
        ini_write_real ("classicMode", "life", global.life);
        ini_write_real ("classicMode", "chaoEmerald", global.chaoEmerald);
        ini_write_real ("classicMode", "score", score);
        ini_write_real ("classicMode", "zoneGoto", global.zoneGoto);
        ini_write_real ("classicMode", "specialStageGoto", global.specialStageGoto);
        ini_write_real ("classicMode", "allZones", global.allZones);
    }
    
    // Close Archive
    ini_close ();
}

/// Load Data Slots

SCR_load_game();

