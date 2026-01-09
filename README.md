# 6b6t Captcha Bypass Bot

A Mineflayer bot that automatically logs in and moves backwards while looking straight up.
(vibecoded)
Doesn't byppas lobby only auth server.
## Setup

1. Install dependencies:
```bash
npm install
```

2. Edit `bot.js` and update the configuration:
   - `host`: Your server IP address
   - `port`: Your server port (default 25565)
   - `username`: Your bot's username
   - `version`: Minecraft version (or false for auto-detect)

3. Run the bot:
```bash
npm start
```

## Features

- Automatically logs into the server
- Sets yaw and pitch to look straight up (prevents straying)
- Moves backwards continuously after spawning
- Maintains straight-up look direction


