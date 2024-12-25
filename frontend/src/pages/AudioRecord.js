import React from 'react';
import { Container, Typography } from '@mui/material';
import { RecordAudio } from '../components/RecordAudio.js';
import { VideoPlayer } from '../components/VideoPlayer.js';
import testVideo from '../../../data/course/100000/lesson/1/test.mp4'; // Import the video
import { useState } from 'react';

const AudioRecord = ({ course }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [currentSentence, setCurrentSentence] = useState(1);
  const sentences = [
    { id: 0, text: "China's Einstein Probe", start: 0, end: 6 },
    { id: 1, text: "represents not merely an advancement in technology", start: 6, end: 9 },
    { id: 2, text: "but stands as a profound testament to the power of global cooperation", start: 9, end: 13 },
    { id: 3, text: "in the scientific arena", start: 13, end: 18 },
  ];
  const fullSentences = { id: -1, text: "China's Einstein", start: 0, end: 18 };

  const handleVideoError = (error) => {
    console.error("Error loading video:", error);
    // You might want to set some state here to show an error message to the user
  };

  return (
    <Container>
      <Typography variant="h6">{fullSentences.text}</Typography>
      {/* Add more course details as needed */}
      <VideoPlayer 
        src={testVideo} // Use the imported video
        sentences={sentences}
        currentSentence={currentSentence}
        isRecording={isRecording}
        setIsRecording={setIsRecording}
        fullSentences={fullSentences}
        onError={handleVideoError}
      />
      <RecordAudio 
        sentences={sentences}
        currentSentence={currentSentence}
        setCurrentSentence={setCurrentSentence}  
        isRecording={isRecording}
        setIsRecording={setIsRecording}
        fullSentences={fullSentences}
      />
    </Container>
  );
};

export default AudioRecord;