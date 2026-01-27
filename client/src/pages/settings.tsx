import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  CheckCircle, 
  XCircle, 
  Download, 
  RefreshCw,
  Database,
  Key,
  Calendar,
  BarChart3,
  Building2,
  Shield,
  Save,
  Loader2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { OrganisationProfile, ControlApplicability, ControlCategory } from "@shared/schema";

interface SettingsData {
  ai: {
    configured: boolean;
    message: string;
    model: string;
  };
  defaults: {
    frequency: string;
    startQuarter: string;
  };
  statistics: {
    totalControls: number;
    totalCategories: number;
    testedControls: number;
    passedControls: number;
    failedControls: number;
  };
}

interface TestApiResponse {
  success: boolean;
  message: string;
  model?: string;
}

const INDUSTRIES = [
  "Financial Services",
  "Healthcare",
  "Technology / SaaS",
  "Retail / E-commerce",
  "Manufacturing",
  "Government",
  "Education",
  "Other"
];

const COMPANY_SIZES = [
  "1-50 employees",
  "51-200 employees",
  "201-1000 employees",
  "1000+ employees"
];

const DEPLOYMENT_MODELS = [
  "Cloud-native SaaS",
  "Cloud-hosted (IaaS)",
  "Hybrid (Cloud + On-premise)",
  "On-premise only"
];

const REGULATORY_REQUIREMENTS = [
  "ISO 27001",
  "SOC 2",
  "CPS 234 (APRA)",
  "CPS 230 (APRA)",
  "GDPR",
  "HIPAA",
  "PCI-DSS",
  "SOX",
  "NIST CSF",
  "Essential Eight",
  "FedRAMP",
  "Other"
];

const DATA_CLASSIFICATION_LEVELS = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted / Secret"
];

export default function Settings() {
  const { toast } = useToast();

  const { data: settings, isLoading, error } = useQuery<SettingsData>({
    queryKey: ["/api/settings"],
  });

  const { data: profile, isLoading: profileLoading } = useQuery<OrganisationProfile | null>({
    queryKey: ["/api/settings/profile"],
  });

  const { data: applicability, isLoading: applicabilityLoading } = useQuery<ControlApplicability[]>({
    queryKey: ["/api/controls/applicability"],
  });

  const { data: categories } = useQuery<ControlCategory[]>({
    queryKey: ["/api/categories"],
  });

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    companyName: "",
    industry: "",
    companySize: "",
    techStack: "",
    deploymentModel: "",
    regulatoryRequirements: [] as string[],
    dataClassificationLevels: [] as string[],
    riskAppetite: "Moderate" as "Conservative" | "Moderate" | "Aggressive",
    additionalContext: "",
    hideNonApplicableControls: false,
  });
  const [profileDirty, setProfileDirty] = useState(false);

  // Applicability state
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [applicabilityChanges, setApplicabilityChanges] = useState<Map<number, boolean>>(new Map());
  const [selectedControls, setSelectedControls] = useState<Set<number>>(new Set());

  // Initialize profile form when data loads
  useEffect(() => {
    if (profile) {
      setProfileForm({
        companyName: profile.companyName || "",
        industry: profile.industry || "",
        companySize: profile.companySize || "",
        techStack: profile.techStack || "",
        deploymentModel: profile.deploymentModel || "",
        regulatoryRequirements: profile.regulatoryRequirements || [],
        dataClassificationLevels: profile.dataClassificationLevels || [],
        riskAppetite: profile.riskAppetite || "Moderate",
        additionalContext: profile.additionalContext || "",
        hideNonApplicableControls: profile.hideNonApplicableControls || false,
      });
    }
  }, [profile]);

  const testApiMutation = useMutation<TestApiResponse>({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/settings/test-api");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      if (data.success) {
        toast({
          title: "Connection Successful",
          description: `Connected to ${data.model}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Connection Error",
        description: error.message || "Failed to test API connection",
        variant: "destructive",
      });
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: typeof profileForm) => {
      const res = await apiRequest("PUT", "/api/settings/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/profile"] });
      setProfileDirty(false);
      toast({
        title: "Profile Saved",
        description: "Organization profile updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save profile",
        variant: "destructive",
      });
    },
  });

  const saveApplicabilityMutation = useMutation({
    mutationFn: async (updates: { controlId: number; isApplicable: boolean }[]) => {
      const res = await apiRequest("PATCH", "/api/controls/applicability", { updates });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls/applicability"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setApplicabilityChanges(new Map());
      toast({
        title: "Changes Saved",
        description: "Control applicability updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    },
  });

  const handleExportTestHistory = () => {
    window.open("/api/export/test-history", "_blank");
    toast({
      title: "Export Started",
      description: "Test history CSV is being downloaded",
    });
  };

  const updateProfileField = (field: keyof typeof profileForm, value: any) => {
    setProfileForm(prev => ({ ...prev, [field]: value }));
    setProfileDirty(true);
  };

  const toggleRegulatoryRequirement = (req: string) => {
    const current = profileForm.regulatoryRequirements;
    if (current.includes(req)) {
      updateProfileField("regulatoryRequirements", current.filter(r => r !== req));
    } else {
      updateProfileField("regulatoryRequirements", [...current, req]);
    }
  };

  const toggleDataClassification = (level: string) => {
    const current = profileForm.dataClassificationLevels;
    if (current.includes(level)) {
      updateProfileField("dataClassificationLevels", current.filter(l => l !== level));
    } else {
      updateProfileField("dataClassificationLevels", [...current, level]);
    }
  };

  // Filtered applicability list
  const filteredApplicability = useMemo(() => {
    if (!applicability) return [];
    if (categoryFilter === "all") return applicability;
    return applicability.filter(c => c.category === categoryFilter);
  }, [applicability, categoryFilter]);

  const getApplicableStatus = (controlId: number, originalStatus: boolean) => {
    return applicabilityChanges.has(controlId) 
      ? applicabilityChanges.get(controlId)! 
      : originalStatus;
  };

  const toggleApplicability = (controlId: number, currentStatus: boolean) => {
    const original = applicability?.find(c => c.controlId === controlId)?.isApplicable ?? true;
    const newValue = !currentStatus;
    
    if (newValue === original) {
      const updated = new Map(applicabilityChanges);
      updated.delete(controlId);
      setApplicabilityChanges(updated);
    } else {
      setApplicabilityChanges(new Map(applicabilityChanges).set(controlId, newValue));
    }
  };

  const selectAllVisible = () => {
    const visibleIds = new Set(filteredApplicability.map(c => c.controlId));
    setSelectedControls(visibleIds);
  };

  const deselectAllVisible = () => {
    setSelectedControls(new Set());
  };

  const setSelectedApplicability = (isApplicable: boolean) => {
    const updates = new Map(applicabilityChanges);
    selectedControls.forEach(controlId => {
      const original = applicability?.find(c => c.controlId === controlId)?.isApplicable ?? true;
      if (isApplicable === original) {
        updates.delete(controlId);
      } else {
        updates.set(controlId, isApplicable);
      }
    });
    setApplicabilityChanges(updates);
    setSelectedControls(new Set());
  };

  const saveApplicabilityChanges = async () => {
    const updates = Array.from(applicabilityChanges.entries()).map(([controlId, isApplicable]) => ({
      controlId,
      isApplicable,
    }));
    
    // Save both applicability changes and the hide setting together
    if (updates.length > 0) {
      saveApplicabilityMutation.mutate(updates);
    }
    
    // Always save the hide setting to profile
    try {
      await apiRequest("PUT", "/api/settings/profile", {
        ...profileForm,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/profile"] });
      
      // Show single toast if no applicability changes
      if (updates.length === 0) {
        toast({
          title: "Changes Saved",
          description: "Settings updated",
        });
      }
    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  const applicableCount = useMemo(() => {
    if (!applicability) return 0;
    return applicability.filter(c => getApplicableStatus(c.controlId, c.isApplicable)).length;
  }, [applicability, applicabilityChanges]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-destructive">
                <XCircle className="h-5 w-5" />
                <p>Failed to load settings. Please try refreshing the page.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-2xl font-semibold" data-testid="heading-settings">Settings</h1>
          <span className="text-muted-foreground">|</span>
          <span className="text-sm text-muted-foreground">Application configuration and data management</span>
        </div>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Configuration
            </CardTitle>
            <CardDescription>
              Manage your Anthropic AI integration for questionnaire generation and analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-md border">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-md ${settings.ai.configured ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
                  {settings.ai.configured ? (
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium" data-testid="text-api-status">
                    {settings.ai.configured ? "API Key Configured" : "API Key Not Configured"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {settings.ai.configured ? `Model: ${settings.ai.model}` : settings.ai.message}
                  </p>
                </div>
              </div>
              <Badge variant={settings.ai.configured ? "default" : "destructive"}>
                {settings.ai.configured ? "Active" : "Inactive"}
              </Badge>
            </div>

            {!settings.ai.configured && (
              <div className="p-4 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> Set <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-xs">ANTHROPIC_API_KEY</code> in Replit Secrets to enable AI features.
                </p>
              </div>
            )}

            <Button 
              onClick={() => testApiMutation.mutate()}
              disabled={testApiMutation.isPending || !settings.ai.configured}
              data-testid="button-test-api"
            >
              {testApiMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Control Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Control Defaults
            </CardTitle>
            <CardDescription>
              Default settings applied to new controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-md border">
                <p className="text-sm text-muted-foreground">Default Frequency</p>
                <p className="text-lg font-medium" data-testid="text-default-frequency">{settings.defaults.frequency}</p>
              </div>
              <div className="p-4 rounded-md border">
                <p className="text-sm text-muted-foreground">Default Start Quarter</p>
                <p className="text-lg font-medium" data-testid="text-default-quarter">{settings.defaults.startQuarter}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Profile
            </CardTitle>
            <CardDescription>
              This information helps the AI provide more relevant compliance guidance tailored to your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {profileLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Acme Corporation"
                      value={profileForm.companyName}
                      onChange={(e) => updateProfileField("companyName", e.target.value)}
                      data-testid="input-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={profileForm.industry} onValueChange={(v) => updateProfileField("industry", v)}>
                      <SelectTrigger data-testid="select-industry">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size</Label>
                    <Select value={profileForm.companySize} onValueChange={(v) => updateProfileField("companySize", v)}>
                      <SelectTrigger data-testid="select-company-size">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPANY_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deploymentModel">Deployment Model</Label>
                    <Select value={profileForm.deploymentModel} onValueChange={(v) => updateProfileField("deploymentModel", v)}>
                      <SelectTrigger data-testid="select-deployment-model">
                        <SelectValue placeholder="Select deployment" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPLOYMENT_MODELS.map((model) => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="techStack">Technology Stack</Label>
                  <Textarea
                    id="techStack"
                    placeholder="AWS, React, Node.js, PostgreSQL, Kubernetes..."
                    value={profileForm.techStack}
                    onChange={(e) => updateProfileField("techStack", e.target.value)}
                    data-testid="textarea-tech-stack"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Regulatory Requirements</Label>
                  <div className="flex flex-wrap gap-2">
                    {REGULATORY_REQUIREMENTS.map((req) => (
                      <Badge
                        key={req}
                        variant={profileForm.regulatoryRequirements.includes(req) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleRegulatoryRequirement(req)}
                        data-testid={`badge-reg-${req.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
                      >
                        {req}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Data Classification Levels</Label>
                  <div className="flex flex-wrap gap-2">
                    {DATA_CLASSIFICATION_LEVELS.map((level) => (
                      <Badge
                        key={level}
                        variant={profileForm.dataClassificationLevels.includes(level) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleDataClassification(level)}
                        data-testid={`badge-data-${level.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`}
                      >
                        {level}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Risk Appetite</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {[
                      { value: "Conservative", label: "Conservative", desc: "Minimize all risks" },
                      { value: "Moderate", label: "Moderate", desc: "Balance risk with business" },
                      { value: "Aggressive", label: "Aggressive", desc: "Accept risk for agility" },
                    ].map((option) => (
                      <div
                        key={option.value}
                        className={`p-3 rounded-md border cursor-pointer transition-colors ${
                          profileForm.riskAppetite === option.value
                            ? "border-primary bg-primary/5"
                            : "hover-elevate"
                        }`}
                        onClick={() => updateProfileField("riskAppetite", option.value)}
                        data-testid={`option-risk-${option.value.toLowerCase()}`}
                      >
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalContext">Additional Context for AI</Label>
                  <Textarea
                    id="additionalContext"
                    rows={4}
                    placeholder="Any other context that would help the AI understand your organization..."
                    value={profileForm.additionalContext}
                    onChange={(e) => updateProfileField("additionalContext", e.target.value)}
                    data-testid="textarea-additional-context"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    onClick={() => saveProfileMutation.mutate(profileForm)}
                    disabled={saveProfileMutation.isPending || !profileDirty}
                    data-testid="button-save-profile"
                  >
                    {saveProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Profile
                      </>
                    )}
                  </Button>
                  {profileDirty && (
                    <span className="text-sm text-muted-foreground">Unsaved changes</span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Control Applicability */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Control Applicability
            </CardTitle>
            <CardDescription>
              Select which controls are applicable to your organization. Non-applicable controls are excluded from compliance calculations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {applicabilityLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-md bg-muted/50">
                  <span className="font-medium" data-testid="text-applicable-count">
                    {applicableCount} of {applicability?.length || 0} controls applicable
                  </span>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={profileForm.hideNonApplicableControls}
                      onCheckedChange={(checked) => {
                        updateProfileField("hideNonApplicableControls", checked);
                      }}
                      data-testid="switch-hide-non-applicable"
                    />
                    <Label className="text-sm">Hide non-applicable in Controls list</Label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]" data-testid="select-applicability-category">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={selectAllVisible} data-testid="button-select-all">
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAllVisible} data-testid="button-deselect-all">
                    Deselect All
                  </Button>
                  {selectedControls.size > 0 && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setSelectedApplicability(true)}>
                        Set Selected Applicable
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedApplicability(false)}>
                        Set Selected Not Applicable
                      </Button>
                    </>
                  )}
                </div>

                <div className="overflow-x-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={selectedControls.size === filteredApplicability.length && filteredApplicability.length > 0}
                            onCheckedChange={(checked) => {
                              if (checked) selectAllVisible();
                              else deselectAllVisible();
                            }}
                            data-testid="checkbox-select-all-header"
                          />
                        </TableHead>
                        <TableHead className="w-[100px]">Control #</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-[180px]">Category</TableHead>
                        <TableHead className="w-[100px]">Applicable</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApplicability.map((control) => {
                        const isApplicable = getApplicableStatus(control.controlId, control.isApplicable);
                        const isSelected = selectedControls.has(control.controlId);
                        const hasChange = applicabilityChanges.has(control.controlId);
                        
                        return (
                          <TableRow 
                            key={control.controlId}
                            className={hasChange ? "bg-amber-50 dark:bg-amber-900/10" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  const updated = new Set(selectedControls);
                                  if (checked) updated.add(control.controlId);
                                  else updated.delete(control.controlId);
                                  setSelectedControls(updated);
                                }}
                                data-testid={`checkbox-control-${control.controlNumber}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{control.controlNumber}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{control.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{control.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={isApplicable}
                                onCheckedChange={() => toggleApplicability(control.controlId, isApplicable)}
                                data-testid={`switch-applicable-${control.controlNumber}`}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    onClick={saveApplicabilityChanges}
                    disabled={(applicabilityChanges.size === 0 && profileForm.hideNonApplicableControls === (profile?.hideNonApplicableControls ?? false)) || saveApplicabilityMutation.isPending}
                    data-testid="button-save-applicability"
                  >
                    {saveApplicabilityMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  {applicabilityChanges.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {applicabilityChanges.size} unsaved change{applicabilityChanges.size !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Export and manage your compliance data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-md border">
              <div>
                <p className="font-medium">Export Test History</p>
                <p className="text-sm text-muted-foreground">Download all test results as a CSV file</p>
              </div>
              <Button onClick={handleExportTestHistory} variant="outline" data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Statistics Summary
            </CardTitle>
            <CardDescription>
              Overview of your compliance tracking data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 rounded-md border text-center">
                <p className="text-2xl font-bold" data-testid="text-stat-total-controls">{settings.statistics.totalControls}</p>
                <p className="text-sm text-muted-foreground">Total Controls</p>
              </div>
              <div className="p-4 rounded-md border text-center">
                <p className="text-2xl font-bold" data-testid="text-stat-categories">{settings.statistics.totalCategories}</p>
                <p className="text-sm text-muted-foreground">Categories</p>
              </div>
              <div className="p-4 rounded-md border text-center">
                <p className="text-2xl font-bold" data-testid="text-stat-tested">{settings.statistics.testedControls}</p>
                <p className="text-sm text-muted-foreground">Tested</p>
              </div>
              <div className="p-4 rounded-md border text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-stat-passed">{settings.statistics.passedControls}</p>
                <p className="text-sm text-muted-foreground">Passed</p>
              </div>
              <div className="p-4 rounded-md border text-center">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-stat-failed">{settings.statistics.failedControls}</p>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
