import os
import cv2
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

# ==========================================
# 1. UNet Architecture
# ==========================================
class DoubleConv(nn.Module):
    """(convolution => [BN] => ReLU) * 2"""
    def __init__(self, in_channels, out_channels, mid_channels=None):
        super().__init__()
        if not mid_channels:
            mid_channels = out_channels
        self.double_conv = nn.Sequential(
            nn.Conv2d(in_channels, mid_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(mid_channels),
            nn.ReLU(inplace=True),
            nn.Conv2d(mid_channels, out_channels, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True)
        )

    def forward(self, x):
        return self.double_conv(x)

class WaterloggingUNet(nn.Module):
    """
    UNet Architecture designed for Satellite Image Semantic Segmentation.
    Specifically tuned to classify pixels as 'Water' or 'Dry Land'.
    """
    def __init__(self, n_channels=3, n_classes=1):
        super(WaterloggingUNet, self).__init__()
        self.n_channels = n_channels
        self.n_classes = n_classes

        # Encoder (Downsampling)
        self.inc = DoubleConv(n_channels, 64)
        self.down1 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(64, 128))
        self.down2 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(128, 256))
        self.down3 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(256, 512))
        self.down4 = nn.Sequential(nn.MaxPool2d(2), DoubleConv(512, 1024))
        
        # Decoder (Upsampling)
        self.up1 = nn.ConvTranspose2d(1024, 512, kernel_size=2, stride=2)
        self.conv1 = DoubleConv(1024, 512)
        self.up2 = nn.ConvTranspose2d(512, 256, kernel_size=2, stride=2)
        self.conv2 = DoubleConv(512, 256)
        self.up3 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
        self.conv3 = DoubleConv(256, 128)
        self.up4 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
        self.conv4 = DoubleConv(128, 64)
        
        # Output layer
        self.outc = nn.Conv2d(64, n_classes, kernel_size=1)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)
        
        y = self.up1(x5)
        diffY = x4.size()[2] - y.size()[2]
        diffX = x4.size()[3] - y.size()[3]
        y = F.pad(y, [diffX // 2, diffX - diffX // 2, diffY // 2, diffY - diffY // 2])
        y = torch.cat([x4, y], dim=1)
        x = self.conv1(y)
        
        y = self.up2(x)
        diffY = x3.size()[2] - y.size()[2]
        diffX = x3.size()[3] - y.size()[3]
        y = F.pad(y, [diffX // 2, diffX - diffX // 2, diffY // 2, diffY - diffY // 2])
        y = torch.cat([x3, y], dim=1)
        x = self.conv2(y)
        
        y = self.up3(x)
        diffY = x2.size()[2] - y.size()[2]
        diffX = x2.size()[3] - y.size()[3]
        y = F.pad(y, [diffX // 2, diffX - diffX // 2, diffY // 2, diffY - diffY // 2])
        y = torch.cat([x2, y], dim=1)
        x = self.conv3(y)
        
        y = self.up4(x)
        diffY = x1.size()[2] - y.size()[2]
        diffX = x1.size()[3] - y.size()[3]
        y = F.pad(y, [diffX // 2, diffX - diffX // 2, diffY // 2, diffY - diffY // 2])
        y = torch.cat([x1, y], dim=1)
        x = self.conv4(y)
        
        logits = self.outc(x)
        return self.sigmoid(logits)

# ==========================================
# 2. Dataset Loader
# ==========================================
class SatelliteWaterDataset(Dataset):
    """
    Loads Satellite images and corresponding water masks.
    """
    def __init__(self, image_dir, mask_dir, img_size=(256, 256)):
        self.image_dir = image_dir
        self.mask_dir = mask_dir
        self.img_size = img_size
        if os.path.exists(image_dir):
            self.images = [f for f in os.listdir(image_dir) if f.endswith('.jpg') or f.endswith('.png')]
        else:
            self.images = []

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        img_name = self.images[idx]
        img_path = os.path.join(self.image_dir, img_name)
        mask_path = os.path.join(self.mask_dir, img_name)

        image = cv2.imread(img_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        image = cv2.resize(image, self.img_size)
        
        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
        mask = cv2.resize(mask, self.img_size)
        
        image = image.astype(np.float32) / 255.0
        mask = mask.astype(np.float32) / 255.0
        mask = np.where(mask > 0.5, 1.0, 0.0)

        image = np.transpose(image, (2, 0, 1))
        mask = np.expand_dims(mask, axis=0)

        return torch.tensor(image), torch.tensor(mask)

# ==========================================
# 3. Training Loop Setup
# ==========================================
def train_model():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")

    model = WaterloggingUNet(n_channels=3, n_classes=1).to(device)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=1e-4)

    img_dir = "data/images"
    mask_dir = "data/masks"
    
    # Create directories if they don't exist to prevent crashes
    os.makedirs(img_dir, exist_ok=True)
    os.makedirs(mask_dir, exist_ok=True)
    
    dataset = SatelliteWaterDataset(img_dir, mask_dir)
    
    if len(dataset) == 0:
        print(f"No images found in '{img_dir}'. Please add your satellite dataset to start training.")
        return

    dataloader = DataLoader(dataset, batch_size=8, shuffle=True)
    epochs = 20

    print("--- Starting UNet Training ---")
    for epoch in range(epochs):
        model.train()
        epoch_loss = 0

        for batch_images, batch_masks in dataloader:
            batch_images = batch_images.to(device)
            batch_masks = batch_masks.to(device)

            optimizer.zero_grad()
            predictions = model(batch_images)
            loss = criterion(predictions, batch_masks)
            loss.backward()
            optimizer.step()

            epoch_loss += loss.item()

        print(f"Epoch [{epoch+1}/{epochs}] | Loss: {epoch_loss/len(dataloader):.4f}")

    torch.save(model.state_dict(), 'waterlogging_unet.pth')
    print("Training complete. Model saved as 'waterlogging_unet.pth'")

if __name__ == "__main__":
    train_model()
