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

def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return lat_deg, lon_deg

def vegetation_score(image_bytes):
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return -float('inf')
    # OpenCV loads in BGR
    b, g, r = img[:, :, 0].astype(float), img[:, :, 1].astype(float), img[:, :, 2].astype(float)
    score = np.mean(g - 0.5 * r - 0.5 * b)
    return score

def generate_flood_mask(image, coverage=0.3):
    np.random.seed(42)
    h, w = image.shape[:2]
    
    # 1. Base random noise
    noise = np.random.rand(max(1, h//4), max(1, w//4)).astype(np.float32)
    noise = cv2.resize(noise, (w, h))
    noise = cv2.GaussianBlur(noise, (101, 101), 0)
    noise = (noise - noise.min()) / (noise.max() - noise.min() + 1e-5)
    
    # 2. Radial bias (center of image)
    Y, X = np.ogrid[:h, :w]
    dist_from_center = np.sqrt((X - w/2)**2 + (Y - h/2)**2)
    max_dist = np.sqrt((w/2)**2 + (h/2)**2)
    radial_bias = 1.0 - (dist_from_center / (max_dist * 0.7))
    radial_bias = np.clip(radial_bias, 0, 1)
    
    # 3. Vegetation bias (crop field areas)
    b, g, r = image[:, :, 0].astype(float), image[:, :, 1].astype(float), image[:, :, 2].astype(float)
    veg_score = g - 0.5 * r - 0.5 * b
    veg_bias = np.clip(veg_score / 50.0, 0, 1)
    
    # Combine them (weight them)
    combined = noise * 0.2 + radial_bias * 0.4 + veg_bias * 0.4
    
    # Threshold for coverage
    threshold = np.percentile(combined, 100 * (1 - coverage))
    mask = (combined > threshold).astype(np.uint8)
    
    return mask

def apply_water_effect(image, mask):
    overlay = image.copy().astype(np.float32)
    # Light blue water color (BGR format)
    water_color = np.array([230, 170, 100])  
    for c in range(3):
        overlay[:,:,c] = np.where(
            mask == 1,
            0.5 * overlay[:,:,c] + 0.5 * water_color[c], # Light blue blend
            overlay[:,:,c]
        )
    return overlay.astype(np.uint8)

def water_percentage(mask):
    return (np.sum(mask) / mask.size) * 100

def get_best_field_tile(lat, lon, zoom=17):
    center_x, center_y = deg2num(lat, lon, zoom)
    
    best_score = -float('inf')
    best_tile_bytes = None
    best_coords = None
    
    # 3x3 grid
    offsets = [-1, 0, 1]
    
    for dx in offsets:
        for dy in offsets:
            x = center_x + dx
            y = center_y + dy
            tile_url = f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{zoom}/{y}/{x}"
            
            try:
                response = requests.get(tile_url, timeout=5)
                if response.status_code == 200:
                    score = vegetation_score(response.content)
                    if score > best_score:
                        best_score = score
                        best_tile_bytes = response.content
                        best_coords = (x, y)
            except Exception:
                continue
                
    if best_tile_bytes is None:
        raise Exception("Failed to fetch any tiles in the grid.")
        
    return best_tile_bytes, best_coords

def preprocess_image(image_bytes, simulate_flood=False):
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if simulate_flood:
        mask = generate_flood_mask(img, coverage=0.3)
        img = apply_water_effect(img, mask)

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
async def analyze_location(lat: float, lon: float, zoom: int = 17, simulate: bool = False):
    try:
        contents, (best_x, best_y) = get_best_field_tile(lat, lon, zoom)
    except Exception as e:
        return {"error": f"Failed to fetch satellite imagery: {str(e)}"}

    input_tensor, original_rgb = preprocess_image(contents, simulate_flood=simulate)
    
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

@app.get("/fetch-tile")
async def fetch_tile(lat: float, lon: float, zoom: int = 17, simulate: bool = False):
    try:
        contents, (best_x, best_y) = get_best_field_tile(lat, lon, zoom)
        
        if simulate:
            _, img_rgb = preprocess_image(contents, simulate_flood=True)
            img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
            _, buffer = cv2.imencode('.jpg', img_bgr)
            base64_img = base64.b64encode(buffer).decode('utf-8')
        else:
            base64_img = base64.b64encode(contents).decode('utf-8')
            
        return {"image": f"data:image/jpeg;base64,{base64_img}"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
