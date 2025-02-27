from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn
import os
import uuid
import json
import tempfile
import shutil
from pydub import AudioSegment
from spleeter.separator import Separator
import numpy as np
import librosa
import soundfile as sf
import matplotlib.pyplot as plt

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, use specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create temp directory for file storage
os.makedirs("temp", exist_ok=True)

@app.post("/api/extract-vocals")
async def extract_vocals(audio: UploadFile = File(...)):
    # Generate unique ID for this request
    request_id = str(uuid.uuid4())
    temp_dir = os.path.join("temp", request_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    # Save uploaded file
    input_path = os.path.join(temp_dir, "input.wav")
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
    
    # Use Spleeter to separate vocals and instrumental
    separator = Separator('spleeter:2stems')
    separator.separate_to_file(input_path, temp_dir)
    
    # Paths to the separated files
    vocals_path = os.path.join(temp_dir, "input", "vocals.wav")
    instrumental_path = os.path.join(temp_dir, "input", "accompaniment.wav")
    
    # Return URLs to the separated files
    return {
        "vocalUrl": f"/api/audio/{request_id}/vocals",
        "instrumentalUrl": f"/api/audio/{request_id}/instrumental"
    }

@app.get("/api/audio/{request_id}/{track_type}")
async def get_audio(request_id: str, track_type: str):
    if track_type not in ["vocals", "instrumental"]:
        return {"error": "Invalid track type"}
    
    track_filename = "vocals.wav" if track_type == "vocals" else "accompaniment.wav"
    file_path = os.path.join("temp", request_id, "input", track_filename)
    
    if not os.path.exists(file_path):
        return {"error": "File not found"}
    
    return FileResponse(file_path)

@app.post("/api/apply-eq")
async def apply_eq(
    audio: UploadFile = File(...),
    eq_settings: str = Form(...)
):
    # Generate unique ID for this request
    request_id = str(uuid.uuid4())
    temp_dir = os.path.join("temp", request_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    # Save uploaded file
    input_path = os.path.join(temp_dir, "input.wav")
    with open(input_path, "wb") as buffer:
        shutil.copyfileobj(audio.file, buffer)
    
    # Parse EQ settings
    settings = json.loads(eq_settings)
    
    # Load audio file
    y, sr = librosa.load(input_path, sr=None)
    
    # Apply EQ using FFT
    # This is a simplified implementation
    Y = np.fft.rfft(y)
    freqs = np.fft.rfftfreq(len(y), 1/sr)
    
    # Apply each EQ band
    for band in settings:
        freq = band["frequency"]
        gain = band["gain"]
        
        # Convert gain from dB to linear
        gain_linear = 10 ** (gain / 20)
        
        # Simple bell curve for each band
        bandwidth = freq * 0.3  # 30% of the center frequency as bandwidth
        mask = np.exp(-((freqs - freq) ** 2) / (2 * bandwidth ** 2))
        
        # Apply gain
        Y *= 1 + mask * (gain_linear - 1)
    
    # Inverse FFT to get the processed audio
    y_processed = np.fft.irfft(Y)
    
    # Save processed audio
    output_path = os.path.join(temp_dir, "output.wav")
    sf.write(output_path, y_processed, sr)
    
    # Return URL to the processed file
    return {
        "processedUrl": f"/api/audio/{request_id}/processed"
    }

@app.get("/api/audio/{request_id}/processed")
async def get_processed_audio(request_id: str):
    file_path = os.path.join("temp", request_id, "output.wav")
    
    if not os.path.exists(file_path):
        return {"error": "File not found"}
    
    return FileResponse(file_path)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)