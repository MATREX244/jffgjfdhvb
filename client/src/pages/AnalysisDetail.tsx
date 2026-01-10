import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Download, AlertTriangle, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function AnalysisDetail() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/analysis/:id");
  const { isAuthenticated } = useAuth();
  const [autoRefresh, setAutoRefresh] = useState(true);

  if (!match || !params?.id) return null;

  const analysisId = parseInt(params.id);
  const { data: analysis, isLoading, refetch } = trpc.analysis.getDetail.useQuery(
    { analysisId },
    { enabled: isAuthenticated, refetchInterval: autoRefresh ? 3000 : false }
  );

  useEffect(() => {
    if (analysis?.status === "completed" || analysis?.status === "failed") {
      setAutoRefresh(false);
    }
  }, [analysis?.status]);

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-foreground">Carregando análise...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card sticky top-0 z-40">
          <div className="container flex items-center h-16">
            <Button variant="ghost" onClick={() => setLocation("/")} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </header>
        <main className="container py-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-foreground font-semibold mb-2">Análise não encontrada</p>
              <p className="text-muted-foreground mb-4">A análise solicitada não existe ou foi deletada.</p>
              <Button onClick={() => setLocation("/")} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const getThreatBadgeClass = (level: string | null) => {
    switch (level) {
      case "clean":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
      case "suspicious":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100";
      case "malicious":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
      case "critical":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "text-green-600 dark:text-green-400";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400";
      case "high":
        return "text-orange-600 dark:text-orange-400";
      case "critical":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setLocation("/")} className="mr-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground truncate">{analysis.fileName}</h1>
              <p className="text-xs text-muted-foreground">{analysis.fileHash?.substring(0, 16)}...</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {analysis.status === "completed" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Download functionality would go here
                  toast.info("Download iniciado");
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Analysis Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>Status da Análise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-foreground">Status:</span>
                  {analysis.status === "pending" && (
                    <Badge variant="outline">Pendente</Badge>
                  )}
                  {analysis.status === "analyzing" && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Analisando
                    </Badge>
                  )}
                  {analysis.status === "completed" && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      Concluído
                    </Badge>
                  )}
                  {analysis.status === "failed" && (
                    <Badge variant="destructive">Falha</Badge>
                  )}
                </div>

                {analysis.status === "analyzing" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Progresso:</span>
                      <span className="text-sm font-semibold text-foreground">{analysis.analysisProgress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all"
                        style={{ width: `${analysis.analysisProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Tamanho</p>
                    <p className="font-semibold text-foreground">{(analysis.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="font-semibold text-foreground">{analysis.fileMimeType || "Desconhecido"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Card */}
            {analysis.status === "completed" && analysis.result && (
              <>
                {/* Threat Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {analysis.result.summary?.includes("seguro") || analysis.result.summary?.includes("Seguro") ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                      )}
                      Resumo da Análise
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                      <span className="text-foreground font-semibold">Nível de Ameaça:</span>
                      <Badge className={getThreatBadgeClass(analysis.threatLevel)}>
                        {analysis.threatLevel === "clean"
                          ? "Seguro"
                          : analysis.threatLevel === "suspicious"
                            ? "Suspeito"
                            : analysis.threatLevel === "malicious"
                              ? "Malicioso"
                              : "Crítico"}
                      </Badge>
                    </div>

                    {analysis.result.summary && (
                      <p className="text-foreground leading-relaxed">{analysis.result.summary}</p>
                    )}
                  </CardContent>
                </Card>

                {/* Detected Threats */}
                {analysis.result.detectedThreats && analysis.result.detectedThreats.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Ameaças Detectadas</CardTitle>
                      <CardDescription>{analysis.result.detectedThreats.length} ameaça(s) encontrada(s)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.result.detectedThreats.map((threat: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg border border-border">
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-semibold text-foreground capitalize">{threat.type}</span>
                              <span className="text-sm font-medium text-muted-foreground">
                                {Math.round(threat.confidence)}% confiança
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{threat.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Suspicious Patterns */}
                {analysis.result.suspiciousPatterns && analysis.result.suspiciousPatterns.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Padrões Suspeitos</CardTitle>
                      <CardDescription>{analysis.result.suspiciousPatterns.length} padrão(ões) detectado(s)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysis.result.suspiciousPatterns.map((pattern: any, idx: number) => (
                          <div key={idx} className="p-3 rounded-lg border border-border">
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-semibold text-foreground">{pattern.name}</span>
                              <span className={`text-xs font-semibold ${getSeverityColor(pattern.severity)}`}>
                                {pattern.severity === "low"
                                  ? "Baixa"
                                  : pattern.severity === "medium"
                                    ? "Média"
                                    : pattern.severity === "high"
                                      ? "Alta"
                                      : "Crítica"}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{pattern.description}</p>
                            <p className="text-xs text-muted-foreground font-mono bg-muted/30 p-2 rounded">
                              {pattern.indicator}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Analysis */}
                {analysis.result.aiAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Análise com IA</CardTitle>
                      <CardDescription>Análise contextual e recomendações</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{analysis.result.aiAnalysis}</Streamdown>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recommendations */}
                {analysis.result.recommendations && analysis.result.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recomendações</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.result.recommendations.map((rec: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="text-accent mt-1 flex-shrink-0">•</span>
                            <span className="text-foreground">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Right Column - Chat */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-12rem)] flex flex-col sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  Monitor de Análise
                </CardTitle>
                <CardDescription>Pensamentos da IA em tempo real</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-muted">
                {analysis.chatHistory && analysis.chatHistory.length > 0 ? (
                  analysis.chatHistory.map((msg: any, idx: number) => (
                    <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[90%] px-4 py-3 rounded-2xl text-sm shadow-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : msg.role === "system"
                              ? "bg-muted/50 text-muted-foreground italic border-none"
                              : "bg-card text-card-foreground border border-border rounded-tl-none"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                           <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">
                             {msg.role === "system" ? "Sistema" : msg.role === "assistant" ? "IA MalScan" : "Você"}
                           </span>
                        </div>
                        <p className="break-words leading-relaxed">{msg.content}</p>
                        <p className="text-[10px] opacity-50 mt-2 text-right">
                          {new Date(msg.timestamp).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm opacity-50">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p>Iniciando monitoramento...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
