# FFmpeg Installation Guide for Windows

## Quick Installation (Recommended)

### Option 1: Using Chocolatey (Easiest)
```powershell
# First install Chocolatey (if not already installed)
# Run PowerShell as Administrator and run:
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Then install FFmpeg
choco install ffmpeg
```

### Option 2: Using Scoop
```powershell
# Install Scoop (if not already installed)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Install FFmpeg
scoop install ffmpeg
```

### Option 3: Manual Installation

1. **Download FFmpeg:**
   - Go to https://ffmpeg.org/download.html
   - Click on Windows logo
   - Download the latest build (e.g., ffmpeg-release-full.7z)

2. **Extract FFmpeg:**
   - Right-click the downloaded .7z file
   - Extract to `C:\ffmpeg`

3. **Add to PATH:**
   - Press `Win + X` and select "System"
   - Click on "Advanced system settings"
   - Click "Environment Variables..."
   - Under "System variables", find "Path" and click "Edit..."
   - Click "New" and add `C:\ffmpeg\bin`
   - Click OK on all windows

4. **Verify Installation:**
   - Open new Command Prompt or PowerShell
   - Run: `ffmpeg -version`
   - You should see version information

## After Installation

1. **Restart the backend server:**
   - Stop the current Python process (Ctrl+C in the terminal)
   - Run: `python backend/main.py`

2. **Test the application:**
   - Go to http://localhost:3000
   - Upload a video file
   - The transcription should work now!

## Troubleshooting

### "ffmpeg is not recognized" error
- Make sure you added `C:\ffmpeg\bin` to PATH (not just `C:\ffmpeg`)
- Restart your terminal/command prompt after adding to PATH
- Try running `ffmpeg -version` in a NEW terminal

### Permission issues
- Run PowerShell as Administrator when adding to PATH
- Make sure the extraction folder doesn't have special characters

### Still not working?
- Try restarting your computer after adding to PATH
- Verify the ffmpeg.exe file exists in `C:\ffmpeg\bin\`
