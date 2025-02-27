 
'use client';

import { useState, useRef } from 'react';

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
import AudioPlayer from '../components/AudioPlayer';
import WaveformEditor from '../components/WaveformEditor';
import ControlPanel from '../components/ControlPanel';
import Equalizer from '../components/Equalizer';
import VocalExtractor from '../components/VocalExtractor';

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  
  // Refs for audio context and processors
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Function to handle file uploads
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setAudioFile(file);
    
    // Create AudioContext if it doesn't exist
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // Read file and decode audio
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const decodedBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer);
        setAudioBuffer(decodedBuffer);
      } catch (error) {
        console.error('Error decoding audio file:', error);
        alert('Could not process audio file. Please try another one.');
      }
    };
    reader.readAsArrayBuffer(file);
  };
  
  // Function to reset the application
  const handleReset = () => {
    setAudioFile(null);
    setAudioBuffer(null);
    // Reset other state as needed
  };
  
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">WebAudio Studio</h1>
          <p className="text-gray-600">Edit, trim, extract vocals, and equalize audio files in your browser</p>
        </header>
        
        {!audioFile ? (
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <h2 className="text-xl font-semibold mb-4">Upload an Audio File to Begin</h2>
            <p className="mb-6 text-gray-600">Supported formats: MP3, WAV (Max size: 10MB)</p>
            <label className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md cursor-pointer transition">
              Choose File
              <input 
                type="file" 
                accept="audio/mp3,audio/wav" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{audioFile.name}</h2>
                <button 
                  onClick={handleReset}
                  className="text-red-500 hover:text-red-700"
                >
                  Start Over
                </button>
              </div>
              
              {audioBuffer && (
                <>
                  <WaveformEditor 
                    audioBuffer={audioBuffer} 
                    audioContext={audioContextRef.current!} 
                  />
                  <AudioPlayer 
                    audioBuffer={audioBuffer} 
                    audioContext={audioContextRef.current!} 
                  />
                </>
              )}
              
              <ControlPanel 
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4">Vocal Extractor</h3>
                <VocalExtractor 
                  audioFile={audioFile}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                />
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <h3 className="text-lg font-semibold mb-4">8-Band Equalizer</h3>
                <Equalizer 
                  audioContext={audioContextRef.current}
                  audioBuffer={audioBuffer}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}