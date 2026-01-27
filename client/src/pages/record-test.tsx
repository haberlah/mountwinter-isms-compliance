import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  aiQuestionnaire: { questions: Array<{ id: string; question: string; type: string; guidance?: string }> } | null;
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
    implementationResponses: Record<string, string | boolean | number> | null;
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

  const createTestRunMutation = useMutation({
    mutationFn: async (data: { organisationControlId: number; status: string; comments: string | null }) => {
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
