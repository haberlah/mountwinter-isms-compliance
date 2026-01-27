import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, ChevronUp, ChevronDown, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
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
import type { ControlWithLatestTest, ControlsStats, ControlCategory } from "@shared/schema";

type SortField = "controlNumber" | "name" | "category" | "status" | "frequency";
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

export default function Controls() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("controlNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { data: controls, isLoading: controlsLoading } = useQuery<ControlWithLatestTest[]>({
    queryKey: ["/api/controls"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ControlsStats>({
    queryKey: ["/api/controls/stats"],
  });

  const { data: categories } = useQuery<ControlCategory[]>({
    queryKey: ["/api/categories"],
  });

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
        case "frequency":
          const freqA = a.defaultFrequency || "Annual";
          const freqB = b.defaultFrequency || "Annual";
          comparison = freqA.localeCompare(freqB);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [controls, searchQuery, categoryFilter, statusFilter, sortField, sortDirection]);

  const isLoading = controlsLoading || statsLoading;

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border p-6">
        <h1 className="text-2xl font-semibold" data-testid="heading-controls">Controls</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage and track ISO 27001:2022 security controls
        </p>
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
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
          <Select value={statusFilter} onValueChange={setStatusFilter}>
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

        <Card>
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
                  className="cursor-pointer select-none w-[100px]" 
                  onClick={() => handleSort("frequency")}
                  data-testid="th-frequency"
                >
                  <div className="flex items-center gap-1">
                    Frequency
                    <SortIcon field="frequency" sortField={sortField} sortDirection={sortDirection} />
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
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredAndSortedControls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {controls?.length === 0 ? "No controls found" : "No controls match your filters"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedControls.map((control) => (
                  <TableRow 
                    key={control.id} 
                    className="hover-elevate cursor-pointer"
                    data-testid={`row-control-${control.controlNumber}`}
                  >
                    <TableCell>
                      <Link href={`/controls/${control.controlNumber}`}>
                        <span className="font-medium text-primary" data-testid={`text-control-number-${control.id}`}>
                          {control.controlNumber}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/controls/${control.controlNumber}`}>
                        <span data-testid={`text-control-name-${control.id}`}>{control.name}</span>
                      </Link>
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
                      <span className="text-sm" data-testid={`text-control-frequency-${control.id}`}>
                        {control.defaultFrequency || "Annual"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
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
