import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { WaterStatusBadge, ClaimBadge } from "@/components/StatusBadge";
import { Download, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-farming.jpg";

const Result = () => {
  const waterPercent = 62;
  const status: "low" | "medium" | "high" = waterPercent > 50 ? "high" : waterPercent > 25 ? "medium" : "low";
  const claim: "full" | "partial" | "none" = waterPercent > 50 ? "full" : waterPercent > 25 ? "partial" : "none";

  return (
    <Layout>
      <div className="container py-10 md:py-16 max-w-4xl mx-auto space-y-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold">Detection Results</h1>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image */}
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden border">
              <img src={heroImage} alt="Analyzed satellite image" className="w-full aspect-video object-cover" loading="lazy" width={1280} height={720} />
              <div className="absolute inset-0 bg-secondary/20 mix-blend-multiply" />
              <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur rounded-lg px-3 py-2 text-sm font-medium">
                Water detected areas highlighted
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 space-y-5">
              <h2 className="text-lg font-semibold">Analysis Summary</h2>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Waterlogged Area</span>
                  <span className="font-semibold">{waterPercent}%</span>
                </div>
                <Progress value={waterPercent} className="h-3" />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Severity Status</span>
                <WaterStatusBadge level={status} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Insurance Claim</span>
                <ClaimBadge status={claim} />
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 space-y-3">
              <h2 className="text-lg font-semibold">Detailed Metrics</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-muted-foreground">Total Area</p>
                  <p className="text-xl font-bold mt-1">5.2 ha</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-muted-foreground">Affected Area</p>
                  <p className="text-xl font-bold mt-1">3.2 ha</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-muted-foreground">Crop Type</p>
                  <p className="text-xl font-bold mt-1">Rice</p>
                </div>
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-muted-foreground">Est. Payout</p>
                  <p className="text-xl font-bold mt-1">₹48,000</p>
                </div>
              </div>
            </div>

            <Button size="lg" className="w-full h-12 text-base">
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
