export async function trimAudio(audioBuffer: AudioBuffer, startTime: number, endTime: number): Promise<AudioBuffer> {
    const audioContext = new AudioContext();
    
    // Calculate start and end samples
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const length = endSample - startSample;
    
    // Create a new buffer for the trimmed audio
    const trimmedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      sampleRate
    );
    
    // Copy the data from the original buffer to the trimmed buffer
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const trimmedChannelData = trimmedBuffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        trimmedChannelData[i] = channelData[startSample + i];
      }
    }
    
    return trimmedBuffer;
  }
  
  export async function splitAudio(audioBuffer: AudioBuffer, splitPoint: number): Promise<[AudioBuffer, AudioBuffer]> {
    const audioContext = new AudioContext();
    
    // Calculate split sample
    const sampleRate = audioBuffer.sampleRate;
    const splitSample = Math.floor(splitPoint * sampleRate);
    
    // Create two new buffers for the split parts
    const leftBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      splitSample,
      sampleRate
    );
    
    const rightBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length - splitSample,
      sampleRate
    );
    
    // Copy the data from the original buffer to the split buffers
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const leftChannelData = leftBuffer.getChannelData(channel);
      const rightChannelData = rightBuffer.getChannelData(channel);
      
      // Copy to left buffer
      for (let i = 0; i < splitSample; i++) {
        leftChannelData[i] = channelData[i];
      }
      
      // Copy to right buffer
      for (let i = 0; i < audioBuffer.length - splitSample; i++) {
        rightChannelData[i] = channelData[splitSample + i];
      }
    }
    
    return [leftBuffer, rightBuffer];
  }
  
  export async function applyFade(audioBuffer: AudioBuffer, fadeInDuration: number, fadeOutDuration: number): Promise<AudioBuffer> {
    const audioContext = new AudioContext();
    
    // Create a new buffer with the same properties
    const processedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      audioBuffer.sampleRate
    );
    
    // Calculate fade samples
    const fadeInSamples = Math.floor(fadeInDuration * audioBuffer.sampleRate);
    const fadeOutSamples = Math.floor(fadeOutDuration * audioBuffer.sampleRate);
    
    // Apply fade to each channel
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const processedChannelData = processedBuffer.getChannelData(channel);
      
      // Copy and apply fade
      for (let i = 0; i < audioBuffer.length; i++) {
        let gain = 1;
        
        // Fade in
        if (i < fadeInSamples) {
          gain = i / fadeInSamples;
        }
        
        // Fade out
        if (i > audioBuffer.length - fadeOutSamples) {
          gain = (audioBuffer.length - i) / fadeOutSamples;
        }
        
        processedChannelData[i] = channelData[i] * gain;
      }
    }
    
    return processedBuffer;
  }
  
  export async function applyCrossfade(leftBuffer: AudioBuffer, rightBuffer: AudioBuffer, crossfadeDuration: number): Promise<AudioBuffer> {
    const audioContext = new AudioContext();
    
    // Calculate crossfade samples
    const crossfadeSamples = Math.floor(crossfadeDuration * leftBuffer.sampleRate);
    
    // Create a new buffer for the combined audio
    const combinedLength = leftBuffer.length + rightBuffer.length - crossfadeSamples;
    const combinedBuffer = audioContext.createBuffer(
      Math.max(leftBuffer.numberOfChannels, rightBuffer.numberOfChannels),
      combinedLength,
      leftBuffer.sampleRate
    );
    
    // Apply crossfade to each channel
    for (let channel = 0; channel < combinedBuffer.numberOfChannels; channel++) {
      const leftChannelData = channel < leftBuffer.numberOfChannels 
        ? leftBuffer.getChannelData(channel) 
        : new Float32Array(leftBuffer.length).fill(0);
      
      const rightChannelData = channel < rightBuffer.numberOfChannels 
        ? rightBuffer.getChannelData(channel) 
        : new Float32Array(rightBuffer.length).fill(0);
      
      const combinedChannelData = combinedBuffer.getChannelData(channel);
      
      // Copy left buffer (except the crossfade region)
      for (let i = 0; i < leftBuffer.length - crossfadeSamples; i++) {
        combinedChannelData[i] = leftChannelData[i];
      }
      
      // Apply crossfade
      for (let i = 0; i < crossfadeSamples; i++) {
        const leftIndex = leftBuffer.length - crossfadeSamples + i;
        const rightIndex = i;
        const combinedIndex = leftBuffer.length - crossfadeSamples + i;
        
        // Linear crossfade
        const leftGain = 1 - (i / crossfadeSamples);
        const rightGain = i / crossfadeSamples;
        
        combinedChannelData[combinedIndex] = (leftChannelData[leftIndex] * leftGain) + (rightChannelData[rightIndex] * rightGain);
      }
      
      // Copy right buffer (after the crossfade region)
      for (let i = crossfadeSamples; i < rightBuffer.length; i++) {
        const rightIndex = i;
        const combinedIndex = leftBuffer.length - crossfadeSamples + i;
        
        combinedChannelData[combinedIndex] = rightChannelData[rightIndex];
      }
    }
    
    return combinedBuffer;
  }