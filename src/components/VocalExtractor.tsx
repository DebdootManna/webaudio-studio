'use client';

import { useState } from 'react';
import { FaDownload, FaSpinner } from 'react-icons/fa';

interface VocalExtractorProps {
  audioFile: File;
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function VocalExtractor({ 
  audioFile, 
  isProcessing, 
  setIsProcessing 
}: VocalExtractorProps) {
  const [progress, setProgress] = useState(0);
  const [vocalUrl, setVocalUrl] = useState<string | null>(null);
  const [instrumentalUrl, setInstrumentalUrl] = useState<string | null>(null);
  
  const extractVocals = async () => {
    if (!audioFile || isProcessing) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    // Clear previous results
    setVocalUrl(null);
    setInstrumentalUrl(null);
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('audio', audioFile);
      
      // Track progress with a simulated progress for now
      // In a real app, you'd use a server-sent events approach
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 1000);
      
      // Send the file to the API for processing
      const response = await fetch('/api/extract-vocals', {
        method: 'POST',
        body: formData,
      });
      
      clearInterval(progressInterval);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      // Set progress to 100%
      setProgress(100);
      
      // Set the URLs for the separated audio tracks
      setVocalUrl(result.vocalUrl);
      setInstrumentalUrl(result.instrumentalUrl);
    } catch (error) {
      console.error('Error extracting vocals:', error);
      alert('Failed to extract vocals. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div>
      <p className="text-gray-600 mb-4">
        Separate vocals from the instrumental track using AI-powered source separation.
      </p>
      
      <button
        onClick={extractVocals}
        disabled={isProcessing}
        className={`w-full py-2 mb-4 rounded-md flex items-center justify-center ${
          isProcessing 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-purple-500 hover:bg-purple-600 text-white'
        }`}
      >
        {isProcessing ? (
          <>
            <FaSpinner className="animate-spin mr-2" />
            Processing ({progress}%)
          </>
        ) : (
          'Extract Vocals'
        )}
      </button>
      
      {(vocalUrl || instrumentalUrl) && (
        <div className="space-y-4">
          {vocalUrl && (
            <div className="bg-gray-100 p-3 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Vocals</h4>
                <a 
                  href={vocalUrl} 
                  download={`vocals_${audioFile.name}`}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <FaDownload />
                </a>
              </div>
              <audio controls src={vocalUrl} className="w-full" />
            </div>
          )}
          
          {instrumentalUrl && (
            <div className="bg-gray-100 p-3 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Instrumental</h4>
                <a 
                  href={instrumentalUrl} 
                  download={`instrumental_${audioFile.name}`}
                  className="text-indigo-600 hover:text-indigo-800"
                >
                  <FaDownload />
                </a>
              </div>
              <audio controls src={instrumentalUrl} className="w-full" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}