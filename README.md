# EnglishSikho - AI Video Speech-to-Text and Grammar Correction Platform

A full-stack web application that allows users to upload videos, extract speech, convert it to text, and apply grammar corrections. Built with React frontend and FastAPI backend, using local AI models for privacy and cost-effectiveness.

## Features

- 🎥 **Video Upload**: Supports MP4, MKV, and MOV video formats
- 🎵 **Audio Extraction**: Uses FFmpeg to extract audio from uploaded videos
- 🗣️ **Speech-to-Text**: Local Whisper model (tiny) for transcription
- ✏️ **Grammar Correction**: Language-tool-python for automatic grammar fixes
- 📱 **Responsive Design**: Clean, modern UI that works on all devices
- ⚡ **Local Processing**: Everything runs locally - no external APIs needed
- 🔄 **Side-by-Side Comparison**: View original and corrected text together

## Tech Stack

### Frontend
- **React.js** with TypeScript
- **CSS3** with modern styling
- **HTML5** File API

### Backend
- **FastAPI** (Python web framework)
- **Whisper** (OpenAI's speech-to-text model)
- **language-tool-python** (Grammar correction)
- **FFmpeg** (Audio extraction)

## Project Structure

```
EnglishSikho/
├── backend/
│   └── main.py              # FastAPI server with all endpoints
├── frontend/
│   ├── public/
│   │   └── index.html       # HTML template
│   ├── src/
│   │   ├── App.tsx          # Main React component
│   │   ├── App.css          # Application styles
│   │   ├── index.tsx        # React entry point
│   │   └── index.css        # Global styles
│   └── package.json         # Frontend dependencies
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Prerequisites

### System Requirements
- **RAM**: Minimum 4GB (recommended 8GB+)
- **Storage**: 2GB free space (for models and temp files)
- **OS**: Windows, macOS, or Linux

### Required Software
1. **Python 3.8+** - [Download here](https://www.python.org/downloads/)
2. **Node.js 16+** - [Download here](https://nodejs.org/)
3. **FFmpeg** - [Download here](https://ffmpeg.org/download.html)

## Installation & Setup

### Step 1: Install FFmpeg

**Windows:**
1. Download FFmpeg from the official website
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add the `bin` folder to your PATH environment variable
4. Verify installation: `ffmpeg -version`

**macOS (using Homebrew):**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

### Step 2: Set Up Backend

1. Navigate to the project directory:
```bash
cd EnglishSikho
```

2. Create a virtual environment:
```bash
python -m venv venv
```

3. Activate the virtual environment:

**Windows:**
```bash
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

4. Install Python dependencies:
```bash
pip install -r requirements.txt
```

5. Start the backend server:
```bash
python backend/main.py
```

The backend will be available at `http://localhost:8000`

### Step 3: Set Up Frontend

1. Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
```

2. Install Node.js dependencies:
```bash
npm install
```

3. Start the React development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`

## Usage

1. **Open the Application**: Navigate to `http://localhost:3000` in your browser
2. **Upload a Video**: Click "Choose Video File" and select a video (MP4, MKV, or MOV)
3. **Process**: Click "Upload and Transcribe" to start processing
4. **Wait**: The system will extract audio, transcribe it, and correct grammar
5. **View Results**: See original and corrected text side-by-side

## API Endpoints

### `POST /upload-video`
Uploads a video file and returns transcription with grammar correction.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Video file (MP4, MKV, MOV)

**Response:**
```json
{
  "original_text": "Original transcription text...",
  "corrected_text": "Grammatically corrected text...",
  "filename": "uploaded_video.mp4"
}
```

### `GET /`
Health check endpoint.

### `GET /health`
Detailed health check with model status.

## Configuration

### Model Selection
The backend uses Whisper's "tiny" model by default for low RAM usage. To change models, modify the `load_whisper_model()` function in `backend/main.py`:

```python
# Available models: tiny, base, small, medium, large
whisper_model = whisper.load_model("base")  # Change model here
```

### Performance Tuning
- **Tiny Model**: ~39MB, fastest, good for 4GB RAM systems
- **Base Model**: ~74MB, better accuracy, moderate RAM usage
- **Small Model**: ~244MB, good accuracy, requires more RAM

## Troubleshooting

### Common Issues

1. **FFmpeg not found**:
   - Ensure FFmpeg is installed and in your PATH
   - Run `ffmpeg -version` to verify

2. **Model download fails**:
   - Check internet connection for initial model download
   - Ensure sufficient disk space (2GB+ recommended)

3. **Memory errors**:
   - Use the "tiny" Whisper model for 4GB RAM systems
   - Close other applications to free up memory

4. **CORS errors**:
   - Ensure backend is running on port 8000
   - Check that frontend is running on port 3000

5. **File upload errors**:
   - Verify video file format (MP4, MKV, MOV)
   - Check file size (recommended < 100MB)

### Logs
The backend provides detailed logging. Check the terminal output for:
- Model loading status
- Audio extraction progress
- Transcription details
- Error messages

## Development

### Backend Development
```bash
# Install additional development dependencies
pip install black flake8 pytest

# Run with auto-reload
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
# Install additional development dependencies
npm install --save-dev @types/node

# Run with hot reload
npm start
```

## Performance Notes

- **First Run**: Initial model download may take 5-10 minutes
- **Processing Time**: Depends on video length and system specs
  - 1-minute video: ~30-60 seconds on average system
  - 5-minute video: ~2-5 minutes on average system
- **Memory Usage**: ~1-2GB RAM with Whisper tiny model

## Security & Privacy

- ✅ All processing happens locally on your machine
- ✅ No data sent to external APIs
- ✅ Temporary files are automatically deleted
- ✅ No internet connection required after initial setup

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the logs for detailed error messages
3. Ensure all prerequisites are properly installed
4. Verify system requirements are met

---

**EnglishSikho** - Learn English better with AI-powered transcription and grammar correction! 🚀
