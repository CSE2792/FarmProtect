import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClaimBadge, WaterStatusBadge } from "@/components/StatusBadge";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Claim = {
  id: number;
  farmer: string;
  location: string;
  waterPercent: number;
  severity: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected";
};

const initialClaims: Claim[] = [
  { id: 1, farmer: "Ramesh Kumar", location: "Bihar, Patna", waterPercent: 72, severity: "high", status: "pending" },
  { id: 2, farmer: "Sita Devi", location: "UP, Varanasi", waterPercent: 35, severity: "medium", status: "pending" },
  { id: 3, farmer: "Arjun Singh", location: "MP, Bhopal", waterPercent: 15, severity: "low", status: "approved" },
  { id: 4, farmer: "Lakshmi Bai", location: "Bihar, Gaya", waterPercent: 58, severity: "high", status: "pending" },
  { id: 5, farmer: "Mohan Lal", location: "Rajasthan, Kota", waterPercent: 42, severity: "medium", status: "rejected" },
];

const Admin = () => {
  const [claims, setClaims] = useState(initialClaims);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const filtered = claims.filter((c) => {
    const matchFilter = filter === "all" || c.status === filter;
    const matchSearch = c.farmer.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const updateStatus = (id: number, status: "approved" | "rejected") => {
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    toast({ title: `Claim ${status}`, description: `Claim #${id} has been ${status}.` });
  };

  return (
    <Layout>
      <div className="container py-10 md:py-16 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Insurance Admin Panel</h1>
          <p className="text-muted-foreground mt-1">Review and manage farmer insurance claims.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search farmer or location..." className="pl-10 h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((f) => (
              <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">
                {f}
              </Button>
            ))}
          </div>
        </div>

        {/* Claims Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium text-muted-foreground">Farmer</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Location</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Water %</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Severity</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium">{c.farmer}</td>
                    <td className="p-4 text-muted-foreground">{c.location}</td>
                    <td className="p-4 font-semibold">{c.waterPercent}%</td>
                    <td className="p-4"><WaterStatusBadge level={c.severity} /></td>
                    <td className="p-4"><ClaimBadge status={c.status} /></td>
                    <td className="p-4 text-right">
                      {c.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => updateStatus(c.id, "approved")} className="gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, "rejected")} className="gap-1 text-destructive hover:text-destructive">
                            <XCircle className="h-4 w-4" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No claims found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Admin;
