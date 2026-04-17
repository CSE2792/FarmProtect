import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Upload, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email || "Farmer";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      navigate("/result");
    }, 2000);
  };

  const handleAutoDetect = () => {
    setAnalyzing(true);
    setTimeout(() => {
      navigate("/result");
    }, 2500);
  };

  return (
    <Layout>
      <div className="container py-10 md:py-16 max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Hello, {displayName} 👋</h1>
          <p className="text-muted-foreground mt-1">Upload a satellite image or use your location to detect waterlogging.</p>
        </div>

        {/* Upload Card */}
        <div className="rounded-xl border bg-card p-8 space-y-6">
          <h2 className="text-xl font-semibold">Upload Satellite Image</h2>
          <label className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-border p-10 cursor-pointer hover:border-primary/50 transition-colors">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="rounded-lg max-h-48 object-cover" />
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-muted-foreground text-sm">Click to upload or drag & drop</span>
              </>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </label>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="flex-1 h-12 text-base"
              disabled={!imagePreview || analyzing}
              onClick={handleAnalyze}
            >
              {analyzing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Analyze Image
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 h-12 text-base"
              onClick={handleAutoDetect}
              disabled={analyzing}
            >
              <MapPin className="h-5 w-5 mr-2" />
              Detect Using Location
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
