import { useLocation, Link, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WaterStatusBadge, ClaimBadge } from "@/components/StatusBadge";
import { Download, ArrowLeft, AlertCircle } from "lucide-react";
import { useEffect } from "react";

const Result = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const data = location.state?.result;
  const originalImage = location.state?.originalImage;

  useEffect(() => {
    if (!data) {
      console.warn("No result data found in location state");
    }
  }, [data]);

  if (!data) {
    return (
      <Layout>
        <div className="container py-20 flex flex-col items-center justify-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h1 className="text-2xl font-bold">No Results Found</h1>
          <p className="text-muted-foreground">Please upload an image for analysis first.</p>
          <Link to="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const { water_percent, severity, insurance_claim, result_image, affected_area } = data;

  return (
    <Layout>
      <div className="container py-10 md:py-16 max-w-4xl mx-auto space-y-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold">Detection Results</h1>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Display */}
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden border bg-black">
              <img 
                src={result_image || originalImage} 
                alt="Analyzed satellite image" 
                className="w-full aspect-square object-contain" 
                loading="lazy" 
              />
              <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur rounded-lg px-3 py-2 text-sm font-medium">
                Analysis Overlay
              </div>
            </div>
            <p className="text-sm text-balance text-muted-foreground italic">
              * Blue areas indicate detected waterlogged or flooded regions identified by the UNet model.
            </p>
          </div>

          {/* Results Summary */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 space-y-5">
              <h2 className="text-lg font-semibold">Analysis Summary</h2>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Waterlogged Area</span>
                  <span className="font-semibold">{water_percent}%</span>
                </div>
                <Progress value={water_percent} className="h-3" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Severity Status</span>
                <WaterStatusBadge level={severity as "low" | "medium" | "high"} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Insurance Claim</span>
                <ClaimBadge status={insurance_claim as "full" | "partial" | "none"} />
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 space-y-3">
              <h2 className="text-lg font-semibold">Detailed Metrics</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-muted-foreground">Estimated Water Area</p>
                  <p className="text-xl font-bold mt-1">{affected_area} ha</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-muted-foreground">Confidence Level</p>
                  <p className="text-xl font-bold mt-1">High</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-muted-foreground">Crop Risk</p>
                  <p className="text-xl font-bold mt-1">{water_percent > 30 ? "Significant" : "Minimal"}</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-muted-foreground">Processing Time</p>
                  <p className="text-xl font-bold mt-1">&lt; 1s</p>
                </div>
              </div>
            </div>

            <Button size="lg" className="w-full h-12 text-base" onClick={() => window.print()}>
              <Download className="h-5 w-5 mr-2" />
              Download Report
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Result;
