import React, { useEffect, useRef, useMemo } from 'react';

const containerStyle = {
  width: '100%',
  backgroundColor: 'white',
  borderRadius: '4px',
  padding: '8px',
  boxSizing: 'border-box',
  overflow: 'hidden'
};

const canvasStyle = {
  width: '100%',
  height: '150px',
  display: 'block'
};

const MicrophoneWave = ({ isRecording, stream }) => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const dataHistoryRef = useRef([]);
  const MAX_HISTORY_LENGTH = 1000;

  // Memoize analyzer configuration
  const analyzerConfig = useMemo(() => ({
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    sampleRate: Math.floor(2048 / 100) // Calculate once instead of in draw loop
  }), []);

  useEffect(() => {
    if (!stream || !isRecording) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d', { alpha: false }); // Optimize for non-transparent canvas
    const bufferLength = analyzerConfig.fftSize / 2;
    const dataArray = new Uint8Array(bufferLength);
    
    // Initialize audio context and analyser
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    
    // Configure analyser
    analyserRef.current.fftSize = analyzerConfig.fftSize;
    analyserRef.current.smoothingTimeConstant = analyzerConfig.smoothingTimeConstant;

    // Connect stream to analyser
    const source = audioContextRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);

    // Clear history when starting new recording
    dataHistoryRef.current = [];

    // Create gradient once
    const gradient = canvasCtx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(45, 91, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(45, 91, 255, 0.05)');

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      analyserRef.current.getByteTimeDomainData(dataArray);

      // Add new data to history with pre-calculated sample rate
      const sampledData = [];
      for (let i = 0; i < bufferLength; i += analyzerConfig.sampleRate) {
        sampledData.push(dataArray[i]);
      }
      
      dataHistoryRef.current.push(sampledData);
      
      if (dataHistoryRef.current.length > MAX_HISTORY_LENGTH) {
        dataHistoryRef.current.shift();
      }

      // Clear canvas - using clearRect instead of fillRect
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw waveform from history
      canvasCtx.beginPath();
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = 'rgb(45, 91, 255)';

      const sliceWidth = canvas.width / (dataHistoryRef.current.length * sampledData.length);
      let x = 0;

      dataHistoryRef.current.forEach((historicalData, historyIndex) => {
        historicalData.forEach((value, dataIndex) => {
          const y = (value / 128.0) * (canvas.height / 2);

          if (historyIndex === 0 && dataIndex === 0) {
            canvasCtx.moveTo(x, y);
          } else {
            canvasCtx.lineTo(x, y);
          }

          x += sliceWidth;
        });
      });

      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
      
      // Fill area under the line
      canvasCtx.lineTo(canvas.width, canvas.height);
      canvasCtx.lineTo(0, canvas.height);
      canvasCtx.fillStyle = gradient;
      canvasCtx.fill();
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (source) {
        source.disconnect();
      }
      dataHistoryRef.current = [];
    };
  }, [stream, isRecording, analyzerConfig]);

  return (
    <div style={containerStyle}>
      <canvas
        ref={canvasRef}
        width={800}
        height={150}
        style={canvasStyle}
      />
    </div>
  );
};

export default React.memo(MicrophoneWave);
