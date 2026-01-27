import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ControlDetailSkeleton } from "@/components/loading-skeleton";
import { StatusBadge, ApplicabilityBadge, FrequencyBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  RefreshCw, 
  Brain, 
  ClipboardCheck, 
  History,
  AlertTriangle,
  Loader2,
  Sparkles,
  FileText
} from "lucide-react";
import type { Control, ControlCategory, OrganisationControl, TestRun } from "@shared/schema";
import { format } from "date-fns";

type ControlWithDetails = Control & {
  category: ControlCategory;
  organisationControl: OrganisationControl | null;
  recentTestRuns: TestRun[];
};

export default function ControlDetail() {
  const { controlNumber } = useParams<{ controlNumber: string }>();
  const { toast } = useToast();
  const [testDialogOpen, setTestDialogOpen] = useState(false);

  const { data: control, isLoading, error } = useQuery<ControlWithDetails>({
    queryKey: ["/api/controls", controlNumber],
  });

  const generateQuestionnaireMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/controls/${controlNumber}/generate-questionnaire`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls", controlNumber] });
      toast({
        title: "Questionnaire Generated",
        description: "AI has generated assessment questions for this control.",
      });
    },
    onError: (error: any) => {
      const isConfigError = error?.message?.includes("502") || error?.message?.includes("configuration");
      toast({
        title: "Generation Failed",
        description: isConfigError 
          ? "AI service is not configured. Please contact your administrator."
          : "Failed to generate questionnaire. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/controls" data-testid="button-back-controls">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Controls
          </Link>
        </Button>
        <ControlDetailSkeleton />
      </div>
    );
  }

  if (error || !control) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/controls">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Controls
          </Link>
        </Button>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Control not found</p>
            <p className="text-muted-foreground">
              The control "{controlNumber}" could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const orgControl = control.organisationControl;
  const hasQuestionnaire = (control.aiQuestionnaire?.questions?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/controls" data-testid="button-back-controls">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Controls
        </Link>
      </Button>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-bold text-primary">
              {control.controlNumber}
            </span>
            <h1 className="text-2xl font-bold">{control.name}</h1>
          </div>
          <p className="text-muted-foreground">{control.category.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <TestDialog 
            control={control} 
            open={testDialogOpen} 
            onOpenChange={setTestDialogOpen} 
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Control Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {control.description}
              </p>
              {control.annexAReference && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm">
                    <span className="font-medium">Annex A Reference:</span>{" "}
                    <span className="text-muted-foreground">{control.annexAReference}</span>
                  </p>
                </div>
              )}
              {(control.cps234Reference || control.cps230Reference) && (
                <div className="mt-2 flex gap-4 text-sm">
                  {control.cps234Reference && (
                    <p>
                      <span className="font-medium">CPS 234:</span>{" "}
                      <span className="text-muted-foreground">{control.cps234Reference}</span>
                    </p>
                  )}
                  {control.cps230Reference && (
                    <p>
                      <span className="font-medium">CPS 230:</span>{" "}
                      <span className="text-muted-foreground">{control.cps230Reference}</span>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="questionnaire" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="questionnaire" className="gap-2" data-testid="tab-questionnaire">
                <Brain className="h-4 w-4" />
                AI Questionnaire
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2" data-testid="tab-history">
                <History className="h-4 w-4" />
                Test History
              </TabsTrigger>
              <TabsTrigger value="implementation" className="gap-2" data-testid="tab-implementation">
                <FileText className="h-4 w-4" />
                Implementation
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questionnaire" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle>Assessment Questionnaire</CardTitle>
                    <CardDescription>
                      {hasQuestionnaire
                        ? `Generated ${control.questionnaireGeneratedAt ? format(new Date(control.questionnaireGeneratedAt), "MMM d, yyyy") : "previously"}`
                        : "AI-generated questions to assess this control"}
                    </CardDescription>
                  </div>
                  <Button
                    variant={hasQuestionnaire ? "outline" : "default"}
                    onClick={() => generateQuestionnaireMutation.mutate()}
                    disabled={generateQuestionnaireMutation.isPending}
                    data-testid="button-generate-questionnaire"
                  >
                    {generateQuestionnaireMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {hasQuestionnaire ? "Regenerate" : "Generate"}
                  </Button>
                </CardHeader>
                <CardContent>
                  {hasQuestionnaire ? (
                    <div className="space-y-4">
                      {control.aiQuestionnaire?.questions.map((q, index) => (
                        <div
                          key={q.id}
                          className="p-4 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-sm">{q.question}</p>
                              {q.guidance && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {q.guidance}
                                </p>
                              )}
                              <div className="mt-2">
                                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                                  {q.type === "boolean" ? "Yes/No" : q.type === "scale" ? "Rating Scale" : "Text Response"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-lg font-medium mb-2">No questionnaire yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Generate AI-powered assessment questions for this control
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Test History</CardTitle>
                  <CardDescription>Previous assessment results for this control</CardDescription>
                </CardHeader>
                <CardContent>
                  {control.recentTestRuns && control.recentTestRuns.length > 0 ? (
                    <div className="space-y-3">
                      {[...control.recentTestRuns]
                        .sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())
                        .map((run) => (
                        <div
                          key={run.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {format(new Date(run.testDate), "MMM d, yyyy")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(run.testDate), "h:mm a")}
                              </span>
                            </div>
                            {run.comments && (
                              <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                                {run.comments}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {run.aiConfidence && (
                              <span className="text-xs text-muted-foreground">
                                AI: {(run.aiConfidence * 100).toFixed(0)}%
                              </span>
                            )}
                            <StatusBadge status={run.status} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <History className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-lg font-medium mb-2">No test history</p>
                      <p className="text-sm text-muted-foreground">
                        This control has not been tested yet
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="implementation" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Implementation Responses</CardTitle>
                  <CardDescription>
                    Saved responses to the assessment questionnaire
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {orgControl?.implementationResponses && Object.keys(orgControl.implementationResponses).length > 0 ? (
                    <div className="space-y-4">
                      {control.aiQuestionnaire?.questions?.map((q, index) => {
                        const response = orgControl.implementationResponses?.[q.id];
                        return (
                          <div
                            key={q.id}
                            className="p-4 rounded-lg border bg-muted/30"
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                                {index + 1}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium text-sm">{q.question}</p>
                                <div className="mt-2 p-3 bg-background rounded border">
                                  <p className="text-sm text-muted-foreground">
                                    {response !== undefined 
                                      ? (typeof response === 'boolean' 
                                        ? (response ? 'Yes' : 'No') 
                                        : String(response))
                                      : <span className="italic">No response recorded</span>
                                    }
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {orgControl.implementationUpdatedAt && (
                        <p className="text-xs text-muted-foreground">
                          Last updated: {format(new Date(orgControl.implementationUpdatedAt), "MMM d, yyyy h:mm a")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-lg font-medium mb-2">No implementation responses</p>
                      <p className="text-sm text-muted-foreground">
                        Responses will be saved when you complete a test assessment
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Control Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Applicability</span>
                <ApplicabilityBadge isApplicable={orgControl?.isApplicable ?? true} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Test Frequency</span>
                <FrequencyBadge 
                  frequency={orgControl?.frequency || control.defaultFrequency} 
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Owner Role</span>
                <span className="text-sm text-muted-foreground">
                  {control.ownerRole || "Not assigned"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Start Quarter</span>
                <span className="text-sm text-muted-foreground">
                  {orgControl?.startQuarter || control.startQuarter || "Q1"}
                </span>
              </div>
              {orgControl?.nextDueDate && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Next Due</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(orgControl.nextDueDate), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <ControlSettingsCard control={control} orgControl={orgControl} />
        </div>
      </div>
    </div>
  );
}

function TestDialog({ 
  control, 
  open, 
  onOpenChange 
}: { 
  control: ControlWithDetails; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [status, setStatus] = useState<string>("Pass");
  const [comments, setComments] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    suggestedStatus: string;
    confidence: number;
    reasoning: string;
  } | null>(null);

  const submitTestMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/test-runs", {
        organisationControlId: control.organisationControl?.id,
        status,
        comments,
        aiAnalysis: aiAnalysis?.reasoning,
        aiSuggestedStatus: aiAnalysis?.suggestedStatus,
        aiConfidence: aiAnalysis?.confidence,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls", control.controlNumber] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-runs"] });
      toast({
        title: "Test Recorded",
        description: "Your test result has been saved to the audit trail.",
      });
      onOpenChange(false);
      setStatus("Pass");
      setComments("");
      setAiAnalysis(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save test result. Please try again.",
        variant: "destructive",
      });
    },
  });

  const analyzeResponseMutation = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);
      const res = await apiRequest("POST", `/api/controls/${control.controlNumber}/analyze`, {
        comments,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setAiAnalysis(data);
      if (data.suggestedStatus) {
        setStatus(data.suggestedStatus);
      }
      setIsAnalyzing(false);
    },
    onError: (error: any) => {
      const isConfigError = error?.message?.includes("502") || error?.message?.includes("configuration");
      toast({
        title: "Analysis Failed",
        description: isConfigError 
          ? "AI service is not configured. Please contact your administrator."
          : "AI analysis could not be completed.",
        variant: "destructive",
      });
      setIsAnalyzing(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button data-testid="button-record-test">
          <ClipboardCheck className="mr-2 h-4 w-4" />
          Record Test
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Test Result</DialogTitle>
          <DialogDescription>
            {control.controlNumber} - {control.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="comments">Test Comments & Evidence</Label>
            <Textarea
              id="comments"
              placeholder="Describe your testing methodology, evidence reviewed, and findings..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={6}
              data-testid="textarea-test-comments"
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => analyzeResponseMutation.mutate()}
              disabled={isAnalyzing || !comments.trim()}
              data-testid="button-analyze-ai"
            >
              {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Brain className="mr-2 h-4 w-4" />
              )}
              Analyze with AI
            </Button>
          </div>

          {aiAnalysis && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <Brain className="h-5 w-5 text-primary mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">AI Recommendation</span>
                      <span className="text-xs text-muted-foreground">
                        {(aiAnalysis.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{aiAnalysis.reasoning}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">Suggested:</span>
                      <StatusBadge status={aiAnalysis.suggestedStatus as any} size="sm" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <Label htmlFor="status">Final Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger data-testid="select-test-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pass">Pass</SelectItem>
                <SelectItem value="PassPrevious">Pass (Previous Testing)</SelectItem>
                <SelectItem value="Fail">Fail</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
                <SelectItem value="NotAttempted">Not Attempted</SelectItem>
                <SelectItem value="ContinualImprovement">Continual Improvement</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => submitTestMutation.mutate()}
            disabled={submitTestMutation.isPending}
            data-testid="button-submit-test"
          >
            {submitTestMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Test Result
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ControlSettingsCard({ 
  control, 
  orgControl 
}: { 
  control: Control; 
  orgControl: OrganisationControl | null;
}) {
  const { toast } = useToast();
  const [isApplicable, setIsApplicable] = useState(orgControl?.isApplicable ?? true);
  const [frequency, setFrequency] = useState<string>(orgControl?.frequency || control.defaultFrequency || "Annual");
  const [startQuarter, setStartQuarter] = useState<string>(orgControl?.startQuarter || control.startQuarter || "Q1");
  const [justification, setJustification] = useState(orgControl?.exclusionJustification || "");

  const updateSettingsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/organisation-controls/${control.id}`, {
        isApplicable,
        frequency,
        startQuarter,
        exclusionJustification: !isApplicable ? justification : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls", control.controlNumber] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      toast({
        title: "Settings Updated",
        description: "Control settings have been saved. Due date has been calculated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="applicable" className="text-sm">Applicable</Label>
          <Switch
            id="applicable"
            checked={isApplicable}
            onCheckedChange={setIsApplicable}
            data-testid="switch-applicable"
          />
        </div>

        {!isApplicable && (
          <div className="space-y-2">
            <Label htmlFor="justification" className="text-sm">Exclusion Justification</Label>
            <Textarea
              id="justification"
              placeholder="Explain why this control is not applicable..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              data-testid="textarea-justification"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="frequency" className="text-sm">Test Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger data-testid="select-frequency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Annual">Annual</SelectItem>
              <SelectItem value="Quarterly">Quarterly</SelectItem>
              <SelectItem value="Monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="start-quarter" className="text-sm">Start Quarter</Label>
          <Select value={startQuarter} onValueChange={setStartQuarter}>
            <SelectTrigger data-testid="select-start-quarter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Q1">Q1 (January)</SelectItem>
              <SelectItem value="Q2">Q2 (April)</SelectItem>
              <SelectItem value="Q3">Q3 (July)</SelectItem>
              <SelectItem value="Q4">Q4 (October)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={() => updateSettingsMutation.mutate()}
          disabled={updateSettingsMutation.isPending || (!isApplicable && !justification.trim())}
          className="w-full"
          data-testid="button-save-settings"
        >
          {updateSettingsMutation.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Changes
        </Button>

        {!isApplicable && !justification.trim() && (
          <p className="text-xs text-destructive">
            Exclusion justification is required for inapplicable controls
          </p>
        )}
      </CardContent>
    </Card>
  );
}
