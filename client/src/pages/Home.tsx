import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Upload, TrendingUp, AlertTriangle } from "lucide-react";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: analyses, isLoading: analysesLoading } = trpc.analysis.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
          <p className="text-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
              <img src="/logo.png" alt="MalScan Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">MalScan</h1>
            <p className="text-muted-foreground">Plataforma Profissional de Análise de Malware</p>
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-foreground mb-6">
                Analise arquivos executáveis com IA avançada e detecção de padrões de malware em tempo real.
              </p>
              <Button
                onClick={() => (window.location.href = getLoginUrl())}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Entrar com Manus
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start gap-3">
              <Upload className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Upload até 4GB</h3>
                <p className="text-sm text-muted-foreground">Suporte para .exe, .dll, .bin e mais</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Análise com IA</h3>
                <p className="text-sm text-muted-foreground">Processamento inteligente de binários</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-accent mt-1 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Detecção Profunda</h3>
                <p className="text-sm text-muted-foreground">Vírus, spyware, RATs, trojans e mais</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10">
              <img src="/logo.png" alt="MalScan Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">MalScan</h1>
              <p className="text-xs text-muted-foreground">Análise de Malware</p>
            </div>
          </div>
          <div className="text-sm text-muted-foreground">Bem-vindo, {user?.name}</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Análises</h2>
              <p className="text-muted-foreground">Gerencie suas análises de malware</p>
            </div>
            <Link href="/upload">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Upload className="w-4 h-4 mr-2" />
                Nova Análise
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Overview */}
        {analyses && analyses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">{analyses.length}</div>
                <p className="text-sm text-muted-foreground">Total de Análises</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">
                  {analyses.filter((a) => a.status === "completed").length}
                </div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">
                  {analyses.filter((a) => a.threatLevel === "critical" || a.threatLevel === "malicious").length}
                </div>
                <p className="text-sm text-muted-foreground">Ameaças Detectadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-foreground">
                  {analyses.filter((a) => a.status === "analyzing").length}
                </div>
                <p className="text-sm text-muted-foreground">Analisando</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analyses List */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Análises</CardTitle>
            <CardDescription>Suas análises recentes de malware</CardDescription>
          </CardHeader>
          <CardContent>
            {analysesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
              </div>
            ) : analyses && analyses.length > 0 ? (
              <div className="space-y-4">
                {analyses
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((analysis) => (
                    <Link key={analysis.id} href={`/analysis/${analysis.id}`}>
                      <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground truncate">{analysis.fileName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {(analysis.fileSize / 1024 / 1024).toFixed(2)} MB •{" "}
                                {formatDistanceToNow(new Date(analysis.createdAt), { locale: ptBR, addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Status Badge */}
                          {analysis.status === "pending" && (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                              Pendente
                            </Badge>
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

                          {/* Threat Level Badge */}
                          {analysis.status === "completed" && (
                            <>
                              {analysis.threatLevel === "clean" && (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                  Seguro
                                </Badge>
                              )}
                              {analysis.threatLevel === "suspicious" && (
                                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                                  Suspeito
                                </Badge>
                              )}
                              {analysis.threatLevel === "malicious" && (
                                <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">
                                  Malicioso
                                </Badge>
                              )}
                              {analysis.threatLevel === "critical" && (
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                                  Crítico
                                </Badge>
                              )}
                            </>
                          )}

                          {/* Progress */}
                          {analysis.status === "analyzing" && (
                            <div className="text-sm text-muted-foreground">{analysis.analysisProgress}%</div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 text-muted mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground mb-4">Nenhuma análise realizada ainda</p>
                <Link href="/upload">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Upload className="w-4 h-4 mr-2" />
                    Fazer Primeira Análise
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
