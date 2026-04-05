import React, { useState, useRef, useCallback } from 'react';
import '../App.css';
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

interface VideoDetails {
  name: string;
  size: string;
  type: string;
}

function MainApp() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
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

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setRecordedBlob(null);
      setVideoUrl(URL.createObjectURL(file));
      setVideoDetails({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type
      });
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
      
      // Start live preview immediately
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.muted = true;
        liveVideoRef.current.playsInline = true;
        // Ensure the video starts playing
        liveVideoRef.current.play().catch(err => {
          console.log('Auto-play prevented, but preview is ready');
        });
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
        
        // Set video details for recorded video
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        setVideoDetails({
          name: `recorded-video-${timestamp}.webm`,
          size: formatFileSize(blob.size),
          type: 'video/webm'
        });
        
        // Stop camera and clear preview
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = null;
          liveVideoRef.current.pause();
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
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
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
        stream: null,
        duration: 0
      }));
    }
  };

  // Retake recording
  const retakeRecording = async () => {
    // Stop any ongoing recording first
    if (recordingState.isRecording && recordingState.mediaRecorder) {
      recordingState.mediaRecorder.stop();
    }
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Stop camera stream
    if (recordingState.stream) {
      recordingState.stream.getTracks().forEach(track => track.stop());
    }
    
    // Clear all video and recording states
    setRecordedBlob(null);
    setVideoUrl(null);
    setVideoDetails(null);
    setError(null);
    setResult(null);
    
    // Reset recording state completely
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      mediaRecorder: null,
      stream: null
    });
    
    // Clear live video preview
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
      liveVideoRef.current.pause();
    }
    
    // Automatically restart camera for new recording
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      
      // Start live preview immediately
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.muted = true;
        liveVideoRef.current.playsInline = true;
        // Ensure the video starts playing
        liveVideoRef.current.play().catch(err => {
          console.log('Auto-play prevented, but preview is ready');
        });
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
        
        // Set video details for recorded video
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        setVideoDetails({
          name: `recorded-video-${timestamp}.webm`,
          size: formatFileSize(blob.size),
          type: 'video/webm'
        });
        
        // Stop camera and clear preview
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = null;
          liveVideoRef.current.pause();
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

  // Process video (uploaded or recorded)
  const processVideo = async (videoFile: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', videoFile);

      console.log("Sending video for processing:", videoFile.name);
      
      const response = await fetch('http://localhost:8000/upload-video', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Processing failed');
      }

      const data: TranscriptionResult = await response.json();
      console.log("Grammar API Response:", data);
      console.log("Original text:", data.original_text);
      console.log("Corrected text:", data.corrected_text);
      
      setResult(data);
    } catch (err) {
      console.error("Processing error:", err);
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

  // Cleanup on unmount and handle stream changes
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

  // Handle live video stream
  React.useEffect(() => {
    if (liveVideoRef.current && recordingState.stream) {
      liveVideoRef.current.srcObject = recordingState.stream;
      liveVideoRef.current.muted = true;
      liveVideoRef.current.playsInline = true;
      liveVideoRef.current.play().catch(err => {
        console.log('Auto-play prevented:', err);
      });
    }
  }, [recordingState.stream]);

  // Manage timer lifecycle based on recording state
  React.useEffect(() => {
    if (recordingState.isRecording) {
      startTimer();
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [recordingState.isRecording]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-inter">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary-600 to-primary-800 text-white shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 animate-fade-in">
              <i className="fas fa-microphone-alt mr-3"></i>
              English Bolo
            </h1>
            <p className="text-base sm:text-lg lg:text-xl opacity-90 animate-fade-in max-w-2xl mx-auto">
              Transform your speech into perfect English with AI-powered grammar correction
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Video Input Section */}
        <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 animate-slide-up">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-3">
              <i className="fas fa-video mr-2 text-primary-600"></i>
              Get Started
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Upload a video or record one directly from your camera
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Upload Button */}
            <div className="relative group">
              <input
                ref={fileInputRef}
                type="file"
                id="video-upload"
                accept="video/mp4,video/mkv,video/quicktime,video/x-msvideo,video/webm"
                onChange={handleFileSelect}
                className="hidden"
              />
              <label
                htmlFor="video-upload"
                className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-blue-200 min-w-[200px]"
              >
                <i className="fas fa-cloud-upload-alt mr-3 text-lg"></i>
                Upload Video
              </label>
            </div>

            {/* Record Button */}
            <button
              onClick={startCamera}
              disabled={isLoading || recordingState.isRecording}
              className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:from-green-600 hover:to-emerald-700 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-green-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none min-w-[200px]"
            >
              <i className="fas fa-video mr-3 text-lg"></i>
              Record Video
            </button>
          </div>
        </section>

        {/* Live Camera Preview */}
        {recordingState.isRecording && (
          <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 animate-slide-up">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-red-600 flex items-center justify-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></span>
                Recording Live
              </h3>
            </div>
            <div className="relative max-w-4xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black">
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-[450px] object-cover"
                />
                <div className="absolute top-4 right-4 bg-red-600/90 backdrop-blur-sm text-white px-4 py-2 rounded-full font-semibold flex items-center shadow-lg">
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                  Recording {formatTime(recordingState.duration)}
                </div>
              </div>
            </div>
            
            {/* Stop Recording Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={stopRecording}
                disabled={isLoading}
                className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none animate-pulse min-w-[200px]"
              >
                <i className="fas fa-stop mr-3 text-lg"></i>
                Stop Recording ({formatTime(recordingState.duration)})
              </button>
            </div>
          </section>
        )}

        {/* Video Preview */}
        {videoUrl && !recordingState.isRecording && (
          <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 animate-slide-up">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800 flex items-center justify-center">
                <i className="fas fa-film mr-3 text-primary-600"></i>
                Video Preview
              </h3>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-black">
                <video
                  ref={videoRef}
                  controls
                  className="w-full h-[450px] object-cover"
                  src={videoUrl}
                />
              </div>
            </div>
            
            {videoDetails && (
              <div className="mt-6 bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
                  <i className="fas fa-info-circle mr-2 text-primary-600"></i>
                  Video Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <i className="fas fa-file mr-2 text-gray-500"></i>
                    <div>
                      <span className="text-sm text-gray-500">Name:</span>
                      <p className="font-medium text-gray-800 truncate">{videoDetails.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-database mr-2 text-gray-500"></i>
                    <div>
                      <span className="text-sm text-gray-500">Size:</span>
                      <p className="font-medium text-gray-800">{videoDetails.size}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <i className="fas fa-file-video mr-2 text-gray-500"></i>
                    <div>
                      <span className="text-sm text-gray-500">Type:</span>
                      <p className="font-medium text-gray-800">{videoDetails.type}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Control Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
              {/* Retake Button */}
              {recordedBlob && (
                <button
                  onClick={retakeRecording}
                  disabled={isLoading}
                  className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:from-amber-600 hover:to-orange-700 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-amber-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none min-w-[180px]"
                >
                  <i className="fas fa-redo mr-2"></i>
                  Retake Recording
                </button>
              )}
              
              {/* Process Video Button */}
              <button
                onClick={handleUpload}
                disabled={(!selectedFile && !recordedBlob) || isLoading}
                className="flex items-center justify-center px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:from-primary-700 hover:to-primary-800 hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-primary-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none min-w-[200px]"
              >
                <i className="fas fa-rocket mr-3 text-lg"></i>
                {isLoading ? 'Processing...' : 'Process Video'}
              </button>
            </div>
          </section>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <section className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 mb-8 animate-slide-up">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Processing Your Video</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Our AI is analyzing your speech and correcting grammar. This may take a few minutes depending on the video length.
              </p>
              <div className="mt-6 flex justify-center">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Error Display */}
        {error && (
          <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 animate-slide-up">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <i className="fas fa-exclamation-circle text-red-500 text-2xl"></i>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-semibold text-red-800 mb-2">Error Occurred</h3>
                  <p className="text-red-700 mb-4">{error}</p>
                  {error.includes("FFmpeg") && (
                    <div className="bg-white rounded-lg p-4 border border-red-200">
                      <h4 className="font-semibold text-red-800 mb-3">To fix this issue:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-red-700">
                        <li>Download FFmpeg from <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer" className="text-red-600 underline hover:text-red-800">ffmpeg.org</a></li>
                        <li>Extract to a folder (e.g., C:\ffmpeg)</li>
                        <li>Add the 'bin' folder to your PATH environment variable</li>
                        <li>Restart the backend server</li>
                      </ol>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Results Section */}
        {result && (
          <section className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 mb-8 animate-slide-up">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center justify-center">
                <i className="fas fa-check-circle mr-3 text-green-500"></i>
                Transcription Results
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <i className="fas fa-file-alt mr-2 text-blue-500"></i>
                  Original Transcript
                </h3>
                <div className="bg-white rounded-lg p-4 border border-gray-300 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {result.original_text || 'No transcription available'}
                  </p>
                </div>
              </div>
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <i className="fas fa-spell-check mr-2 text-green-500"></i>
                  Corrected Text
                </h3>
                <div className="bg-white rounded-lg p-4 border border-green-300 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {result.corrected_text && result.corrected_text !== result.original_text 
                      ? result.corrected_text 
                      : result.corrected_text === result.original_text 
                        ? 'No grammatical corrections needed'
                        : 'Correction not available'
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-full text-sm text-gray-600">
                <i className="fas fa-folder mr-2"></i>
                Processed file: {result.filename}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default MainApp;
