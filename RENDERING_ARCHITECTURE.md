# Avatar Rendering Architecture

## Overview

Avatar rendering in DynaBlox is handled by the **game-server**, NOT by RCCService directly. The rendering pipeline works as follows:

```
Frontend (Next.js)
    ↓
Backend (.NET) - Calls CommandHandler
    ↓
Game-Server (Node.js) - Port 3189 (WebSocket)
    ↓
RCCService (if needed internally by game-server)
```

## Key Components

### 1. Frontend (services/2016-roblox-main)
- Requests avatar rendering via API calls
- Polls `/apisite/avatar/v1/avatar/render-status` for completion
- Displays rendered avatar thumbnails

### 2. Backend (.NET - services/Roblox/Roblox.Website)
- Receives render requests from frontend
- Uses `CommandHandler` to communicate with game-server
- Configured in `appsettings.json`:
  ```json
  "Render": {
    "BaseUrl": "ws://localhost:3189",
    "Authorization": "90WGEGNJGWHIWGOI31900H9GIOGI"
  }
  ```

### 3. Game-Server (services/game-server)
- **Port**: 3189 (WebSocket)
- **Type**: Node.js application
- **Responsibility**: Renders avatars and generates thumbnails
- **Configuration**: `services/game-server/config.json`
  ```json
  {
    "rcc": "C:\\Users\\yanis\\Desktop\\...",
    "rccPort": 3189,
    "port": 3040,
    "thumbnailWebsocketPort": 3189
  }
  ```

### 4. RCCService (services/RCCService)
- **Port**: 64989
- **Type**: Legacy Roblox rendering service
- **Status**: ⚠️ Cannot start due to Windows permissions issue
- **Note**: May be used internally by game-server, but not directly called by backend

## Current Issue

### Problem
RCCService cannot start because it tries to write to `C:\Program Files (x86)\Roblox\` which is protected by Windows UAC.

### Impact
- RCCService itself won't run
- However, avatar rendering may still work if the game-server has alternative rendering capabilities
- The game-server is the primary rendering component

### Solution
**Focus on getting the game-server running**, not RCCService. The game-server is what actually renders avatars.

## How to Test Rendering

1. **Ensure game-server is running**:
   ```bash
   cd services/game-server
   npm run start
   ```
   Should listen on port 3040 and 3189

2. **Ensure backend is running**:
   ```bash
   cd services/Roblox/Roblox.Website
   dotnet run --configuration Release
   ```
   Should listen on port 5000/5001

3. **Ensure frontend is running**:
   ```bash
   cd services/2016-roblox-main
   npm run dev
   ```
   Should listen on port 3000

4. **Test avatar rendering**:
   - Go to `http://localhost:3000/My/Character.aspx`
   - Check if avatar preview renders
   - Check browser console for errors
   - Check if WebSocket connection to `ws://localhost:3189` is established

## Troubleshooting

### Avatar not rendering
1. Check if game-server is running on port 3189
2. Check if backend can connect to game-server
3. Check browser console for WebSocket errors
4. Check backend logs for rendering errors

### Game-server won't start
1. Check if Node.js is installed
2. Check if dependencies are installed: `npm install`
3. Check if port 3189 is available
4. Check game-server logs for errors

### RCCService errors (can be ignored for now)
- RCCService has a Windows permissions issue
- It may not be needed if game-server has alternative rendering
- Focus on game-server instead

## Files to Check

- `services/Roblox/Roblox.Website/appsettings.json` - Render configuration
- `services/game-server/config.json` - Game-server configuration
- `services/game-server/package.json` - Game-server dependencies
- `services/2016-roblox-main/services/avatar.js` - Frontend avatar service
- `services/2016-roblox-main/stores/characterPage.js` - Frontend character page store

## Next Steps

1. **Verify game-server is running** - This is the critical component
2. **Check WebSocket connection** - Ensure backend can connect to game-server
3. **Test rendering** - Try rendering an avatar and check for errors
4. **Debug if needed** - Check logs and browser console for issues

RCCService can be addressed later if needed, but the game-server is the primary rendering component.
