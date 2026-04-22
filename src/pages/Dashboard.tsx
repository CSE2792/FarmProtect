import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLon, setManualLon] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Backend analysis failed. Make sure app.py is running.");
      }

      const data = await response.json();
      
      // Navigate to results and pass the real data
      navigate("/result", { state: { result: data, originalImage: imagePreview } });
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analysis Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to connect to backend");
    } finally {
      setAnalyzing(false);
    }
  };

  const analyzeCoordinates = async (latitude: number, longitude: number) => {
    setAnalyzing(true);
    try {
      const response = await fetch(`http://localhost:8000/analyze-location?lat=${latitude}&lon=${longitude}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch and analyze satellite imagery");
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      navigate("/result", { 
        state: { 
          result: data, 
          originalImage: data.result_image 
        } 
      });
      toast.success("Location-based analysis complete!");
    } catch (error) {
      console.error("Analysis Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze location");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setAnalyzing(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        analyzeCoordinates(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setAnalyzing(false);
        toast.error("Failed to get location. Please allow location access.");
        console.error("Geolocation Error:", error);
      }
    );
  };

  const handleManualDetect = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (isNaN(lat) || isNaN(lon)) {
      toast.error("Please enter valid numerical coordinates");
      return;
    }
    analyzeCoordinates(lat, lon);
  };

  return (
    <Layout>
      <div className="container py-10 md:py-16 max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Smart Farm Watch 👋</h1>
          <p className="text-muted-foreground mt-1">Upload a satellite image to detect waterlogging and flood areas.</p>
        </div>

        {/* Upload Card */}
        <div className="rounded-xl border bg-card p-8 space-y-6">
          <h2 className="text-xl font-semibold">Upload Satellite Image</h2>
          <label className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border p-10 cursor-pointer hover:border-primary/50 transition-colors">
            {imagePreview ? (
              <div className="relative w-full text-center">
                <img src={imagePreview} alt="Preview" className="rounded-lg max-h-64 mx-auto object-cover" />
                <p className="mt-2 text-xs text-muted-foreground">Click to change image</p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Click to upload or drag & drop</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>

          <div className="flex flex-col gap-4">
            <Button
              size="lg"
              className="w-full h-12 text-base"
              disabled={!selectedFile || analyzing}
              onClick={handleAnalyze}
            >
              {analyzing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Analyze Image"}
            </Button>
          </div>
        </div>

        {/* Location Card */}
        <div className="rounded-xl border bg-card p-8 space-y-6">
          <h2 className="text-xl font-semibold">Location-Based Analysis</h2>
          <p className="text-muted-foreground text-sm">Use your current location or enter coordinates to fetch and analyze satellite imagery.</p>
          
          <Button
            size="lg"
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleAutoDetect}
            disabled={analyzing}
          >
            <MapPin className="h-5 w-5 mr-2" />
            Auto-Detect Using Location
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or enter manually</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude</Label>
              <Input 
                id="lat" 
                type="number" 
                placeholder="e.g. 28.4506" 
                value={manualLat} 
                onChange={(e) => setManualLat(e.target.value)} 
                disabled={analyzing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lon">Longitude</Label>
              <Input 
                id="lon" 
                type="number" 
                placeholder="e.g. 77.5861" 
                value={manualLon} 
                onChange={(e) => setManualLon(e.target.value)}
                disabled={analyzing}
              />
            </div>
          </div>
          <Button
            size="lg"
            className="w-full h-12 text-base"
            disabled={!manualLat || !manualLon || analyzing}
            onClick={handleManualDetect}
          >
            {analyzing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Analyze Coordinates"}
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
