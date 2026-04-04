import React, { useState, useRef, useCallback } from 'react';
import './App.css';

interface TranscriptionResult {
  original_text: string;
  corrected_text: string;
  filename: string;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  mediaRecorder: MediaRecorder | null;
  stream: MediaStream | null;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    mediaRecorder: null,
    stream: null
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setRecordedBlob(null);
      setVideoUrl(URL.createObjectURL(file));
      setError(null);
      setResult(null);
    }
  };

  // Start camera for recording
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        setVideoUrl(URL.createObjectURL(blob));
        
        // Stop camera
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = null;
        }
      };

      setRecordingState(prev => ({
        ...prev,
        mediaRecorder,
        stream,
        isRecording: true,
        duration: 0
      }));

      mediaRecorder.start();
      startTimer();

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access to record video.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please connect a camera and try again.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera. Please check your camera settings.');
      }
    }
  };

  // Start timer for recording
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingState(prev => ({
        ...prev,
        duration: prev.duration + 1
      }));
    }, 1000);
  };

  // Stop recording
  const stopRecording = () => {
    if (recordingState.mediaRecorder && recordingState.isRecording) {
      recordingState.mediaRecorder.stop();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setRecordingState(prev => ({
        ...prev,
        isRecording: false,
        mediaRecorder: null,
        stream: null
      }));
    }
  };

  // Retake recording
  const retakeRecording = () => {
    setRecordedBlob(null);
    setVideoUrl(null);
    setError(null);
    setResult(null);
  };

  // Process video (uploaded or recorded)
  const processVideo = async (videoFile: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', videoFile);

      const response = await fetch('http://localhost:8000/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Processing failed');
      }

      const data: TranscriptionResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle upload button click
  const handleUpload = () => {
    if (selectedFile) {
      processVideo(selectedFile);
    } else if (recordedBlob) {
      const file = new File([recordedBlob], 'recorded-video.webm', { type: 'video/webm' });
      processVideo(file);
    } else {
      setError('Please upload a video file or record one first');
    }
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordingState.stream) {
        recordingState.stream.getTracks().forEach(track => track.stop());
      }
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [recordingState.stream, videoUrl]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>EnglishBolo</h1>
        <p>Video Speech-to-Text with Grammar Correction</p>
      </header>

      <main className="App-main">
        {/* Video Input Section */}
        <section className="video-input-section">
          <div className="input-buttons">
            {/* Upload Button */}
            <div className="file-input-container">
              <input
                ref={fileInputRef}
                type="file"
                id="video-upload"
                accept="video/mp4,video/mkv,video/quicktime,video/x-msvideo,video/webm"
                onChange={handleFileSelect}
                className="file-input"
              />
              <label htmlFor="video-upload" className="file-label">
                📁 Upload Video
              </label>
            </div>

            {/* Record Button */}
            <button
              onClick={recordingState.isRecording ? stopRecording : startCamera}
              className={`record-button ${recordingState.isRecording ? 'recording' : ''}`}
              disabled={isLoading}
            >
              {recordingState.isRecording ? (
                <>
                  🔴 Stop Recording ({formatTime(recordingState.duration)})
                </>
              ) : (
                <>
                  🎥 Record Video
                </>
              )}
            </button>

            {/* Retake Button */}
            {recordedBlob && (
              <button
                onClick={retakeRecording}
                className="retake-button"
                disabled={isLoading}
              >
                🔄 Retake Recording
              </button>
            )}
          </div>

          {/* Processing Button */}
          <button
            onClick={handleUpload}
            disabled={(!selectedFile && !recordedBlob) || isLoading}
            className="process-button"
          >
            {isLoading ? '⏳ Processing...' : '🚀 Process Video'}
          </button>
        </section>

        {/* Live Camera Preview */}
        {recordingState.isRecording && (
          <section className="live-preview-section">
            <h3>🔴 Recording Live</h3>
            <div className="video-container">
              <video
                ref={liveVideoRef}
                autoPlay
                playsInline
                muted
                className="live-video"
              />
              <div className="recording-indicator">
                <span className="recording-dot"></span>
                Recording {formatTime(recordingState.duration)}
              </div>
            </div>
          </section>
        )}

        {/* Video Preview */}
        {videoUrl && !recordingState.isRecording && (
          <section className="video-preview-section">
            <h3>📹 Video Preview</h3>
            <div className="video-container">
              <video
                ref={videoRef}
                controls
                className="preview-video"
                src={videoUrl}
              />
            </div>
            <p className="video-info">
              {selectedFile ? `Uploaded: ${selectedFile.name}` : 'Recorded video'}
            </p>
          </section>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <section className="loading-section">
            <div className="spinner"></div>
            <p>Processing your video... This may take a few minutes.</p>
          </section>
        )}

        {/* Error Display */}
        {error && (
          <section className="error-section">
            <div className="error-message">
              <strong>❌ Error:</strong> {error}
              {error.includes("FFmpeg") && (
                <div className="error-help">
                  <p>To fix this issue:</p>
                  <ol>
                    <li>Download FFmpeg from <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer">ffmpeg.org</a></li>
                    <li>Extract to a folder (e.g., C:\ffmpeg)</li>
                    <li>Add the 'bin' folder to your PATH environment variable</li>
                    <li>Restart the backend server</li>
                  </ol>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Results Section */}
        {result && (
          <section className="results-section">
            <h2>📝 Transcription Results</h2>
            <div className="results-container">
              <div className="result-column">
                <h3>📄 Original Transcript</h3>
                <div className="text-content">
                  {result.original_text || 'No transcription available'}
                </div>
              </div>
              <div className="result-column">
                <h3>✅ Corrected Text</h3>
                <div className="text-content corrected">
                  {result.corrected_text || 'No correction available'}
                </div>
              </div>
            </div>
            <div className="file-info">
              <small>📁 Processed file: {result.filename}</small>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
