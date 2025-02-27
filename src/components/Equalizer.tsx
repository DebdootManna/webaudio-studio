/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useRef, useState } from 'react';

interface EqualizerProps {
  audioContext: AudioContext | null;
  audioBuffer: AudioBuffer | null;
}

interface EQBand {
  frequency: number;
  gain: number;
  type: BiquadFilterType;
  filter: BiquadFilterNode | null;
  label: string;
}

export default function Equalizer({ audioContext, audioBuffer }: EqualizerProps) {
  // Define the 8 EQ bands
  const [bands, setBands] = useState<EQBand[]>([
    { frequency: 60, gain: 0, type: 'lowshelf', filter: null, label: '60Hz' },
    { frequency: 170, gain: 0, type: 'peaking', filter: null, label: '170Hz' },
    { frequency: 310, gain: 0, type: 'peaking', filter: null, label: '310Hz' },
    { frequency: 600, gain: 0, type: 'peaking', filter: null, label: '600Hz' },
    { frequency: 1000, gain: 0, type: 'peaking', filter: null, label: '1kHz' },
    { frequency: 3000, gain: 0, type: 'peaking', filter: null, label: '3kHz' },
    { frequency: 6000, gain: 0, type: 'peaking', filter: null, label: '6kHz' },
    { frequency: 12000, gain: 0, type: 'highshelf', filter: null, label: '12kHz' },
  ]);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const filterChainRef = useRef<BiquadFilterNode[]>([]);
  const analyzersRef = useRef<AnalyserNode[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  
  // Setup equalizer
  useEffect(() => {
    if (!audioContext || !audioBuffer) return;
    
    // Create filter nodes
    const newBands = bands.map((band) => {
      const filter = audioContext.createBiquadFilter();
      filter.type = band.type;
      filter.frequency.value = band.frequency;
      filter.gain.value = band.gain;
      filter.Q.value = 1;
      
      return {
        ...band,
        filter,
      };
    });
    
    setBands(newBands);
    filterChainRef.current = newBands.map(band => band.filter!);
    
    // Create analyzers for visualization
    const analyzers = newBands.map(() => {
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      return analyzer;
    });
    
    analyzersRef.current = analyzers;
    
    // Initialize canvas references array
    canvasRefs.current = new Array(bands.length).fill(null);
    
    // Cleanup function
    return () => {
      sourceRef.current?.stop();
    };
  }, [audioContext, audioBuffer]);
  
  // Handle gain change for a specific band
  const handleGainChange = (index: number, gain: number) => {
    const newBands = [...bands];
    newBands[index].gain = gain;
    newBands[index].filter!.gain.value = gain;
    setBands(newBands);
    
    // Update visualization
    drawEqVisualization();
  };
  
  // Preview equalizer effect
  const handlePreview = () => {
    if (!audioContext || !audioBuffer) return;
    
    if (isPlaying) {
      // Stop playback
      sourceRef.current?.stop();
      setIsPlaying(false);
      return;
    }
    
    // Create source
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Connect source to the filter chain
    let currentNode: AudioNode = source;
    
    filterChainRef.current.forEach((filter, index) => {
      currentNode.connect(filter);
      currentNode = filter;
      
      // Connect to analyzer for visualization
      filter.connect(analyzersRef.current[index]);
    });
    
    // Connect the last node to the destination
    currentNode.connect(audioContext.destination);
    
    // Store the source and start playback
    sourceRef.current = source;
    source.start();
    setIsPlaying(true);
    
    // Start visualization
    requestAnimationFrame(updateVisualizations);
    
    // Stop after playing the entire buffer
    source.onended = () => {
      setIsPlaying(false);
    };
  };
  
  // Reset equalizer settings
  const handleReset = () => {
    const newBands = bands.map(band => {
      band.gain = 0;
      band.filter!.gain.value = 0;
      return band;
    });
    
    setBands(newBands);
    drawEqVisualization();
  };
  
  // Draw equalizer curve visualization
  const drawEqVisualization = () => {
    const canvas = document.getElementById('eq-curve') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, width, height);
    
    // Draw center line
    ctx.beginPath();
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    
    // Draw EQ curve
    ctx.beginPath();
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 2;
    
    // Map frequencies to x-coordinates (log scale)
    const frequencyToX = (freq: number) => {
      const minFreq = 20;
      const maxFreq = 20000;
      const logMin = Math.log10(minFreq);
      const logMax = Math.log10(maxFreq);
      const x = ((Math.log10(freq) - logMin) / (logMax - logMin)) * width;
      return x;
    };
    
    // Map gain to y-coordinates
    const gainToY = (gain: number) => {
      const minGain = -20;
      const maxGain = 20;
      return height - ((gain - minGain) / (maxGain - minGain)) * height;
    };
    
    // Draw smooth curve through the band points
    const points: [number, number][] = bands.map(band => [
      frequencyToX(band.frequency),
      gainToY(band.gain)
    ]);
    
    // Sort points by x coordinate
    points.sort((a, b) => a[0] - b[0]);
    
    // Draw curve
    ctx.moveTo(0, gainToY(bands[0].gain));
    
    for (let i = 0; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    
    ctx.lineTo(width, gainToY(bands[bands.length - 1].gain));
    ctx.stroke();
    
    // Draw points at each band
    bands.forEach(band => {
      const x = frequencyToX(band.frequency);
      const y = gainToY(band.gain);
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#4F46E5';
      ctx.fill();
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };
  
  // Update real-time visualizations for each band
  const updateVisualizations = () => {
    if (!isPlaying) return;
    
    analyzersRef.current.forEach((analyzer, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const width = canvas.width;
      const height = canvas.height;
      
      // Get frequency data
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyzer.getByteFrequencyData(dataArray);
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      // Draw visualization
      ctx.fillStyle = '#4F46E5';
      
      // Calculate bar width and height
      const barWidth = width / bufferLength;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
      }
    });
    
    requestAnimationFrame(updateVisualizations);
  };
  
  // Set canvas ref for each band
  const setCanvasRef = (index: number, canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      canvasRefs.current[index] = canvas;
    }
  };
  
  // Draw the EQ curve when component mounts
  useEffect(() => {
    drawEqVisualization();
  }, [bands]);
  
  return (
    <div>
      <div className="mb-4">
        <canvas 
          id="eq-curve" 
          width="600" 
          height="200" 
          className="w-full h-32 bg-gray-100 rounded"
        ></canvas>
      </div>
      
      <div className="grid grid-cols-8 gap-2">
        {bands.map((band, index) => (
          <div key={index} className="flex flex-col items-center">
            <span className="text-xs font-medium mb-1">{band.label}</span>
            
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={band.gain}
              onChange={(e) => handleGainChange(index, parseFloat(e.target.value))}
              className="h-24 appearance-none bg-gray-200 rounded-full"
              style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}
            />
            
            <span className="text-xs mt-1">{band.gain > 0 ? `+${band.gain}` : band.gain} dB</span>
            
            <canvas 
              ref={(canvas) => setCanvasRef(index, canvas)}
              width="50" 
              height="30" 
              className="w-full h-8 mt-1"
            ></canvas>
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex space-x-2">
        <button
          onClick={handlePreview}
          className={`px-4 py-1 rounded-md ${
            isPlaying 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-indigo-500 hover:bg-indigo-600 text-white'
          }`}
        >
          {isPlaying ? 'Stop' : 'Preview'}
        </button>
        
        <button
          onClick={handleReset}
          className="px-4 py-1 bg-gray-300 hover:bg-gray-400 rounded-md"
        >
          Reset
        </button>
      </div>
    </div>
  );
}