import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ControlsListSkeleton } from "@/components/loading-skeleton";
import { StatusBadge, ApplicabilityBadge, FrequencyBadge } from "@/components/status-badge";
import { Search, Filter, ArrowRight, AlertTriangle, Shield } from "lucide-react";
import type { ControlCategory, Control, OrganisationControl } from "@shared/schema";

type ControlWithOrgControl = Control & {
  category: ControlCategory;
  organisationControl: OrganisationControl | null;
};

export default function Controls() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: categories } = useQuery<ControlCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: controls, isLoading, error } = useQuery<ControlWithOrgControl[]>({
    queryKey: ["/api/controls"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Controls</h1>
          <p className="text-muted-foreground">
            Manage and test ISO 27001:2022 security controls
          </p>
        </div>
        <ControlsListSkeleton />
      </div>
    );
  }

  if (error || !controls) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <p className="text-lg font-medium text-destructive">Failed to load controls</p>
          <p className="text-muted-foreground">Please try refreshing the page</p>
        </CardContent>
      </Card>
    );
  }

  const filteredControls = controls.filter((control) => {
    const matchesSearch =
      search === "" ||
      control.controlNumber.toLowerCase().includes(search.toLowerCase()) ||
      control.name.toLowerCase().includes(search.toLowerCase()) ||
      control.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === "all" || control.categoryId.toString() === categoryFilter;

    const orgControl = control.organisationControl;
    const currentStatus = getControlStatus(orgControl);

    const matchesStatus = statusFilter === "all" || currentStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const groupedControls = filteredControls.reduce((acc, control) => {
    const categoryName = control.category.name;
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(control);
    return acc;
  }, {} as Record<string, ControlWithOrgControl[]>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security Controls</h1>
        <p className="text-muted-foreground">
          Manage and test ISO 27001:2022 security controls
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search controls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-controls"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-category-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name.replace(/\s*\(.*\)/, "")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="passed">Passed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="not_tested">Not Tested</SelectItem>
            <SelectItem value="not_applicable">Not Applicable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredControls.length} of {controls.length} controls
      </div>

      {Object.keys(groupedControls).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No controls found</p>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedControls)
            .sort(([a], [b]) => {
              const catA = categories?.find((c) => c.name === a);
              const catB = categories?.find((c) => c.name === b);
              return (catA?.sortOrder || 0) - (catB?.sortOrder || 0);
            })
            .map(([categoryName, categoryControls]) => (
              <div key={categoryName} className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground/90 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">
                  {categoryName}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({categoryControls.length})
                  </span>
                </h2>
                <div className="space-y-2">
                  {categoryControls.map((control) => (
                    <ControlCard key={control.id} control={control} />
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function getControlStatus(orgControl: OrganisationControl | null): string {
  if (!orgControl) return "not_tested";
  if (!orgControl.isApplicable) return "not_applicable";
  
  return "not_tested";
}

function ControlCard({ control }: { control: ControlWithOrgControl }) {
  const orgControl = control.organisationControl;
  const isApplicable = orgControl?.isApplicable ?? true;

  return (
    <Link href={`/controls/${control.controlNumber}`}>
      <Card 
        className="hover-elevate cursor-pointer transition-colors"
        data-testid={`card-control-${control.controlNumber}`}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-12 w-16 items-center justify-center rounded-md bg-primary/10 text-primary font-mono font-semibold text-sm shrink-0">
            {control.controlNumber}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm line-clamp-1">{control.name}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {control.description}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ApplicabilityBadge isApplicable={isApplicable} size="sm" />
            <FrequencyBadge 
              frequency={orgControl?.frequency || control.defaultFrequency} 
              size="sm" 
            />
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
