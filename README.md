# Smart Farm Watch (FarmProtect)

Smart Farm Watch (also known as FarmProtect) is a web application designed to help farmers and agricultural stakeholders detect and monitor flood-affected areas (waterlogging) in their farmlands. It uses satellite imagery and a deep learning model (U-Net) to analyze water accumulation and provides actionable insights, such as severity levels and potential insurance claim eligibility.

## Features

- **Flood Detection:** Upload images or use your current location to fetch satellite imagery for analysis.
- **Machine Learning Integration:** Uses a PyTorch-based U-Net model to accurately detect waterlogged areas.
- **Visual Results:** Overlays a mask on the original image to clearly highlight affected regions.
- **Real-Time Analysis:** Provides severity assessment and insurance claim estimations instantly.
- **Modern UI:** Built with React, Vite, and Tailwind CSS for a seamless user experience.

## Project Structure

- **Frontend:** React application built with Vite, utilizing Tailwind CSS and Shadcn UI components.
- **Backend:** FastAPI server that handles image processing, connects to the PyTorch model, and interacts with the ESRI World Imagery API.
- **Machine Learning:** Contains the U-Net model architecture and weights for waterlogging detection (`ml/` directory).

## Prerequisites

Before running the project, make sure you have the following installed:
- Node.js (v18 or higher recommended)
- Python (v3.8 or higher)
- pip (Python package manager)

## How to Run the Project

### 1. Start the Backend (FastAPI + PyTorch)

The backend handles the machine learning predictions and image processing.

1. Open a terminal and navigate to the root directory of the project.
2. (Optional but recommended) Create a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   python app.py
   ```
   *The backend will start running at `http://localhost:8000` (or `http://0.0.0.0:8000`).*

### 2. Start the Frontend (React + Vite)

The frontend provides the user interface to interact with the system.

1. Open a **new** terminal window and navigate to the root directory of the project.
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will typically be accessible at `http://localhost:5173`.*

## Usage

1. Open your browser and go to the frontend URL (e.g., `http://localhost:5173`).
2. You can either:
   - Upload an aerial/satellite image of a farm manually.
   - Use the geolocation feature to automatically fetch satellite imagery for your current location.
3. The system will process the image through the backend ML model and display the percentage of waterlogged land, the severity of the flood, and an insurance claim recommendation.
