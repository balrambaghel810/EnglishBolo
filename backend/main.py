from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import tempfile
import shutil
import logging
import subprocess
import whisper
import language_tool_python

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EnglishBolo API", description="Video Speech-to-Text and Grammar Correction")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize models (lazy loading)
whisper_model = None
grammar_tool = None

def load_whisper_model():
    """Load Whisper model (tiny for low RAM systems)"""
    global whisper_model
    if whisper_model is None:
        logger.info("Loading Whisper tiny model...")
        whisper_model = whisper.load_model("tiny")
        logger.info("Whisper model loaded successfully")
    return whisper_model

def load_grammar_tool():
    """Load language tool for grammar correction"""
    global grammar_tool
    if grammar_tool is None:
        logger.info("Loading language tool...")
        grammar_tool = language_tool_python.LanguageTool('en-US')
        logger.info("Language tool loaded successfully")
    return grammar_tool

def extract_audio_from_video(video_path: str, audio_path: str) -> bool:
    """Extract audio from video using FFmpeg"""
    try:
        logger.info(f"Extracting audio from {video_path}")
        
        # Check if FFmpeg is available
        import shutil
        ffmpeg_path = shutil.which('ffmpeg')
        if not ffmpeg_path:
            logger.error("FFmpeg not found. Please install FFmpeg and add it to PATH.")
            raise HTTPException(
                status_code=500, 
                detail="FFmpeg not installed. Please install FFmpeg and add it to your system PATH. "
                       "Download from: https://ffmpeg.org/download.html"
            )
        
        # Use FFmpeg to extract audio and convert to MP3
        cmd = [
            ffmpeg_path,
            '-i', video_path,
            '-vn',  # No video
            '-acodec', 'mp3',
            '-ab', '192k',
            '-ar', '44100',
            '-y',  # Overwrite output file
            audio_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            raise HTTPException(
                status_code=500, 
                detail=f"Audio extraction failed: {result.stderr}"
            )
        
        logger.info("Audio extraction completed successfully")
        return True
        
    except subprocess.TimeoutExpired:
        logger.error("Audio extraction timed out")
        raise HTTPException(status_code=500, detail="Audio extraction timed out. Please try a shorter video.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Audio extraction failed: {str(e)}")

def transcribe_audio(audio_path: str) -> str:
    """Transcribe audio using Whisper"""
    try:
        logger.info("Starting transcription...")
        model = load_whisper_model()
        
        # Transcribe the audio with English language specified
        result = model.transcribe(
            audio_path,
            language='en',  # Force English language
            task='transcribe',
            fp16=False  # More compatible
        )
        transcript = result["text"]
        
        logger.info("Transcription completed successfully")
        return transcript.strip()
        
    except Exception as e:
        logger.error(f"Error in transcription: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

def correct_grammar(text: str) -> str:
    """Correct grammar using available methods"""
    try:
        logger.info("Starting grammar correction...")
        
        # First try language-tool-python if Java is available
        try:
            tool = load_grammar_tool()
            matches = tool.check(text)
            corrected_text = language_tool_python.utils.correct(text, matches)
            logger.info("Grammar correction completed successfully with language-tool-python")
            return corrected_text.strip()
        except Exception as java_error:
            logger.warning(f"Language tool failed (likely Java not installed): {str(java_error)}")
            
            # Fallback to basic grammar correction
            logger.info("Using basic grammar correction fallback...")
            corrected_text = basic_grammar_correction(text)
            logger.info("Basic grammar correction completed successfully")
            return corrected_text.strip()
        
    except Exception as e:
        logger.error(f"Error in grammar correction: {str(e)}")
        # Return original text if all correction methods fail
        return text.strip()

def basic_grammar_correction(text: str) -> str:
    """Basic grammar correction without external dependencies"""
    if not text:
        return text
    
    # Basic corrections
    corrected = text
    
    # Capitalize first letter of sentences
    corrected = '. '.join(sentence.capitalize() for sentence in corrected.split('. '))
    
    # Fix common spacing issues
    corrected = corrected.replace('  ', ' ')  # Double spaces
    corrected = corrected.replace(' .', '.')  # Space before period
    corrected = corrected.replace(' ,', ',')  # Space before comma
    corrected = corrected.replace(' ?', '?')  # Space before question mark
    corrected = corrected.replace(' !', '!')  # Space before exclamation mark
    
    # Fix common punctuation issues
    corrected = corrected.replace(',,', ',')
    corrected = corrected.replace('..', '.')
    
    # Ensure text ends with proper punctuation
    if corrected and corrected[-1] not in ['.', '!', '?']:
        corrected += '.'
    
    return corrected.strip()

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "EnglishSikho API is running"}

@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """Upload video and process speech-to-text with grammar correction"""
    
    # Validate file type
    allowed_types = ["video/mp4", "video/mkv", "video/quicktime", "video/x-msvideo"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Please upload MP4, MKV, or MOV files."
        )
    
    # Create temporary directory for processing
    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            # Save uploaded video file
            video_path = os.path.join(temp_dir, file.filename)
            with open(video_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            logger.info(f"Video saved to: {video_path}")
            
            # Extract audio from video
            audio_path = os.path.join(temp_dir, "extracted_audio.mp3")
            extract_audio_from_video(video_path, audio_path)  # This will raise HTTPException if it fails
            
            # Transcribe audio to text
            original_text = transcribe_audio(audio_path)
            
            # Correct grammar
            corrected_text = correct_grammar(original_text)
            
            # Return results
            return {
                "original_text": original_text,
                "corrected_text": corrected_text,
                "filename": file.filename
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "models_loaded": {
        "whisper": whisper_model is not None,
        "grammar_tool": grammar_tool is not None
    }}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
