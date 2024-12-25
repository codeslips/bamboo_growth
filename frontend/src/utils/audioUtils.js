export const combineAudioBuffers = async (buffers, audioContext, targetSampleRate) => {
  // First calculate total duration rather than samples since we're changing sample rate
  const totalDuration = buffers.reduce((acc, buffer) => acc + buffer.duration, 0);
  
  // Create offline context with target sample rate
  const offlineContext = new OfflineAudioContext(
    1, 
    Math.ceil(totalDuration * targetSampleRate), 
    targetSampleRate
  );

  let currentOffset = 0;
  for (const buffer of buffers) {
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start(currentOffset);
    currentOffset += buffer.duration;
  }

  return offlineContext.startRendering();
};

export const exportBufferToWavBlob = (buffer, sampleRate) => {
  const numOfChannels = buffer.numberOfChannels;
  const numSamples = buffer.length;
  // Use 2 bytes (16 bits) per sample
  const bytesPerSample = 2;
  const length = numSamples * numOfChannels * bytesPerSample + 44;
  const outputBuffer = new ArrayBuffer(length);
  const view = new DataView(outputBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * numOfChannels * bytesPerSample, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  // PCM format
  view.setUint16(22, numOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChannels * bytesPerSample, true);  // byte rate
  view.setUint16(32, numOfChannels * bytesPerSample, true);  // block align
  view.setUint16(34, 16, true);  // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * numOfChannels * bytesPerSample, true);

  // Use Int16Array for 16-bit samples
  const channelData = new Int16Array(numSamples * numOfChannels);
  for (let channel = 0; channel < numOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < numSamples; i++) {
      // Convert float32 (-1 to 1) to int16 (-32768 to 32767)
      channelData[i * numOfChannels + channel] = Math.max(-1, Math.min(1, data[i])) * 32767;
    }
  }
  
  new Uint8Array(outputBuffer, 44).set(new Uint8Array(channelData.buffer));

  return new Blob([view], { type: 'audio/wav' });
};

const writeString = (view, offset, string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

export const createMuteAudioBlob = (duration, sampleRate = 44100) => {
  console.log('20251026001', duration, sampleRate);

  //duration *= 1.2;
  const numOfChannels = 1;
  const numSamples = sampleRate * duration;
  const length = numSamples * numOfChannels * 2 + 44;
  const outputBuffer = new ArrayBuffer(length);
  const view = new DataView(outputBuffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * numOfChannels * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChannels * 2, true);
  view.setUint16(32, numOfChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * numOfChannels * 2, true);

  const channelData = new Int16Array(numSamples * numOfChannels);
  // All samples are zero, already initialized

  new Uint8Array(outputBuffer, 44).set(new Uint8Array(channelData.buffer));

  return new Blob([view], { type: 'audio/wav' });
};

export const compressAudioBlob = async (audioBlob, targetDuration, audioContext = new AudioContext()) => {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const targetSampleRate = 16666;
  // First trim silence
  const trimmedBuffer = await trimSilence(audioBuffer);
  
  // Convert to target sample rate first
  const sampleRateRatio = targetSampleRate / trimmedBuffer.sampleRate;
  const newLength = Math.round(trimmedBuffer.length * sampleRateRatio);
  const offlineContext = new OfflineAudioContext(1, newLength, targetSampleRate);
  
  // Add these lines to properly connect and transfer the audio data
  const source = offlineContext.createBufferSource();
  source.buffer = trimmedBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  const resampledBuffer = await offlineContext.startRendering();
  
  // If the trimmed audio is shorter than target duration, add mute blob
  console.log('20251026001', resampledBuffer.duration, targetDuration);
  if (resampledBuffer.duration < targetDuration) {
    const muteDuration = targetDuration - resampledBuffer.duration;
    const muteBlob = createMuteAudioBlob(muteDuration, targetSampleRate);
    
    // Convert both blobs to buffers and combine them
    const muteArrayBuffer = await muteBlob.arrayBuffer();
    const muteAudioBuffer = await audioContext.decodeAudioData(muteArrayBuffer);
    
    const combinedBuffer = await combineAudioBuffers(
      [resampledBuffer, muteAudioBuffer], // Changed from trimmedBuffer to resampledBuffer
      audioContext, 
      targetSampleRate
    );

    return exportBufferToWavBlob(combinedBuffer, targetSampleRate);
  }
  
  // If compression is needed
  if (targetDuration < resampledBuffer.duration) {
    const compressionRatio = resampledBuffer.duration / targetDuration;
    
    // Create offline context for compression
    const compressContext = new OfflineAudioContext(
      1,
      Math.ceil(resampledBuffer.length / compressionRatio),
      targetSampleRate
    );

    // Create source node
    const source = compressContext.createBufferSource();
    source.buffer = resampledBuffer;
    
    // Add playbackRate to actually compress the audio by speeding it up
    source.playbackRate.value = compressionRatio;
    
    source.connect(compressContext.destination);
    source.start(0);

    const compressedBuffer = await compressContext.startRendering();
    return exportBufferToWavBlob(compressedBuffer, targetSampleRate);
  }
  
  // If no compression needed and duration matches
  return exportBufferToWavBlob(resampledBuffer, targetSampleRate);
};

// Update the exportBufferToBlob function to be more efficient
export const exportBufferToBlob = async (buffer, sampleRate, mimeType) => {
  if (mimeType === 'audio/wav') {
    return exportBufferToWavBlob(buffer, sampleRate);
  }
  
  // For other formats, use MediaRecorder for better compression
  const audioContext = new AudioContext();
  const mediaStreamDest = audioContext.createMediaStreamDestination();
  const sourceNode = audioContext.createBufferSource();
  sourceNode.buffer = buffer;
  sourceNode.connect(mediaStreamDest);
  
  return new Promise((resolve) => {
    const mediaRecorder = new MediaRecorder(mediaStreamDest.stream, {
      mimeType: mimeType,
      bitsPerSecond: 128000
    });
    
    mediaRecorder.ondataavailable = (event) => {
      resolve(event.data);
    };
    
    mediaRecorder.start();
    sourceNode.start(0);
    setTimeout(() => mediaRecorder.stop(), (buffer.duration * 1000) + 100);
  });
};

// Add these new utility functions at the top of the file

export const trimSilence = async (audioBuffer, threshold = 0.01) => {
  const targetSampleRate = 16666;
  const channelData = audioBuffer.getChannelData(0); // Get mono channel data
  const bufferLength = channelData.length;
  
  // Find start position (first non-silent sample)
  let startPos = 0;
  for (let i = 0; i < bufferLength; i++) {
    if (Math.abs(channelData[i]) > threshold) {
      startPos = Math.max(0, i - 2000); // Keep 2000 samples before voice starts
      break;
    }
  }
  
  // Find end position (last non-silent sample)
  let endPos = bufferLength - 1;
  for (let i = bufferLength - 1; i >= 0; i--) {
    if (Math.abs(channelData[i]) > threshold) {
      endPos = Math.min(bufferLength - 1, i + 2000); // Keep 2000 samples after voice ends
      break;
    }
  }
  
  // Create new buffer with only the non-silent portion
  const trimmedLength = endPos - startPos;
  const offlineContext = new OfflineAudioContext(1, trimmedLength, audioBuffer.sampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0, startPos / audioBuffer.sampleRate);
  
  return offlineContext.startRendering();
};
