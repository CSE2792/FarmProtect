import torch
import torch.nn as nn
import torch.nn.functional as F

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
        # Using Sigmoid because it's a binary semantic segmentation task (Water vs Non-water)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        # Encoder passes
        x1 = self.inc(x)
        x2 = self.down1(x1)
        x3 = self.down2(x2)
        x4 = self.down3(x3)
        x5 = self.down4(x4)
        
        # Decoder passes with skip connections
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
        
        # Produce logits and apply sigmoid
        logits = self.outc(x)
        return self.sigmoid(logits)

# If run directly, run a quick sanity check
if __name__ == "__main__":
    print("Testing UNet initialization...")
    model = WaterloggingUNet(n_channels=3, n_classes=1)
    dummy_input = torch.randn(1, 3, 256, 256)
    output = model(dummy_input)
    print(f"Input shape: {dummy_input.shape}")
    print(f"Output shape: {output.shape}") 
    print("UNet is ready to be trained on satellite images.")
