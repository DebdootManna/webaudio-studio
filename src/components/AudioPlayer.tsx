'use client';

import { useEffect, useRef, useState } from 'react';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

interface AudioPlayerProps {
  audioBuffer: AudioBuffer;
  audioContext: AudioContext;
}

export default function AudioPlayer({ audioBuffer, audioContext }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (audioBuffer) {
      setDuration(audioBuffer.duration);
    }
    
    return () => {
      sourceRef.current?.stop();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioBuffer]);
  
  const handlePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };
  
  const playAudio = () => {
    // Stop current playback if any
    sourceRef.current?.stop();
    
    // Create a new source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Create a gain node for volume control
    const gainNode = audioContext.createGain();
    gainNode.gain.value = isMuted ? 0 : volume;
    
    // Connect nodes
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Save references
    sourceRef.current = source;
    gainNodeRef.current = gainNode;
    
    // Calculate start time
    const offset = pausedTimeRef.current;
    startTimeRef.current = audioContext.currentTime - offset;
    
    // Start playback
    source.start(0, offset);
    setIsPlaying(true);
    
    // Start animation for time update
    animationRef.current = requestAnimationFrame(updatePlaybackTime);
  };
  
  const pauseAudio = () => {
    sourceRef.current?.stop();
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    pausedTimeRef.current = currentTime;
    setIsPlaying(false);
  };
  
  const updatePlaybackTime = () => {
    const elapsed = audioContext.currentTime - startTimeRef.current;
    setCurrentTime(elapsed > duration ? duration : elapsed);
    
    if (elapsed < duration) {
      animationRef.current = requestAnimationFrame(updatePlaybackTime);
    } else {
      setIsPlaying(false);
      pausedTimeRef.current = 0;
      setCurrentTime(0);
    }
  };
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    pausedTimeRef.current = newTime;
    
    if (isPlaying) {
      playAudio();
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = isMuted ? 0 : newVolume;
    }
  };
  
  const toggleMute = () => {
    setIsMuted(!isMuted);
    
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = !isMuted ? 0 : volume;
    }
  };
  
  // Format time in MM:SS
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex flex-col space-y-2 mb-4">
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePlayPause}
          className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full p-2 focus:outline-none"
        >
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
        
        <span className="text-sm">{formatTime(currentTime)}</span>
        
        <input
          type="range"
          min="0"
          max={duration}
          step="0.01"
          value={currentTime}
          onChange={handleTimeChange}
          className="flex-grow h-2 bg-gray-200 rounded-md appearance-none"
        />
        
        <span className="text-sm">{formatTime(duration)}</span>
        
        <button
          onClick={toggleMute}
          className="text-gray-600 hover:text-gray-800 focus:outline-none"
        >
          {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
        
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="w-24 h-2 bg-gray-200 rounded-md appearance-none"
        />
      </div>
    </div>
  );
}