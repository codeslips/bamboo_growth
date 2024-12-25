import React, { useState, useRef } from 'react';
import { assessPronunciation } from '../api/index';

const PronunciationAssessment = () => {
  const [referenceText, setReferenceText] = useState('');
  const [language, setLanguage] = useState('en-US');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorder = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Error accessing microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!audioBlob) {
      setError('Please record audio before submitting.');
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('reference_text', referenceText);
    formData.append('language', language);

    try {
      const data = await assessPronunciation(formData);
      setResult(data);
      setError(null);
    } catch (err) {
      console.error('Error submitting assessment:', err);
      setError('Error submitting assessment. Please try again.');
    }
  };

  return (
    <div>
      <h2>Pronunciation Assessment</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="referenceText">Reference Text:</label>
          <input
            type="text"
            id="referenceText"
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="language">Language:</label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en-US">English (US)</option>
            <option value="es-ES">Spanish (Spain)</option>
            {/* Add more language options as needed */}
          </select>
        </div>
        <div>
          <button type="button" onClick={isRecording ? stopRecording : startRecording}>
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
        </div>
        <button type="submit" disabled={!audioBlob}>
          Submit for Assessment
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div>
          <h3>Assessment Results:</h3>
          <p>Recognized Text: {result.recognizedText}</p>
          <p>Accuracy Score: {result.accuracyScore}</p>
          <p>Pronunciation Score: {result.pronunciationScore}</p>
          <p>Completeness Score: {result.completenessScore}</p>
          <p>Fluency Score: {result.fluencyScore}</p>
        </div>
      )}
    </div>
  );
};

export default PronunciationAssessment;
