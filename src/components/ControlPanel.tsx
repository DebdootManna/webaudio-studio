/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { FaArrowLeft, FaArrowRight, FaCut, FaSave } from 'react-icons/fa';

interface ControlPanelProps {
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ControlPanel({ 
  isProcessing, 
  setIsProcessing 
}: ControlPanelProps) {
  // This component will contain buttons for undo/redo and export
  
  const handleExport = () => {
    // Get the audio data from WaveSurfer and download it
    const wavesurfer = (window as any).wavesurfer;
    if (!wavesurfer) {
      console.error('WaveSurfer not initialized');
      return;
    }
    
    // Export to WAV
    wavesurfer.exportPCM().then((blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'edited_audio.wav';
      a.click();
      URL.revokeObjectURL(url);
    });
  };
  
  return (
    <div className="flex justify-between items-center py-2 border-t border-gray-200">
      <div>
        <button 
          className="text-gray-600 hover:text-gray-800 mr-4"
          title="Undo"
          disabled={isProcessing}
        >
          <FaArrowLeft />
        </button>
        
        <button 
          className="text-gray-600 hover:text-gray-800"
          title="Redo"
          disabled={isProcessing}
        >
          <FaArrowRight />
        </button>
      </div>
      
      <div>
        <button 
          className="text-gray-600 hover:text-gray-800 mr-4"
          title="Add Crossfade"
          disabled={isProcessing}
        >
          <FaCut />
        </button>
        
        <button 
          onClick={handleExport}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-1 rounded-md flex items-center"
          disabled={isProcessing}
        >
          <FaSave className="mr-1" /> Export
        </button>
      </div>
    </div>
  );
}