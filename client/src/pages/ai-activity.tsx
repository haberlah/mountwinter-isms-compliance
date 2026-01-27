import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  MessageSquare, 
  FileSearch,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  Zap
} from "lucide-react";
import type { AiInteraction } from "@shared/schema";
import { format } from "date-fns";

export default function AiActivity() {
  const { data: interactions, isLoading, error } = useQuery<AiInteraction[]>({
    queryKey: ["/api/ai-interactions"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Activity</h1>
          <p className="text-muted-foreground">
            Audit log of all AI interactions and API calls
          </p>
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Activity</h1>
          <p className="text-muted-foreground">
            Audit log of all AI interactions and API calls
          </p>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">Failed to load AI activity</p>
            <p className="text-muted-foreground">Please try refreshing the page</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const typeConfig = {
    questionnaire_generation: {
      label: "Questionnaire Generation",
      icon: MessageSquare,
      color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    },
    response_review: {
      label: "Response Review",
      icon: FileSearch,
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    },
    test_analysis: {
      label: "Test Analysis",
      icon: ClipboardCheck,
      color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    },
  };

  const totalTokens = interactions?.reduce((sum, i) => sum + (i.tokensUsed || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Activity</h1>
        <p className="text-muted-foreground">
          Audit log of all AI interactions and API calls
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interactions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">AI API calls made</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Input + output tokens</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Model</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono">claude-sonnet-4-5</div>
            <p className="text-xs text-muted-foreground">Anthropic Claude API</p>
          </CardContent>
        </Card>
      </div>

      {interactions && interactions.length > 0 ? (
        <div className="space-y-3">
          {interactions.map((interaction) => {
            const config = typeConfig[interaction.interactionType as keyof typeof typeConfig] || {
              label: interaction.interactionType,
              icon: Brain,
              color: "bg-gray-100 text-gray-800",
            };
            const Icon = config.icon;

            return (
              <Card key={interaction.id} data-testid={`card-ai-interaction-${interaction.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={config.color}>
                            {config.label}
                          </Badge>
                          {interaction.controlId && (
                            <span className="text-sm text-muted-foreground">
                              Control #{interaction.controlId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(interaction.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          {interaction.tokensUsed && (
                            <div className="flex items-center gap-1">
                              <Zap className="h-3.5 w-3.5" />
                              {interaction.tokensUsed.toLocaleString()} tokens
                            </div>
                          )}
                        </div>
                        {interaction.inputSummary && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                            <span className="font-medium">Input:</span> {interaction.inputSummary}
                          </p>
                        )}
                        {interaction.outputSummary && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            <span className="font-medium">Output:</span> {interaction.outputSummary}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono shrink-0">
                      {interaction.modelUsed}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Brain className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-xl font-medium mb-2">No AI activity yet</p>
            <p className="text-muted-foreground text-center max-w-md">
              AI interactions will appear here when you generate questionnaires or 
              request AI analysis of test responses.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
