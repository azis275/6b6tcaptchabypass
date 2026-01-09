const mineflayer = require('mineflayer');

// --- CONFIGURATION ---
const config = {
    host: 'alt3.6b6t.org', 
    port: 25565,
    username: 'niggerbigger69',
    password: '',
    version: false 
};

function startBot() {
    console.log('Connecting to server...');

    // State Tracking
    let isLoggedIn = false;
    let isSpawned = false;
    let isMoving = false;
    let inServerTransition = false;
    let tickCounter = 0;
    let connectionReady = false;

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
            showCape: true, showJacket: true, showLeftSleeve: true,
            showRightSleeve: true, showLeftPants: true, showRightPants: true, showHat: true
        },
        checkTimeoutInterval: 60000,
        hideErrors: false
    });

    // Handle errors gracefully
    bot.on('error', (err) => {
        const errorMsg = err.message || err.toString();
        if (errorMsg.includes('partial packet') || errorMsg.includes('Chunk size')) {
            return; 
        }
        console.error('Bot error:', errorMsg);
    });

    // Suppress partial packet warnings at protocol level
    bot._client.on('error', (err) => {
        const errorMsg = err.message || err.toString();
        if (errorMsg.includes('partial packet') || errorMsg.includes('Chunk size')) {
            return; 
        }
        console.error('Client error:', errorMsg);
    });

    bot.on('kicked', (reason) => {
        console.log('Bot was kicked. Reason:', reason);
    });

    // Reconnection Logic
    bot.on('end', () => {
        console.log('Bot disconnected. Retrying in 3 seconds...');
        isLoggedIn = false;
        isSpawned = false;
        isMoving = false;
        connectionReady = false;
        inServerTransition = false;

        setTimeout(() => {
            startBot(); // Restart the bot creation process
        }, 3000);
    });

    // Movement Logic
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
        } catch (e) {
            console.log('Control state failed');
            isMoving = false;
        }
    }

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

    // Event Handlers
    bot.once('login', () => {
        isLoggedIn = true;
        console.log('Password authentication successful! Sending /login command...');
        try {
            bot.chat('/login ' + config.password);
        } catch (e) {
            console.log('Chat command failed');
        }
        setTimeout(() => {
            console.log('Starting movement after /login...');
            startMovement();
        }, 3000);
    });

    bot.on('spawn', () => {
        isSpawned = true;
        console.log('Bot spawned in world!');
        const waitTime = inServerTransition ? 3000 : 1500;
        setTimeout(() => {
            if (bot.entity && bot.entity.position) {
                connectionReady = true;
                if (inServerTransition) {
                    inServerTransition = false;
                    console.log('Server transition complete!');
                    setTimeout(() => {
                        if (!isMoving) {
                            console.log('Resuming movement...');
                            startMovement();
                        }
                    }, 1000);
                }
            }
        }, waitTime);
    });

    bot.on('physicsTick', () => {
        if (!connectionReady || inServerTransition || !isSpawned) return;
        if (!bot.entity || !bot.entity.position) return;
        tickCounter++;
        if (isMoving && !inServerTransition && tickCounter % 20 === 0) {
            try {
                bot.look(0, -90, true);
            } catch (e) {}
        }
    });

    bot.on('chat', (username, message) => {
        console.log(`[Chat] <${username}> ${message}`);
    });

    bot.on('message', (jsonMsg) => {
        try {
            const message = jsonMsg.toString();
            if (!message.trim()) return;
            console.log(`[Message] ${message}`);

            if (message.includes('Welcome to 6b6t.org')) {
                console.log('Welcome message detected! Stopping captcha bypass movement...');
                stopMovement();
                if (inServerTransition) {
                    inServerTransition = false;
                    connectionReady = true;
                }
            }

            if ((message.includes('sent you back to the backup server') || 
                 message.includes('Connecting to the server')) && !inServerTransition) {
                inServerTransition = true;
                connectionReady = false;
                console.log('Server transition detected! Stopping movement...');
                stopMovement();
            }
        } catch (e) {}
    });

    // Intercept packets
    const originalWrite = bot._client.write;
    bot._client.write = function(name, params) {
        if (inServerTransition) {
            if (name === 'position' || name === 'position_look' || name === 'look') {
                return;
            }
        }
        return originalWrite.call(this, name, params);
    };
}

// Initial call to start the bot
startBot();