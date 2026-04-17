import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, random_split
import torchvision.transforms.functional as TF
import random
import os
import cv2
import numpy as np

# Import the UNet model we created
from unet_model import WaterloggingUNet

# ==========================================
# 1. Dataset Loader with Augmentation
# ==========================================
class SatelliteWaterDataset(Dataset):
    """
    Loads Satellite images and corresponding water masks.
    Includes robust data augmentation to simulate different satellite viewpoints.
    """
    def __init__(self, image_dir, mask_dir, img_size=(256, 256), augment=True):
        self.image_dir = image_dir
        self.mask_dir = mask_dir
        self.img_size = img_size
        self.augment = augment
        if os.path.exists(image_dir):
            self.images = [f for f in os.listdir(image_dir) if f.endswith('.jpg') or f.endswith('.png')]
        else:
            self.images = []

    def __len__(self):
        return len(self.images)

    def transform(self, image, mask):
        # Resize
        image = TF.resize(image, self.img_size)
        mask = TF.resize(mask, self.img_size)

        if self.augment:
            # Random horizontal flipping
            if random.random() > 0.5:
                image = TF.hflip(image)
                mask = TF.hflip(mask)

            # Random vertical flipping
            if random.random() > 0.5:
                image = TF.vflip(image)
                mask = TF.vflip(mask)

            # Random rotation (90, 180, 270 degrees)
            angles = [0, 90, 180, 270]
            angle = random.choice(angles)
            if angle != 0:
                image = TF.rotate(image, angle)
                mask = TF.rotate(mask, angle)

            # Color Jitter (only on image)
            if random.random() > 0.5:
                image = TF.adjust_brightness(image, brightness_factor=random.uniform(0.8, 1.2))
                image = TF.adjust_contrast(image, contrast_factor=random.uniform(0.8, 1.2))

        # Final Normalization and Conversion
        image = TF.to_tensor(image)
        mask = TF.to_tensor(mask)
        # Binarize mask
        mask = (mask > 0.5).float()

        return image, mask

    def __getitem__(self, idx):
        img_name = self.images[idx]
        img_path = os.path.join(self.image_dir, img_name)
        mask_path = os.path.join(self.mask_dir, img_name)

        # Read Image and Mask using OpenCV
        image_cv = cv2.imread(img_path)
        image_cv = cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB)
        
        mask_cv = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)

        # Convert to PIL Image for Torchvision transforms (cleaner for segmentation)
        from PIL import Image
        image_pil = Image.fromarray(image_cv)
        mask_pil = Image.fromarray(mask_cv)

        return self.transform(image_pil, mask_pil)

# ==========================================
# 2. Training Loop Setup
# ==========================================
def calculate_water_percent(mask_tensor):
    """Calculates the percentage of water pixels in the mask."""
    total_pixels = mask_tensor.numel()
    water_pixels = torch.sum(mask_tensor).item()
    return (water_pixels / total_pixels) * 100

def train_model():
    # Model device selection (GPU if available)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    # Load UNet
    model = WaterloggingUNet(n_channels=3, n_classes=1).to(device)

    # Dice Loss or Binary Cross Entropy
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=1e-4)

    # Directories - making paths relative to this script's location
    base_dir = os.path.dirname(__file__)
    img_dir = os.path.join(base_dir, "data", "images")
    mask_dir = os.path.join(base_dir, "data", "masks")
    
    if not os.path.exists(img_dir) or not os.path.exists(mask_dir):
        print(f"Error: Could not find dataset folders.\nLooking in: {os.path.abspath(img_dir)}")
        print("Please ensure your 'data' folder is inside the 'ml' directory.")
        return

    # Initialize Dataset
    full_dataset = SatelliteWaterDataset(img_dir, mask_dir, augment=True)
    
    if len(full_dataset) < 10:
        print("Error: Dataset too small (less than 10 images). Please add more data.")
        return

    # Validation Split (80/20)
    train_size = int(0.8 * len(full_dataset))
    val_size = len(full_dataset) - train_size
    train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])

    train_loader = DataLoader(train_dataset, batch_size=8, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=8, shuffle=False)

    epochs = 20
    print(f"--- Starting Robust UNet Training ({len(train_dataset)} train, {len(val_dataset)} val) ---")

    for epoch in range(epochs):
        model.train()
        epoch_loss = 0
        total_water_pct = 0
        batch_count = 0

        for batch_images, batch_masks in train_loader:
            batch_images = batch_images.to(device)
            batch_masks = batch_masks.to(device)

            # Forward pass
            predictions = model(batch_images)
            loss = criterion(predictions, batch_masks)

            # Backward pass
            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()
            
            # Batch stats
            batch_water_pct = calculate_water_percent(batch_masks)
            total_water_pct += batch_water_pct
            batch_count += 1

        # Validation Step
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for v_images, v_masks in val_loader:
                v_images = v_images.to(device)
                v_masks = v_masks.to(device)
                v_preds = model(v_images)
                val_loss += criterion(v_preds, v_masks).item()

        avg_loss = epoch_loss / len(train_loader)
        avg_val_loss = val_loss / len(val_loader)
        avg_water_pct = total_water_pct / batch_count

        print(f"Epoch [{epoch+1}/{epochs}] | Loss: {avg_loss:.4f} | Val Loss: {avg_val_loss:.4f} | Avg Water In Batch: {avg_water_pct:.1f}%")

    # Save trained model weights
    save_path = os.path.join(base_dir, 'waterlogging_unet.pth')
    torch.save(model.state_dict(), save_path)
    print(f"Training complete. Robust model saved as '{os.path.abspath(save_path)}'")

if __name__ == "__main__":
    train_model()
