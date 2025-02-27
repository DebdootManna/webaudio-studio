/* eslint-disable @typescript-eslint/no-explicit-any */
// API client for making calls to the backend

export async function uploadAudio(file: File) {
    const formData = new FormData();
    formData.append('audio', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return await response.json();
  }
  
  export async function extractVocals(file: File) {
    const formData = new FormData();
    formData.append('audio', file);
    
    const response = await fetch('/api/extract-vocals', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Vocal extraction failed: ${response.status}`);
    }
    
    return await response.json();
  }
  
  export async function applyEqualizer(file: File, eqSettings: any) {
    const formData = new FormData();
    formData.append('audio', file);
    formData.append('eqSettings', JSON.stringify(eqSettings));
    
    const response = await fetch('/api/apply-eq', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`EQ application failed: ${response.status}`);
    }
    
    return await response.json();
  }