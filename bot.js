const mineflayer = require('mineflayer');

// Configuration - Update these with your credentials
const config = {
  host: 'alt3.6b6t.org',
  port: 25565,
  username: 'niggerbigger69',
  password: 'fR25F9xHjiDKj',
  version: false
};

// Create the bot
const bot = mineflayer.createBot({
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  version: config.version,
  viewDistance: 'normal',
  difficulty: 1,
  chat: 'enabled',
  colorsEnabled: true,
  skinParts: {
    showCape: true,
    showJacket: true,
    showLeftSleeve: true,
    showRightSleeve: true,
    showLeftPants: true,
    showRightPants: true,
    showHat: true
  },
  checkTimeoutInterval: 60000,
  hideErrors: false
});

// Track state
let isLoggedIn = false;
let isSpawned = false;
let isMoving = false;
let inServerTransition = false;
let tickCounter = 0;
let connectionReady = false;
let partialPacketCount = 0;

// Handle errors gracefully
bot.on('error', (err) => {
  const errorMsg = err.message || err.toString();
  
  if (errorMsg.includes('partial packet') || errorMsg.includes('Chunk size')) {
    partialPacketCount++;
    return; // Ignore partial packets
  }
  
  console.error('Bot error:', errorMsg);
});

// Suppress partial packet warnings at protocol level
bot._client.on('error', (err) => {
  const errorMsg = err.message || err.toString();
  if (errorMsg.includes('partial packet') || errorMsg.includes('Chunk size')) {
    return; // Silently ignore
  }
  console.error('Client error:', errorMsg);
});

bot.on('kicked', (reason, loggedIn) => {
  console.log('Bot was kicked:', reason);
  console.log('Was logged in:', loggedIn);
});

bot.on('end', () => {
  console.log('Bot disconnected');
  isLoggedIn = false;
  isSpawned = false;
  isMoving = false;
  connectionReady = false;
  inServerTransition = false;
});

// Start movement
function startMovement() {
  if (isMoving) return;
  
  isMoving = true;
  console.log('Starting to move backwards...');
  
  try {
    bot.look(0, -90, true, () => {
      console.log('Looking straight up!');
    });
  } catch (e) {
    console.log('Look command failed');
  }
  
  try {
    bot.setControlState('back', true);
    console.log('Moving backwards...');
  } catch (e) {
    console.log('Control state failed');
    isMoving = false;
  }
}

// Stop movement
function stopMovement() {
  if (!isMoving) return;
  
  isMoving = false;
  console.log('Stopping movement...');
  
  try {
    bot.setControlState('back', false);
    bot.clearControlStates();
  } catch (e) {
    console.log('Error stopping movement');
  }
}

// Login handler
bot.once('login', () => {
  isLoggedIn = true;
  console.log('Password authentication successful! Sending /login command...');
  
  try {
    bot.setSettings({
      chat: 'enabled',
      colorsEnabled: true,
      viewDistance: 'normal',
      difficulty: 1,
      skinParts: {
        showCape: true,
        showJacket: true,
        showLeftSleeve: true,
        showRightSleeve: true,
        showLeftPants: true,
        showRightPants: true,
        showHat: true
      }
    });
  } catch (e) {
    console.log('Could not set all client settings');
  }
  
  try {
    bot.chat('/login ' + config.password);
  } catch (e) {
    console.log('Chat command failed');
  }
  
  // Start movement after 3 seconds
  setTimeout(() => {
    console.log('Starting movement after /login...');
    startMovement();
  }, 3000);
});

// Spawn handler
bot.on('spawn', () => {
  isSpawned = true;
  console.log('Bot spawned in world!');
  
  const waitTime = inServerTransition ? 3000 : 1500;
  
  setTimeout(() => {
    if (bot.entity && bot.entity.position) {
      connectionReady = true;
      console.log('Connection ready, packets complete!');
      
      if (inServerTransition) {
        inServerTransition = false;
        console.log('Server transition complete!');
        
        // Resume movement after transition
        setTimeout(() => {
          if (!isMoving) {
            console.log('Resuming movement after transition...');
            startMovement();
          }
        }, 1000);
      }
    }
  }, waitTime);
});

// Physics tick - correct look direction
bot.on('physicsTick', () => {
  if (!connectionReady || inServerTransition || !isSpawned) return;
  if (!bot.entity || !bot.entity.position) return;
  
  tickCounter++;
  
  // Only correct look every 20 ticks and ONLY when not in transition
  if (isMoving && !inServerTransition && tickCounter % 20 === 0) {
    try {
      bot.look(0, -90, true);
    } catch (e) {
      // Skip this tick
    }
  }
});

// Chat handler
bot.on('chat', (username, message) => {
  console.log(`[Chat] <${username}> ${message}`);
});

// Message handler
bot.on('message', (jsonMsg) => {
  try {
    const message = jsonMsg.toString();
    if (message.trim()) {
      console.log(`[Message] ${message}`);
      
      // Detect when we've arrived at main server - unblock everything
      if (message.includes('Welcome to 6b6t.org')) {
        if (inServerTransition) {
          console.log('Arrived at main server! Unblocking packets and resuming...');
          inServerTransition = false;
          connectionReady = true;
          
          // Resume movement after a short delay
          setTimeout(() => {
            if (!isMoving) {
              console.log('Resuming movement on main server...');
              startMovement();
            }
          }, 1000);
        }
      }
      
      // Detect server transition - ONLY stop on these specific messages
      if ((message.includes('sent you back to the backup server') || 
           message.includes('Connecting to the server')) &&
          !inServerTransition) {
        
        inServerTransition = true;
        connectionReady = false;
        console.log('Server transition detected! Stopping movement...');
        
        stopMovement();
      }
    }
  } catch (e) {
    // Ignore errors
  }
});

// Intercept packets ONLY during confirmed transitions
const originalWrite = bot._client.write;
bot._client.write = function(name, params) {
  // Only block packets if we're actually in a server transition
  if (inServerTransition) {
    // Block movement packets during transition
    if (name === 'position' || name === 'position_look' || name === 'look') {
      console.log(`Blocked ${name} packet during transition`);
      return;
    }
  }
  
  return originalWrite.call(this, name, params);
};

console.log('Connecting to server...');