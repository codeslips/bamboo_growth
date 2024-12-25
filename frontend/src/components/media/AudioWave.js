import React, { useEffect, useRef, useState } from 'react';
import Peaks from 'peaks.js';

const AudioWave = ({ audioUrl, autoPlay = false }) => {
  const audioRef = useRef(null);
  const zoomviewRef = useRef(null);
  const overviewRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [peaksInstance, setPeaksInstance] = useState(null);

  useEffect(() => {
    console.log('autoPlay', autoPlay);
    if (!audioUrl || !zoomviewRef.current || !overviewRef.current) return;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    audio.crossOrigin = 'anonymous';

    const options = {
      containers: {
        zoomview: zoomviewRef.current,
        overview: overviewRef.current
      },
      zoomview: {
        container: zoomviewRef.current,
        waveformColor: 'rgb(45, 91, 255)',
        playedWaveformColor: 'rgba(45, 91, 255, 0.7)',
        axisGridlineColor: '#ccc',
        showAxisLabels: true,
        autoScroll: true,
        responsive: true
      },
      overview: {
        container: overviewRef.current,
        waveformColor: 'rgb(45, 91, 255)',
        playedWaveformColor: 'rgba(45, 91, 255, 0.7)',
        axisGridlineColor: '#ccc',
        showAxisLabels: false,
        responsive: true
      },
      mediaElement: audio,
      webAudio: {
        audioContext: new (window.AudioContext || window.webkitAudioContext)(),
      },
      height: 100,
      keyboard: true,
      pointMarkerColor: '#006eb0',
      showPlayheadTime: true,
      responsive: true
    };

    // Initialize Peaks
    Peaks.init(options, (err, peaks) => {
      if (err) {
        console.error('Failed to initialize Peaks instance:', err);
        return;
      }

      setPeaksInstance(peaks);
      
      // Add event listeners
      audio.addEventListener('play', () => setIsPlaying(true));
      audio.addEventListener('pause', () => setIsPlaying(false));
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        peaks.player.seek(0);
      });

      // Auto-play using peaks instance if enabled
      if (autoPlay) {
        setTimeout(() => {
          peaks.player.play().catch(error => {
            console.warn('Auto-play failed:', error);
          });
        }, 100);
      }
    });

    // Add window resize handler
    const handleResize = () => {
      if (peaksInstance) {
        peaksInstance.emit('window_resize');
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      if (peaksInstance) {
        peaksInstance.destroy();
      }
      audio.pause();
      window.removeEventListener('resize', handleResize);
    };
  }, [audioUrl, autoPlay]);

  const togglePlay = () => {
    if (!audioRef.current || !peaksInstance) return;
    
    if (isPlaying) {
      peaksInstance.player.pause();
    } else {
      peaksInstance.player.play();
    }
  };

  return (
    <div 
      ref={containerRef}
      style={{ 
        cursor: 'pointer',
        width: '100%',
        maxWidth: '100%',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        padding: '8px',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
      onClick={togglePlay}
    >
      <div 
        ref={zoomviewRef}
        style={{
          width: '100%',
          height: '100px',
          marginBottom: '10px',
          overflow: 'hidden'
        }}
      />
      <div 
        ref={overviewRef}
        style={{
          width: '100%',
          height: '50px',
          overflow: 'hidden'
        }}
      />
    </div>
  );
};

export default AudioWave;
