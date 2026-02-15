import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, ChevronUp, ChevronDown, CheckCircle, XCircle, AlertCircle, Clock, User, Minus } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import type { ControlWithLatestTest, ControlsStats, ControlCategory } from "@shared/schema";

type SortField = "controlNumber" | "name" | "category" | "status" | "responses" | "frequency" | "owner" | "lastTested";
type SortDirection = "asc" | "desc";

function getStatusInfo(status: string | null | undefined) {
  switch (status) {
    case "Pass":
    case "PassPrevious":
    case "ContinualImprovement":
      return { label: "Passed", variant: "default" as const, icon: CheckCircle, className: "bg-green-600 dark:bg-green-700" };
    case "Fail":
      return { label: "Failed", variant: "destructive" as const, icon: XCircle, className: "" };
    case "Blocked":
      return { label: "Blocked", variant: "secondary" as const, icon: AlertCircle, className: "bg-amber-500 dark:bg-amber-600 text-white" };
    case "NotAttempted":
    default:
      return { label: "Not Tested", variant: "outline" as const, icon: Clock, className: "" };
  }
}

function StatusBadge({ status }: { status: string | null | undefined }) {
  const info = getStatusInfo(status);
  const Icon = info.icon;
  return (
    <Badge variant={info.variant} className={`gap-1 ${info.className}`} data-testid={`badge-status-${status || 'none'}`}>
      <Icon className="h-3 w-3" />
      {info.label}
    </Badge>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: typeof CheckCircle; color: string }) {
  return (
    <Card className="flex-1 min-w-[140px]">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-md ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold" data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
            <p className="text-xs text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortIcon({ field, sortField, sortDirection }: { field: SortField; sortField: SortField; sortDirection: SortDirection }) {
  if (field !== sortField) return null;
  return sortDirection === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
}

interface OrganisationProfile {
  hideNonApplicableControls?: boolean;
}

export default function Controls() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>(
    () => localStorage.getItem("controls-category-filter") ?? "all"
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    () => localStorage.getItem("controls-status-filter") ?? "all"
  );
  const [sortField, setSortField] = useState<SortField>("controlNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleCategoryFilter = (value: string) => {
    setCategoryFilter(value);
    localStorage.setItem("controls-category-filter", value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    localStorage.setItem("controls-status-filter", value);
  };

  const { data: controls, isLoading: controlsLoading } = useQuery<ControlWithLatestTest[]>({
    queryKey: ["/api/controls"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ControlsStats>({
    queryKey: ["/api/controls/stats"],
  });

  const { data: categories } = useQuery<ControlCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: profile } = useQuery<OrganisationProfile | null>({
    queryKey: ["/api/settings/profile"],
  });

  const hideNonApplicable = profile?.hideNonApplicableControls ?? false;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedControls = useMemo(() => {
    if (!controls) return [];

    let result = [...controls];

    // Filter out non-applicable controls if preference is set
    if (hideNonApplicable) {
      result = result.filter((c) => c.organisationControl?.isApplicable !== false);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.controlNumber.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.category.name.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((c) => c.category.id.toString() === categoryFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => {
        const status = c.latestTestRun?.status;
        switch (statusFilter) {
          case "passed":
            return status === "Pass" || status === "PassPrevious" || status === "ContinualImprovement";
          case "failed":
            return status === "Fail";
          case "blocked":
            return status === "Blocked";
          case "not_tested":
            return !status || status === "NotAttempted";
          default:
            return true;
        }
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "controlNumber":
          comparison = a.controlNumber.localeCompare(b.controlNumber, undefined, { numeric: true });
          break;
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "category":
          comparison = a.category.name.localeCompare(b.category.name);
          break;
        case "status":
          const statusA = a.latestTestRun?.status || "zzz";
          const statusB = b.latestTestRun?.status || "zzz";
          comparison = statusA.localeCompare(statusB);
          break;
        case "responses":
          const progA = a.questionnaireProgress?.percentage ?? -1;
          const progB = b.questionnaireProgress?.percentage ?? -1;
          comparison = progA - progB;
          break;
        case "frequency":
          const freqA = a.defaultFrequency || "Annual";
          const freqB = b.defaultFrequency || "Annual";
          comparison = freqA.localeCompare(freqB);
          break;
        case "owner":
          const ownerA = a.ownerRole || "zzz";
          const ownerB = b.ownerRole || "zzz";
          comparison = ownerA.localeCompare(ownerB);
          break;
        case "lastTested":
          const dateA = a.latestTestRun?.testDate ? new Date(a.latestTestRun.testDate).getTime() : 0;
          const dateB = b.latestTestRun?.testDate ? new Date(b.latestTestRun.testDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [controls, searchQuery, categoryFilter, statusFilter, sortField, sortDirection]);

  const isLoading = controlsLoading || statsLoading;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold" data-testid="heading-controls">Controls</h1>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-muted-foreground">Manage and track ISO 27001:2022 security controls</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="flex flex-wrap gap-3">
          {isLoading ? (
            <>
              <Skeleton className="h-20 flex-1 min-w-[140px]" />
              <Skeleton className="h-20 flex-1 min-w-[140px]" />
              <Skeleton className="h-20 flex-1 min-w-[140px]" />
              <Skeleton className="h-20 flex-1 min-w-[140px]" />
            </>
          ) : (
            <>
              <StatCard title="Total Controls" value={stats?.total || 0} icon={AlertCircle} color="bg-blue-600" />
              <StatCard title="Passed" value={stats?.passed || 0} icon={CheckCircle} color="bg-green-600" />
              <StatCard title="Failed" value={stats?.failed || 0} icon={XCircle} color="bg-red-600" />
              <StatCard title="Not Tested" value={stats?.notAttempted || 0} icon={Clock} color="bg-zinc-500" />
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search controls..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-controls"
            />
          </div>
          <Select value={categoryFilter} onValueChange={handleCategoryFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={handleStatusFilter}>
            <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="not_tested">Not Tested</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer select-none w-[100px]" 
                  onClick={() => handleSort("controlNumber")}
                  data-testid="th-control-number"
                >
                  <div className="flex items-center gap-1">
                    Control #
                    <SortIcon field="controlNumber" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none" 
                  onClick={() => handleSort("name")}
                  data-testid="th-name"
                >
                  <div className="flex items-center gap-1">
                    Name
                    <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none w-[180px]" 
                  onClick={() => handleSort("category")}
                  data-testid="th-category"
                >
                  <div className="flex items-center gap-1">
                    Category
                    <SortIcon field="category" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none w-[120px]" 
                  onClick={() => handleSort("status")}
                  data-testid="th-status"
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon field="status" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none w-[130px]"
                  onClick={() => handleSort("responses")}
                  data-testid="th-responses"
                >
                  <div className="flex items-center gap-1">
                    Responses
                    <SortIcon field="responses" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none w-[100px]"
                  onClick={() => handleSort("frequency")}
                  data-testid="th-frequency"
                >
                  <div className="flex items-center gap-1">
                    Frequency
                    <SortIcon field="frequency" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none w-[120px]" 
                  onClick={() => handleSort("owner")}
                  data-testid="th-owner"
                >
                  <div className="flex items-center gap-1">
                    Owner
                    <SortIcon field="owner" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none w-[110px]" 
                  onClick={() => handleSort("lastTested")}
                  data-testid="th-last-tested"
                >
                  <div className="flex items-center gap-1">
                    Last Tested
                    <SortIcon field="lastTested" sortField={sortField} sortDirection={sortDirection} />
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAndSortedControls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {controls?.length === 0 ? "No controls found" : "No controls match your filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedControls.map((control) => (
                  <TableRow 
                    key={control.id} 
                    className="hover-elevate cursor-pointer"
                    onClick={() => navigate(`/controls/${control.controlNumber}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(`/controls/${control.controlNumber}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    data-testid={`row-control-${control.controlNumber}`}
                  >
                    <TableCell>
                      <span className="font-medium text-primary" data-testid={`text-control-number-${control.id}`}>
                        {control.controlNumber}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span data-testid={`text-control-name-${control.id}`}>{control.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground" data-testid={`text-control-category-${control.id}`}>
                        {control.category.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={control.latestTestRun?.status} />
                    </TableCell>
                    <TableCell>
                      {control.questionnaireProgress ? (
                        <div className="flex items-center gap-2">
                          <Progress
                            value={control.questionnaireProgress.percentage}
                            className={`w-16 h-2 ${
                              control.questionnaireProgress.percentage === 100
                                ? "[&>div]:bg-green-600"
                                : control.questionnaireProgress.percentage > 0
                                ? "[&>div]:bg-amber-500"
                                : ""
                            }`}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {control.questionnaireProgress.answered}/{control.questionnaireProgress.total}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground"><Minus className="h-3 w-3" /></span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`text-control-frequency-${control.id}`}>
                        {control.defaultFrequency || "Annual"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground" data-testid={`text-control-owner-${control.id}`}>
                        {control.ownerRole || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground" data-testid={`text-control-last-tested-${control.id}`}>
                        {control.latestTestRun?.testDate 
                          ? format(new Date(control.latestTestRun.testDate), "MMM d, yyyy")
                          : "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </Card>

        {!isLoading && filteredAndSortedControls.length > 0 && (
          <p className="text-sm text-muted-foreground" data-testid="text-controls-count">
            Showing {filteredAndSortedControls.length} of {controls?.length || 0} controls
          </p>
        )}
      </div>
    </div>
  );
}
