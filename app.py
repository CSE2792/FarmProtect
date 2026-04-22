from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import torch
import cv2
import numpy as np
import base64
from io import BytesIO
from PIL import Image
import os
import sys
import math
import requests

# Add ml directory to path to import model
sys.path.append(os.path.join(os.path.dirname(__file__), "ml"))
from unet_model import WaterloggingUNet

app = FastAPI()

# Enable CORS for frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Model
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = WaterloggingUNet(n_channels=3, n_classes=1)
model_path = os.path.join("ml", "waterlogging_unet.pth")

if os.path.exists(model_path):
    print(f"Loading model weights from {model_path}...")
    model.load_state_dict(torch.load(model_path, map_location=device))
else:
    print(f"Warning: Model weights not found at {model_path}. Running with uninitialized weights.")

model.to(device)
model.eval()

def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = int((lon_deg + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + (1.0 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    return xtile, ytile

def preprocess_image(image_bytes):
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    # Resize to model input size
    img_resized = cv2.resize(img_rgb, (256, 256))
    
    # Normalize
    img_normalized = img_resized.astype(np.float32) / 255.0
    
    # Transpose to (C, H, W) and add batch dimension
    img_tensor = np.transpose(img_normalized, (2, 0, 1))
    img_tensor = np.expand_dims(img_tensor, axis=0)
    
    return torch.tensor(img_tensor).to(device), img_rgb

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    contents = await file.read()
    input_tensor, original_rgb = preprocess_image(contents)
    
    with torch.no_grad():
        prediction = model(input_tensor)
        mask = prediction.squeeze().cpu().numpy()
    
    # Calculate waterlogged percentage
    water_pixels = np.sum(mask > 0.5)
    total_pixels = mask.size
    water_percent = (water_pixels / total_pixels) * 100
    
    # Post-process mask for visualization
    # Resize mask back to original image size
    h, w = original_rgb.shape[:2]
    mask_resized = cv2.resize(mask, (w, h))
    
    # Create an overlay (Blue color for water)
    overlay = original_rgb.copy()
    overlay[mask_resized > 0.5] = [0, 100, 255] # Blueish overlay
    
    # Blend original and overlay
    alpha = 0.4
    blended = cv2.addWeighted(overlay, alpha, original_rgb, 1 - alpha, 0)
    
    # Convert blended result to base64 for frontend
    blended_bgr = cv2.cvtColor(blended, cv2.COLOR_RGB2BGR)
    _, buffer = cv2.imencode('.jpg', blended_bgr)
    result_base64 = base64.b64encode(buffer).decode('utf-8')
    
    # Determine severity and insurance status (mock logic based on user's frontend design)
    severity = "high" if water_percent > 50 else "medium" if water_percent > 15 else "low"
    insurance = "full" if water_percent > 40 else "partial" if water_percent > 10 else "none"
    
    return {
        "water_percent": round(float(water_percent), 2),
        "severity": severity,
        "insurance_claim": insurance,
        "result_image": f"data:image/jpeg;base64,{result_base64}",
        "affected_area": round(float(water_percent * 0.1), 2) # Mock ha calculation
    }

@app.get("/analyze-location")
async def analyze_location(lat: float, lon: float, zoom: int = 16):
    # Get tile coordinates
    xtile, ytile = deg2num(lat, lon, zoom)
    
    # ESRI World Imagery Tile URL
    tile_url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{ytile}/{xtile}"
    
    try:
        response = requests.get(tile_url, timeout=10)
        response.raise_for_status()
        contents = response.content
    except Exception as e:
        # Fallback or error
        return {"error": f"Failed to fetch satellite imagery: {str(e)}"}

    input_tensor, original_rgb = preprocess_image(contents)
    
    with torch.no_grad():
        prediction = model(input_tensor)
        mask = prediction.squeeze().cpu().numpy()
    
    # Calculate waterlogged percentage
    water_pixels = np.sum(mask > 0.5)
    total_pixels = mask.size
    water_percent = (water_pixels / total_pixels) * 100
    
    # Post-process mask
    h, w = original_rgb.shape[:2]
    mask_resized = cv2.resize(mask, (w, h))
    
    overlay = original_rgb.copy()
    overlay[mask_resized > 0.5] = [0, 100, 255]
    
    alpha = 0.4
    blended = cv2.addWeighted(overlay, alpha, original_rgb, 1 - alpha, 0)
    
    blended_bgr = cv2.cvtColor(blended, cv2.COLOR_RGB2BGR)
    _, buffer = cv2.imencode('.jpg', blended_bgr)
    result_base64 = base64.b64encode(buffer).decode('utf-8')
    
    severity = "high" if water_percent > 50 else "medium" if water_percent > 15 else "low"
    insurance = "full" if water_percent > 40 else "partial" if water_percent > 10 else "none"
    
    return {
        "water_percent": round(float(water_percent), 2),
        "severity": severity,
        "insurance_claim": insurance,
        "result_image": f"data:image/jpeg;base64,{result_base64}",
        "affected_area": round(float(water_percent * 0.1), 2),
        "lat": lat,
        "lon": lon
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
