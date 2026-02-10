import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
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
import { ControlDetailSkeleton } from "@/components/loading-skeleton";
import { StatusBadge, ApplicabilityBadge, FrequencyBadge } from "@/components/status-badge";
import { PersonaSelector, type PersonaOrAll } from "@/components/PersonaSelector";
import { QuestionCard } from "@/components/QuestionCard";
import { ProgressSection } from "@/components/ProgressSection";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Brain,
  ClipboardCheck,
  History,
  AlertTriangle,
  Loader2,
  FileText,
  Save,
  Link as LinkIcon,
  Shield,
  Table2,
  File
} from "lucide-react";
import type { Control, ControlCategory, OrganisationControl, TestRun, EvidenceLink, Persona, OntologyQuestion, ImplementationResponses, QuestionResponse, ControlQuestionnaire } from "@shared/schema";
import { format } from "date-fns";

type TestRunWithEvidence = TestRun & {
  evidenceLinks?: EvidenceLink[];
};

type ControlWithDetails = Control & {
  category: ControlCategory;
  organisationControl: OrganisationControl | null;
  recentTestRuns: TestRunWithEvidence[];
};

function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

export default function ControlDetail() {
  const { controlNumber } = useParams<{ controlNumber: string }>();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: control, isLoading, error } = useQuery<ControlWithDetails>({
    queryKey: ["/api/controls", controlNumber],
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
          <Button 
            onClick={() => navigate(`/controls/${controlNumber}/test`)}
            data-testid="button-record-test"
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Record Test
          </Button>
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
              {hasQuestionnaire ? (
                <QuestionnaireTab control={control} orgControl={orgControl} />
              ) : (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-lg font-medium mb-2">No questionnaire available</p>
                      <p className="text-sm text-muted-foreground">
                        This control does not have a questionnaire loaded
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
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
                          className="p-4 rounded-lg border bg-muted/30 space-y-2"
                        >
                          <div className="flex items-center justify-between">
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
                          {run.evidenceLinks && run.evidenceLinks.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              <span className="text-xs text-muted-foreground">Evidence:</span>
                              {run.evidenceLinks.map((ev) => {
                                const TypeIcon = ev.evidenceType === "POLICY" ? Shield
                                  : ev.evidenceType === "MATRIX" ? Table2
                                  : ev.evidenceType === "REGISTER" ? ClipboardCheck
                                  : ev.evidenceType === "DOCUMENT" ? File
                                  : FileText;
                                const chip = (
                                  <span key={ev.id} className="inline-flex items-center gap-1 text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                    <TypeIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="truncate max-w-[150px]">{ev.title}</span>
                                    {ev.url && <LinkIcon className="h-2.5 w-2.5 text-muted-foreground shrink-0" />}
                                  </span>
                                );
                                return ev.url ? (
                                  <a key={ev.id} href={ev.url} target="_blank" rel="noopener noreferrer" className="no-underline">
                                    {chip}
                                  </a>
                                ) : (
                                  chip
                                );
                              })}
                            </div>
                          )}
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
                  {orgControl?.implementationResponses?.responses && orgControl.implementationResponses.responses.length > 0 ? (
                    <div className="space-y-4">
                      {control.aiQuestionnaire?.questions?.map((q, index) => {
                        const response = orgControl.implementationResponses?.responses.find(
                          (r) => r.question_id === q.question_id
                        );
                        return (
                          <div
                            key={q.question_id}
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
                                    {response?.response_text 
                                      ? response.response_text
                                      : <span className="italic">No response recorded</span>
                                    }
                                  </p>
                                  {response?.evidence_references && response.evidence_references.length > 0 && (
                                    <div className="mt-2 flex gap-1 flex-wrap">
                                      {response.evidence_references.map((ref, i) => (
                                        <span key={i} className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                                          {ref}
                                        </span>
                                      ))}
                                    </div>
                                  )}
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
                        Complete the questionnaire in the AI Questionnaire tab to save responses
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6 lg:sticky lg:top-0 lg:self-start">
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

function QuestionnaireTab({ 
  control, 
  orgControl 
}: { 
  control: ControlWithDetails; 
  orgControl: OrganisationControl | null;
}) {
  const { toast } = useToast();
  const questionnaire = control.aiQuestionnaire as ControlQuestionnaire;
  const questions = questionnaire?.questions || [];
  
  const [selectedPersona, setSelectedPersona] = useState<PersonaOrAll>(
    (orgControl?.selectedPersona as Persona) || "Auditor"
  );
  const [saveStatuses, setSaveStatuses] = useState<Record<number, "idle" | "saving" | "saved" | "error">>({});
  const [localResponses, setLocalResponses] = useState<Record<number, QuestionResponse>>({});
  const initialised = useRef(false);

  useEffect(() => {
    if (!initialised.current && orgControl?.implementationResponses?.responses) {
      const responseMap: Record<number, QuestionResponse> = {};
      for (const r of orgControl.implementationResponses.responses) {
        responseMap[r.question_id] = r;
      }
      setLocalResponses(responseMap);
      initialised.current = true;
    }
  }, [orgControl?.implementationResponses]);

  const questionCounts = useMemo(() => {
    const counts = { Auditor: 0, Advisor: 0, Analyst: 0, All: questions.length };
    for (const q of questions) {
      if (q.primary_persona && counts[q.primary_persona as Persona] !== undefined) {
        counts[q.primary_persona as Persona]++;
      }
    }
    return counts;
  }, [questions]);

  const isAllMode = selectedPersona === "All";

  const filteredQuestions = useMemo(() => {
    if (isAllMode) return questions;
    return questions.filter((q) => q.primary_persona === selectedPersona);
  }, [questions, isAllMode, selectedPersona]);

  const groupedQuestions = useMemo(() => {
    if (!isAllMode) return null;
    const groups: Record<Persona, OntologyQuestion[]> = {
      Auditor: [],
      Advisor: [],
      Analyst: [],
    };
    for (const q of questions) {
      if (q.primary_persona && groups[q.primary_persona]) {
        groups[q.primary_persona].push(q);
      }
    }
    return groups;
  }, [questions, isAllMode]);

  const progressData = useMemo(() => {
    const answeredIds = new Set(
      Object.values(localResponses)
        .filter((r) => r.response_text?.trim())
        .map((r) => r.question_id)
    );

    const byPersona: Record<Persona, { total: number; answered: number }> = {
      Auditor: { total: 0, answered: 0 },
      Advisor: { total: 0, answered: 0 },
      Analyst: { total: 0, answered: 0 },
    };

    for (const q of questions) {
      if (q.primary_persona && byPersona[q.primary_persona]) {
        byPersona[q.primary_persona].total++;
        if (answeredIds.has(q.question_id)) {
          byPersona[q.primary_persona].answered++;
        }
      }
    }

    return {
      total: questions.length,
      answered: answeredIds.size,
      byPersona,
    };
  }, [questions, localResponses]);

  const personaMutation = useMutation({
    mutationFn: async (persona: Persona) => {
      return apiRequest("PATCH", `/api/organisation-controls/${control.id}/persona`, { persona });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls", control.controlNumber] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update persona selection.",
        variant: "destructive",
      });
    },
  });

  const responseMutation = useMutation({
    mutationFn: async (data: { question_id: number; response_text: string; evidence_references: string[] }) => {
      return apiRequest("PATCH", `/api/organisation-controls/${control.id}/response`, data);
    },
    onSuccess: (_, variables) => {
      setSaveStatuses((prev) => ({ ...prev, [variables.question_id]: "saved" }));
    },
    onError: (_, variables) => {
      setSaveStatuses((prev) => ({ ...prev, [variables.question_id]: "error" }));
    },
  });

  const localResponsesRef = useRef(localResponses);
  useEffect(() => {
    localResponsesRef.current = localResponses;
  }, [localResponses]);

  const debouncedSave = useDebouncedCallback(
    (questionId: number, responseText: string) => {
      const evidenceRefs = localResponsesRef.current[questionId]?.evidence_references || [];
      responseMutation.mutate({
        question_id: questionId,
        response_text: responseText,
        evidence_references: evidenceRefs,
      });
    },
    2000
  );

  const handleResponseChange = useCallback(
    (questionId: number, responseText: string) => {
      setSaveStatuses((prev) => ({ ...prev, [questionId]: "saving" }));
      
      setLocalResponses((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          question_id: questionId,
          response_text: responseText,
          evidence_references: prev[questionId]?.evidence_references || [],
          last_updated: new Date().toISOString(),
          answered_by_user_id: 1,
        },
      }));

      debouncedSave(questionId, responseText);
    },
    [debouncedSave]
  );

  const handlePersonaChange = (persona: PersonaOrAll) => {
    setSelectedPersona(persona);
    // Only save to DB if it's not "All" (All is a view mode, not a persona preference)
    if (persona !== "All") {
      personaMutation.mutate(persona);
    }
  };

  const handleSaveAll = () => {
    const idsToSave: number[] = [];
    for (const [questionId, response] of Object.entries(localResponses)) {
      if (response.response_text?.trim()) {
        idsToSave.push(Number(questionId));
      }
    }
    // Set all to "saving" upfront
    setSaveStatuses((prev) => {
      const next = { ...prev };
      for (const id of idsToSave) {
        next[id] = "saving";
      }
      return next;
    });
    for (const questionId of idsToSave) {
      const response = localResponses[questionId];
      responseMutation.mutate({
        question_id: questionId,
        response_text: response.response_text,
        evidence_references: response.evidence_references,
      });
    }
    toast({
      title: "Saving All",
      description: "All responses are being saved.",
    });
  };

  const renderQuestionList = (questionsToRender: OntologyQuestion[], startIndex: number = 0) => (
    <div className="space-y-4">
      {questionsToRender.map((q, index) => {
        // When in "All" mode, use the question's primary persona; otherwise use selected persona
        const displayPersona: Persona = isAllMode 
          ? (q.primary_persona || "Auditor") 
          : (selectedPersona as Persona);
        return (
          <QuestionCard
            key={q.question_id}
            question={q}
            questionNumber={startIndex + index + 1}
            response={localResponses[q.question_id]}
            persona={displayPersona}
            onResponseChange={handleResponseChange}
            organisationControlId={orgControl?.id}
            saveStatus={saveStatuses[q.question_id] || "idle"}
          />
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>Assessment Questionnaire</CardTitle>
            <CardDescription>
              {questionnaire?.metadata?.total_questions || questions.length} questions loaded from ontology
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveAll}
            data-testid="button-save-all"
          >
            <Save className="mr-2 h-4 w-4" />
            Save All
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProgressSection
            total={progressData.total}
            answered={progressData.answered}
            byPersona={progressData.byPersona}
          />

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <PersonaSelector
              selected={selectedPersona}
              questionCounts={questionCounts}
              onChange={handlePersonaChange}
              disabled={personaMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {!isAllMode ? (
        filteredQuestions.length > 0 ? (
          renderQuestionList(filteredQuestions)
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No questions for the {selectedPersona} persona
              </p>
            </CardContent>
          </Card>
        )
      ) : (
        groupedQuestions && (
          <div className="space-y-6">
            {(["Auditor", "Advisor", "Analyst"] as Persona[]).map((persona) => {
              const personaQuestions = groupedQuestions[persona];
              if (personaQuestions.length === 0) return null;

              const startIndex = ["Auditor", "Advisor", "Analyst"]
                .slice(0, ["Auditor", "Advisor", "Analyst"].indexOf(persona))
                .reduce((acc, p) => acc + groupedQuestions[p as Persona].length, 0);

              return (
                <div key={persona}>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {persona} Questions
                    <span className="text-sm font-normal text-muted-foreground">
                      ({personaQuestions.length})
                    </span>
                  </h3>
                  {renderQuestionList(personaQuestions, startIndex)}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
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
