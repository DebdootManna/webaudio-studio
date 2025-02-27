/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/plugins/regions';

interface WaveformEditorProps {
  audioBuffer: AudioBuffer;
  audioContext: AudioContext;
}

export default function WaveformEditor({ audioBuffer, audioContext }: WaveformEditorProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  const [currentRegion, setCurrentRegion] = useState<any>(null);
  
  useEffect(() => {
    if (!waveformRef.current || !audioBuffer) return;
    
    // Create and initialize WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4F46E5',
      progressColor: '#818CF8',
      cursorColor: '#C7D2FE',
      height: 120,
      normalize: true,
    });
    
    // Create a blob from the audio buffer
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const audioData = new Float32Array(length);
    
    // Mix down all channels to mono if needed
    const channel = audioBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      audioData[i] = channel[i];
    }
    
    // Create a new audio buffer
    const newBuffer = audioContext.createBuffer(1, length, sampleRate);
    newBuffer.getChannelData(0).set(audioData);
    
    // Convert the buffer to a blob
    const blob = bufferToWave(newBuffer, 0, newBuffer.length);
    
    // Load the blob
    wavesurfer.loadBlob(blob);
    
    // Initialize regions plugin
    const regions = wavesurfer.registerPlugin(RegionsPlugin.create());
    regionsRef.current = regions;
    
    // Add event listeners for regions
    regions.on('region-created', (region) => {
      setCurrentRegion(region);
    });
    
    regions.on('region-updated', (region) => {
      setCurrentRegion(region);
    });
    
    wavesurferRef.current = wavesurfer;
    
    // Cleanup function
    return () => {
      wavesurfer.destroy();
    };
  }, [audioBuffer, audioContext]);
  
  // Helper function to convert buffer to wave
  function bufferToWave(buffer: AudioBuffer, start: number, end: number) {
    const numberOfChannels = buffer.numberOfChannels;
    const length = end - start;
    const sampleRate = buffer.sampleRate;
    const waveData = new Float32Array(length * numberOfChannels);
    
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        waveData[(i * numberOfChannels) + channel] = channelData[start + i];
      }
    }
    
    const wavDataView = encodeWAV(waveData, numberOfChannels, sampleRate);
    const blob = new Blob([wavDataView], { type: 'audio/wav' });
    return blob;
  }
  
  function encodeWAV(samples: Float32Array, numChannels: number, sampleRate: number) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    
    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numChannels * 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);
    
    floatTo16BitPCM(view, 44, samples);
    
    return view;
  }
  
  function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
  
  function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
  }
  
  // Functions for editing operations
  const handleCreateRegion = () => {
    if (!wavesurferRef.current || !regionsRef.current) return;
    
    const duration = wavesurferRef.current.getDuration();
    regionsRef.current.addRegion({
      start: duration * 0.25,
      end: duration * 0.75,
      color: 'rgba(129, 140, 248, 0.3)',
      drag: true,
      resize: true,
    });
  };
  
  const handleTrimAudio = () => {
    if (!currentRegion || !wavesurferRef.current || !audioBuffer) return;
    
    // Get region boundaries
    const start = Math.floor(currentRegion.start * audioBuffer.sampleRate);
    const end = Math.floor(currentRegion.end * audioBuffer.sampleRate);
    
    // Create a new buffer for the trimmed audio
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      end - start,
      audioBuffer.sampleRate
    );
    
    // Copy the region data to the new buffer
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);
      
      for (let i = 0; i < (end - start); i++) {
        newChannelData[i] = channelData[start + i];
      }
    }
    
    // Convert to blob and load into wavesurfer
    const blob = bufferToWave(newBuffer, 0, newBuffer.length);
    wavesurferRef.current.loadBlob(blob);
    
    // Reset regions
    regionsRef.current?.clearRegions();
    setCurrentRegion(null);
  };
  
  const handleSplitAudio = () => {
    if (!currentRegion || !wavesurferRef.current || !audioBuffer) return;
    
    // For simplicity, we'll just demonstrate keeping the left part
    // In a real app, you would create two separate buffers and let the user choose
    
    const splitPoint = Math.floor(currentRegion.start * audioBuffer.sampleRate);
    
    // Create a new buffer for the left part
    const newBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      splitPoint,
      audioBuffer.sampleRate
    );
    
    // Copy the left part data to the new buffer
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const newChannelData = newBuffer.getChannelData(channel);
      
      for (let i = 0; i < splitPoint; i++) {
        newChannelData[i] = channelData[i];
      }
    }
    
    // Convert to blob and load into wavesurfer
    const blob = bufferToWave(newBuffer, 0, newBuffer.length);
    wavesurferRef.current.loadBlob(blob);
    
    // Reset regions
    regionsRef.current?.clearRegions();
    setCurrentRegion(null);
  };
  
  return (
    <div className="mb-4">
      <div ref={waveformRef} className="mb-4"></div>
      
      <div className="flex space-x-2 mb-4">
        <button 
          onClick={handleCreateRegion}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded"
        >
          Select Region
        </button>
        
        <button 
          onClick={handleTrimAudio}
          disabled={!currentRegion}
          className={`px-3 py-1 rounded ${
            currentRegion 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Trim
        </button>
        
        <button 
          onClick={handleSplitAudio}
          disabled={!currentRegion}
          className={`px-3 py-1 rounded ${
            currentRegion 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Split
        </button>
      </div>
    </div>
  );
}