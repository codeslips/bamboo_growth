import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip, CircularProgress } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { post_json } from '../../api/index';

const WordCard = ({ word }) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    const initAudio = async () => {
      try {
        setIsPlayingAudio(true);
        const response = await post_json('/tts', {
          text: word.text,
          voice: 'en-US-AriaNeural',
          output_format: 'audio-16khz-32kbitrate-mono-mp3',
        });

        if (!response.data || !response.data.audio || typeof response.data.audio !== 'string') {
          throw new Error('Invalid audio data received from server');
        }

        const decodedAudio = atob(response.data.audio);
        const audioArray = new Uint8Array(decodedAudio.length);
        for (let i = 0; i < decodedAudio.length; i++) {
          audioArray[i] = decodedAudio.charCodeAt(i);
        }

        const audioBlob = new Blob([audioArray], { type: 'audio/mp3' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Play the audio immediately
        const audio = new Audio(url);
        audio.onended = () => setIsPlayingAudio(false);
        audio.play();
      } catch (error) {
        console.error('Error initializing audio:', error);
        setIsPlayingAudio(false);
      }
    };

    initAudio();

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [word.text]);

  const onPlayAudio = () => {
    if (isPlayingAudio || !audioUrl) return;

    setIsPlayingAudio(true);
    const audio = new Audio(audioUrl);
    audio.onended = () => setIsPlayingAudio(false);
    audio.play();
  };

  return (
    <Card sx={{ minWidth: 275, m: 1 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h5" component="div">
            {word.text}
          </Typography>
          {isPlayingAudio ? (
            <CircularProgress size={24} />
          ) : (
            <VolumeUpIcon 
              sx={{ cursor: 'pointer' }} 
              onClick={onPlayAudio}
            />
          )}
        </Box>
        {word.pronunciation && (
          <Typography sx={{ mb: 1.5 }} color="text.secondary">
            /{word.pronunciation}/
          </Typography>
        )}
        {word.translation && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            {word.translation}
          </Typography>
        )}
        {word.partOfSpeech && (
          <Chip 
            label={word.partOfSpeech} 
            size="small" 
            sx={{ backgroundColor: 'primary.light', color: 'primary.contrastText' }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default WordCard;
