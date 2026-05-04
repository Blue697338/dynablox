# RCCService Setup and Troubleshooting Guide

## Current Status
RCCService is not rendering characters. The issue has multiple components:

### 1. Admin Elevation Issue (FIXED)
**Problem**: The original `runall.bat` was using PowerShell with relative paths, which failed with "Le chemin d'accès spécifié est introuvable" (path not found).

**Solution**: 
- Created `elevate-rcc.vbs` - A VBScript that reliably elevates RCCService to admin privileges
- Updated `runall.bat` to use the VBScript instead of PowerShell
- This approach is more reliable on Windows systems

### 2. Backend Configuration Issue (FIXED)
**Problem**: `appsettings.json` had hardcoded absolute paths to the old user directory:
```
C:\Users\yanis\Desktop\economy-simulator-fixed-main\...
```

**Solution**: 
- Changed all paths to relative paths:
  - `Asset`: `../api/storage/asset`
  - `Storage`: `../api/storage`
  - `Thumbnails`: `../api/public/images/thumbnails`
  - `GroupIcons`: `../api/public/images/group`
  - `Public`: `./`
  - `XmlTemplates`: `./UnsecuredContent/XmlTemplates/`
  - `JsonData`: `./UnsecuredContent/JsonData/`
  - `AdminBundle`: `../admin/public`
  - `EconomyChatBundle`: `../web/dist`

### 3. RCCService Configuration
**Current Settings** (in `AppSettings.xml`):
- BaseUrl: `http://localhost:5000` (Backend)
- Port: `64989` (RCCService listening port)
- Content folder: `content/` (relative path)

**Status**: ✓ Correctly configured

## How to Test RCCService

### Option 1: Run via runall.bat (Recommended)
```batch
cd services
runall.bat
```
This will:
1. Start 2016-roblox-main (Next.js frontend)
2. Start game-server
3. **Elevate and start RCCService with admin privileges**
4. Start Roblox.Website (.NET backend)
5. Start AssetValidationServiceV2

### Option 2: Run RCCService Manually
```batch
cd services/RCCService
run.bat
```
Note: You may need to run as administrator for rendering to work properly.

### Option 3: Direct Command
```batch
cd services/RCCService
Bootstrapper.exe -Console
```

## Verifying RCCService is Working

1. **Check if RCCService is running**:
   - Look for `Bootstrapper.exe` or `RCCService.exe` in Task Manager
   - Should be listening on port 64989

2. **Test character rendering**:
   - Go to `http://localhost:3000/users/[userid]`
   - Check if the character avatar renders
   - Open browser DevTools (F12) → Network tab
   - Look for requests to the render service

3. **Check backend logs**:
   - The .NET backend should show successful connections to RCCService
   - Look for any error messages about rendering

## Troubleshooting

### RCCService won't start
- Ensure you have admin privileges
- Check that port 64989 is not in use: `netstat -ano | findstr :64989`
- Verify all DLL files are present in `services/RCCService/`

### Character rendering still not working
- Verify RCCService is actually running (check Task Manager)
- Check that the backend can reach RCCService on `localhost:64989`
- Verify `AppSettings.xml` has correct BaseUrl pointing to backend

### Admin elevation fails
- Try running `elevate-rcc.vbs` directly
- Or run `services/RCCService/run.bat` manually with admin privileges

## Files Modified
- `services/runall.bat` - Updated to use VBScript for admin elevation
- `services/elevate-rcc.vbs` - Created for reliable admin elevation
- `services/RCCService/run-admin.bat` - Created as alternative admin runner
- `services/Roblox/Roblox.Website/appsettings.json` - Fixed hardcoded paths to relative paths
