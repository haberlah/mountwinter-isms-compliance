import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, FileText, Loader2, AlertCircle, Sparkles, CheckCircle, XCircle, TrendingUp, AlertTriangle, BarChart3, Lightbulb, Target, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAIAnalysis, type AnalysisResult } from "@/hooks/useAIAnalysis";
import type { Persona, ImplementationResponses } from "@shared/schema";

function renderTextValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object' && value !== null) {
    if ('description' in value && typeof (value as Record<string, unknown>).description === 'string') {
      return (value as Record<string, unknown>).description as string;
    }
    if ('text' in value && typeof (value as Record<string, unknown>).text === 'string') {
      return (value as Record<string, unknown>).text as string;
    }
    if ('level' in value && typeof (value as Record<string, unknown>).level === 'string') {
      return (value as Record<string, unknown>).level as string;
    }
    if ('area' in value && typeof (value as Record<string, unknown>).area === 'string') {
      return `${(value as Record<string, unknown>).area}: ${(value as Record<string, unknown>).description || ''}`.trim();
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function renderArrayItems(arr: unknown[]): string[] {
  return arr.map(item => renderTextValue(item));
}

interface ControlWithDetails {
  id: number;
  controlNumber: string;
  name: string;
  description: string | null;
  categoryId: number;
  ownerRole: string | null;
  defaultFrequency: string | null;
  startQuarter: string | null;
  cps234Reference: string | null;
  cps230Reference: string | null;
  annexAReference: string | null;
  aiQuestionnaire: { questions: Array<{ question_id: number; question: string; guidance?: string; primary_persona?: Persona }> } | null;
  questionnaireGeneratedAt: string | null;
  category: { id: number; name: string; sortOrder: number };
  organisationControl: {
    id: number;
    controlId: number;
    assignedUserId: number | null;
    frequency: string | null;
    startQuarter: string | null;
    isApplicable: boolean;
    exclusionJustification: string | null;
    nextDueDate: string | null;
    selectedPersona: Persona | null;
    implementationResponses: ImplementationResponses | null;
    implementationUpdatedAt: string | null;
  } | null;
  recentTestRuns: Array<{
    id: number;
    organisationControlId: number;
    testDate: string;
    testerUserId: number;
    status: string;
    comments: string | null;
    aiAnalysis: string | null;
    aiSuggestedStatus: string | null;
    aiConfidence: number | null;
    aiContextScope: string | null;
    createdAt: string;
  }>;
}

const testStatusOptions = [
  { value: "Pass", label: "Pass", description: "Control is effectively implemented and operating" },
  { value: "PassPrevious", label: "Pass (Previous)", description: "Relying on previous test results" },
  { value: "Fail", label: "Fail", description: "Control is not effectively implemented or operating" },
  { value: "Blocked", label: "Blocked", description: "Testing could not be completed due to obstacles" },
  { value: "NotAttempted", label: "Not Attempted", description: "Control has not been tested yet" },
  { value: "ContinualImprovement", label: "Continual Improvement", description: "Control works but has improvement opportunities" },
];

const formSchema = z.object({
  status: z.enum(["Pass", "PassPrevious", "Fail", "Blocked", "NotAttempted", "ContinualImprovement"], {
    required_error: "Please select a test status",
  }),
  comments: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function getStatusVariant(status: string): "default" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "Pass":
    case "PassPrevious":
      return "default";
    case "Fail":
      return "destructive";
    case "ContinualImprovement":
      return "secondary";
    default:
      return "outline";
  }
}

function getPersonaIcon(persona: Persona) {
  switch (persona) {
    case "Auditor":
      return ClipboardCheck;
    case "Advisor":
      return Lightbulb;
    case "Analyst":
      return BarChart3;
    default:
      return Target;
  }
}

function PersonaBadge({ persona }: { persona: Persona }) {
  const Icon = getPersonaIcon(persona);
  return (
    <Badge variant="outline" className="gap-1" data-testid={`badge-persona-${persona.toLowerCase()}`}>
      <Icon className="h-3 w-3" />
      {persona}
    </Badge>
  );
}

function ConfidenceMeter({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2" data-testid="meter-confidence">
      <Progress value={percentage} className="w-24 h-2" />
      <span className="text-sm text-muted-foreground">{percentage}%</span>
    </div>
  );
}

export default function RecordTest() {
  const { controlNumber } = useParams<{ controlNumber: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: control, isLoading, error } = useQuery<ControlWithDetails>({
    queryKey: ["/api/controls", controlNumber],
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: undefined,
      comments: "",
    },
  });

  const { analyze, isAnalyzing, streamedText, result: analysisResult, error: analysisError, reset: resetAnalysis } = useAIAnalysis(controlNumber || "");

  const selectedPersona: Persona = control?.organisationControl?.selectedPersona || "Auditor";
  const implementationResponses = control?.organisationControl?.implementationResponses;
  const hasResponses = implementationResponses?.responses?.some((r) => r.response_text?.trim()) || false;

  const handleAnalyze = () => {
    const comments = form.getValues("comments") || "";
    analyze(selectedPersona, comments);
  };

  const handleApplySuggestedStatus = () => {
    if (analysisResult?.suggested_status) {
      form.setValue("status", analysisResult.suggested_status);
    }
  };

  const createTestRunMutation = useMutation({
    mutationFn: async (data: { 
      organisationControlId: number; 
      status: string; 
      comments: string | null;
      aiAnalysis?: string | null;
      aiSuggestedStatus?: string | null;
      aiConfidence?: number | null;
      aiContextScope?: string | null;
    }) => {
      const response = await apiRequest("POST", "/api/test-runs", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Test Recorded",
        description: "The test run has been successfully recorded.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls", controlNumber] });
      queryClient.invalidateQueries({ queryKey: ["/api/test-runs"] });
      navigate(`/controls/${controlNumber}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record test run",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    if (!control?.organisationControl?.id) {
      toast({
        title: "Error",
        description: "Organisation control not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    createTestRunMutation.mutate({
      organisationControlId: control.organisationControl.id,
      status: values.status,
      comments: values.comments || null,
      aiAnalysis: analysisResult ? JSON.stringify(analysisResult) : null,
      aiSuggestedStatus: analysisResult?.suggested_status || null,
      aiConfidence: analysisResult?.confidence || null,
      aiContextScope: "last_3",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-record-test">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !control) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-muted-foreground">Control not found</p>
        <Button variant="outline" onClick={() => navigate("/controls")} data-testid="button-back-controls-error">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Controls
        </Button>
      </div>
    );
  }

  const lastTest = control.recentTestRuns && control.recentTestRuns.length > 0
    ? [...control.recentTestRuns].sort((a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime())[0]
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/controls/${controlNumber}`)}
          data-testid="button-back-control"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Control
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-heading">
          Record Test for {control.controlNumber}: {control.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Record a new compliance test result for this control
        </p>
      </div>

      <Card data-testid="card-control-reference">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Control Reference
          </CardTitle>
          <CardDescription>Review the control details before recording your test</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Description</p>
            <p className="text-sm text-muted-foreground" data-testid="text-control-description">
              {control.description || "No description available"}
            </p>
          </div>
          
          {(control.cps234Reference || control.cps230Reference) && (
            <div className="flex flex-wrap gap-2">
              {control.cps234Reference && (
                <Badge variant="outline" data-testid="badge-cps234">
                  CPS234: {control.cps234Reference}
                </Badge>
              )}
              {control.cps230Reference && (
                <Badge variant="outline" data-testid="badge-cps230">
                  CPS230: {control.cps230Reference}
                </Badge>
              )}
            </div>
          )}

          {lastTest && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">Last Test Result</p>
              <div className="flex items-center gap-3">
                <Badge variant={getStatusVariant(lastTest.status)} data-testid="badge-last-status">
                  {lastTest.status}
                </Badge>
                <span className="text-sm text-muted-foreground" data-testid="text-last-test-date">
                  {new Date(lastTest.testDate).toLocaleDateString()}
                </span>
                {lastTest.comments && (
                  <span className="text-sm text-muted-foreground truncate max-w-xs" data-testid="text-last-comments">
                    {lastTest.comments}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-test-form">
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>
            Record your test observations. Once submitted, this record cannot be edited or deleted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue placeholder="Select test status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {testStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value} data-testid={`option-status-${option.value}`}>
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">{option.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the outcome of your compliance test
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments / Observations</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter your test observations, findings, and any recommendations..."
                        className="min-h-32 resize-y"
                        data-testid="textarea-comments"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Document your testing methodology, evidence reviewed, and any issues found
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* AI Analysis Section */}
              <div className="border-t pt-6 space-y-4" data-testid="section-ai-analysis">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Analyzing as:</span>
                    <PersonaBadge persona={selectedPersona} />
                    <Link 
                      href={`/controls/${controlNumber}`}
                      className="text-sm text-muted-foreground hover:text-foreground"
                      data-testid="link-change-persona"
                    >
                      Change persona
                    </Link>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || (!hasResponses && !form.getValues("comments")?.trim())}
                    data-testid="button-analyze"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Analyze with AI
                      </>
                    )}
                  </Button>
                </div>

                {!hasResponses && !form.watch("comments")?.trim() && (
                  <p className="text-sm text-muted-foreground">
                    Add questionnaire responses or comments to enable AI analysis
                  </p>
                )}

                {/* Error Display */}
                {analysisError && (
                  <Alert variant="destructive" data-testid="alert-analysis-error">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Analysis Failed</AlertTitle>
                    <AlertDescription>
                      {analysisError.includes("API") || analysisError.includes("key") ? (
                        <>AI analysis requires an API key. Please configure it in Settings.</>
                      ) : analysisError.includes("rate") ? (
                        <>Rate limit reached. Please wait a moment and try again.</>
                      ) : (
                        <>{analysisError}</>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Streaming Text Display */}
                {isAnalyzing && streamedText && (
                  <div className="p-4 bg-muted/50 rounded-lg" data-testid="panel-streaming">
                    <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
                      {streamedText}
                    </pre>
                  </div>
                )}

                {/* Analysis Results Panel */}
                {analysisResult && !isAnalyzing && (
                  <Card className="bg-muted/30" data-testid="panel-analysis-results">
                    <CardContent className="pt-6 space-y-4">
                      {/* Status Suggestion */}
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">Suggested Status:</span>
                          <Badge 
                            variant={getStatusVariant(analysisResult.suggested_status)} 
                            data-testid="badge-suggested-status"
                          >
                            {analysisResult.suggested_status === "ContinualImprovement" 
                              ? "Continual Improvement" 
                              : analysisResult.suggested_status}
                          </Badge>
                          <ConfidenceMeter value={analysisResult.confidence} />
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleApplySuggestedStatus}
                          data-testid="button-apply-status"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Apply
                        </Button>
                      </div>

                      {/* Assessment */}
                      <div>
                        <h4 className="text-sm font-medium mb-2">Assessment</h4>
                        <p className="text-sm text-muted-foreground" data-testid="text-assessment">
                          {analysisResult.assessment}
                        </p>
                      </div>

                      {/* Observations */}
                      {analysisResult.observations?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Observations</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {renderArrayItems(analysisResult.observations).map((obs, i) => (
                              <li key={i} className="text-sm text-muted-foreground" data-testid={`text-observation-${i}`}>
                                {obs}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Persona-Specific: Auditor */}
                      {selectedPersona === "Auditor" && analysisResult.persona_specific?.red_flags_triggered && 
                        Array.isArray(analysisResult.persona_specific.red_flags_triggered) &&
                        analysisResult.persona_specific.red_flags_triggered.length > 0 && (
                        <Alert variant="destructive" data-testid="alert-red-flags">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Red Flags Identified</AlertTitle>
                          <AlertDescription>
                            <ul className="list-disc list-inside mt-2">
                              {renderArrayItems(analysisResult.persona_specific.red_flags_triggered).map((flag, i) => (
                                <li key={i}>{flag}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {selectedPersona === "Auditor" && analysisResult.persona_specific?.audit_opinion && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Audit Opinion</h4>
                          <p className="text-sm text-muted-foreground" data-testid="text-audit-opinion">
                            {typeof analysisResult.persona_specific.audit_opinion === 'string'
                              ? analysisResult.persona_specific.audit_opinion
                              : JSON.stringify(analysisResult.persona_specific.audit_opinion)}
                          </p>
                        </div>
                      )}

                      {/* Persona-Specific: Advisor */}
                      {selectedPersona === "Advisor" && (
                        <>
                          {analysisResult.persona_specific?.maturity_assessment && (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Maturity:</span>
                              <span className="text-sm text-muted-foreground" data-testid="text-maturity">
                                {typeof analysisResult.persona_specific.maturity_assessment === 'string' 
                                  ? analysisResult.persona_specific.maturity_assessment 
                                  : (analysisResult.persona_specific.maturity_assessment as { level?: string; explanation?: string })?.level 
                                    || JSON.stringify(analysisResult.persona_specific.maturity_assessment)}
                              </span>
                            </div>
                          )}
                          {analysisResult.persona_specific?.improvement_opportunities && 
                            Array.isArray(analysisResult.persona_specific.improvement_opportunities) &&
                            analysisResult.persona_specific.improvement_opportunities.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Improvement Opportunities</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {renderArrayItems(analysisResult.persona_specific.improvement_opportunities).map((opp, i) => (
                                  <li key={i} className="text-sm text-muted-foreground" data-testid={`text-improvement-${i}`}>
                                    {opp}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {analysisResult.persona_specific?.quick_wins && 
                            Array.isArray(analysisResult.persona_specific.quick_wins) &&
                            analysisResult.persona_specific.quick_wins.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Quick Wins</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {renderArrayItems(analysisResult.persona_specific.quick_wins).map((win, i) => (
                                  <li key={i} className="text-sm text-muted-foreground">{win}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}

                      {/* Persona-Specific: Analyst */}
                      {selectedPersona === "Analyst" && (
                        <>
                          <div className="flex items-center gap-4 flex-wrap">
                            {analysisResult.persona_specific?.compliance_score !== undefined && (
                              <div className="flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">Compliance Score:</span>
                                <Badge variant="outline" data-testid="badge-compliance-score">
                                  {analysisResult.persona_specific.compliance_score as number}%
                                </Badge>
                              </div>
                            )}
                            {analysisResult.persona_specific?.criteria_met !== undefined && 
                              analysisResult.persona_specific?.criteria_total !== undefined && (
                              <span className="text-sm text-muted-foreground" data-testid="text-criteria-count">
                                {analysisResult.persona_specific.criteria_met as number} of {analysisResult.persona_specific.criteria_total as number} criteria met
                              </span>
                            )}
                          </div>
                          {analysisResult.persona_specific?.suggested_kpis && 
                            Array.isArray(analysisResult.persona_specific.suggested_kpis) &&
                            analysisResult.persona_specific.suggested_kpis.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Suggested KPIs</h4>
                              <ul className="list-disc list-inside space-y-1">
                                {renderArrayItems(analysisResult.persona_specific.suggested_kpis).map((kpi, i) => (
                                  <li key={i} className="text-sm text-muted-foreground" data-testid={`text-kpi-${i}`}>
                                    {kpi}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      )}

                      {/* Recommendations */}
                      {analysisResult.recommendations?.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Recommendations</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {renderArrayItems(analysisResult.recommendations).map((rec, i) => (
                              <li key={i} className="text-sm text-muted-foreground" data-testid={`text-recommendation-${i}`}>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex gap-4 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/controls/${controlNumber}`)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createTestRunMutation.isPending}
                  data-testid="button-submit"
                >
                  {createTestRunMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Record Test
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
