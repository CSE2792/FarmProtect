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
  const [locationPreview, setLocationPreview] = useState<string | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [simulateFlood, setSimulateFlood] = useState(false);

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
      const response = await fetch(`http://localhost:8000/analyze-location?lat=${latitude}&lon=${longitude}&simulate=${simulateFlood}`);

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
        const { latitude, longitude } = position.coords;
        setManualLat(latitude.toString());
        setManualLon(longitude.toString());
        setAnalyzing(false);
        fetchPreview(latitude, longitude, simulateFlood);
        toast.success("Location detected!");
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

  const fetchPreview = async (latitude: number, longitude: number, isSimulate: boolean = false) => {
    setIsFetchingPreview(true);
    try {
      const response = await fetch(`http://localhost:8000/fetch-tile?lat=${latitude}&lon=${longitude}&simulate=${isSimulate}`);
      const data = await response.json();
      if (data.image) {
        setLocationPreview(data.image);
      } else {
        throw new Error(data.error || "Failed to fetch preview");
      }
    } catch (error) {
      console.error("Preview Error:", error);
      toast.error("Could not fetch satellite preview");
    } finally {
      setIsFetchingPreview(false);
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    try {
      // Try Mapbox first if token exists
      const token = import.meta.env.VITE_MAPBOX_TOKEN;
      if (token) {
        const response = await fetch(`https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(query)}&access_token=${token}&limit=5`);
        const data = await response.json();

        // Need to retrieve full coordinates from the suggestion
        if (data.suggestions) {
          const detailedSuggestions = await Promise.all(data.suggestions.map(async (s: any) => {
            const retrieveRes = await fetch(`https://api.mapbox.com/search/searchbox/v1/retrieve/${s.mapbox_id}?access_token=${token}`);
            const retrieveData = await retrieveRes.json();
            const feature = retrieveData.features[0];
            return {
              name: feature.properties.full_address || feature.properties.name,
              lat: feature.geometry.coordinates[1],
              lon: feature.geometry.coordinates[0],
            };
          }));
          setSuggestions(detailedSuggestions);
        }
      } else {
        // Fallback to Nominatim for testing without Mapbox key
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
        const data = await response.json();
        setSuggestions(data.map((item: any) => ({
          name: item.display_name,
          lat: item.lat,
          lon: item.lon,
        })));
      }
    } catch (error) {
      console.error("Geocoding Error:", error);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setShowSuggestions(true);

    // Debounce geocoding
    clearTimeout((window as any).searchTimeout);
    (window as any).searchTimeout = setTimeout(() => {
      fetchSuggestions(val);
    }, 500);
  };

  const handleSelectSuggestion = (suggestion: any) => {
    if (!suggestion) return;
    setSearchQuery(suggestion.name);
    setManualLat(suggestion.lat.toString());
    setManualLon(suggestion.lon.toString());
    setShowSuggestions(false);

    toast.success(`Selected: ${suggestion.name}`);
    fetchPreview(parseFloat(suggestion.lat), parseFloat(suggestion.lon), simulateFlood);
  };

  return (
    <Layout>
      <div className="container py-10 md:py-16 max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Farm Protect 👋</h1>
          <p className="text-muted-foreground mt-1">Using Artificial Intelligence, Detect waterlogging and flood areas from satellite images</p>
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

          <div className="space-y-2 relative">
            <Label htmlFor="search">Search Field Location</Label>
            <div className="flex gap-2 relative">
              <Input
                id="search"
                placeholder="e.g. Punjab, India or specific village name"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                autoComplete="off"
              />
              <Button onClick={() => handleSelectSuggestion(suggestions[0])} disabled={isSearching || !searchQuery}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-popover text-popover-foreground border rounded-md shadow-md mt-1 max-h-60 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <div
                    key={i}
                    className="px-4 py-2 hover:bg-muted cursor-pointer text-sm border-b last:border-b-0"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectSuggestion(s);
                    }}
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>



          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="simulate"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={simulateFlood}
              onChange={(e) => {
                setSimulateFlood(e.target.checked);
                if (manualLat && manualLon) {
                  fetchPreview(parseFloat(manualLat), parseFloat(manualLon), e.target.checked);
                }
              }}
              disabled={analyzing || isFetchingPreview}
            />
            <Label htmlFor="simulate" className="cursor-pointer">Simulate Flood (For testing detection)</Label>
          </div>

          {locationPreview && (
            <div className="mt-4 space-y-2">
              <Label>Satellite Preview</Label>
              <div className="relative aspect-square w-full max-w-[300px] mx-auto overflow-hidden rounded-lg border-2 border-primary/20">
                <img src={locationPreview} alt="Satellite Preview" className="h-full w-full object-cover" />
                {isFetchingPreview && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <Button
              variant="secondary"
              className="flex-1 h-12"
              disabled={!manualLat || !manualLon || isFetchingPreview || analyzing}
              onClick={() => fetchPreview(parseFloat(manualLat), parseFloat(manualLon), simulateFlood)}
            >
              Fetch Preview
            </Button>
            <Button
              className="flex-[2] h-12 text-base"
              disabled={!manualLat || !manualLon || analyzing}
              onClick={handleManualDetect}
            >
              {analyzing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Analyze Field"}
            </Button>
          </div>
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
      </div>
    </Layout>
  );
};

export default Dashboard;
