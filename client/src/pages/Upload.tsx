import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Upload, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useRef } from "react";
import { toast } from "sonner";

export default function UploadPage() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const getUploadUrlMutation = trpc.analysis.getUploadUrl.useMutation();
  const finalizeUploadMutation = trpc.analysis.finalizeUpload.useMutation();

  if (!isAuthenticated) {
    setLocation("/");
    return null;
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (4GB max)
    const maxSize = 4 * 1024 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Máximo: 4GB");
      return;
    }

    // Validate file type
    const allowedExtensions = [".exe", ".dll", ".bin", ".sys", ".scr", ".elf", ".so"];
    const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowedExtensions.includes(fileExt)) {
      toast.error(`Tipo de arquivo não suportado. Suportados: ${allowedExtensions.join(", ")}`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(10);

      // Get upload URL
      const uploadUrlResponse = await getUploadUrlMutation.mutateAsync({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || "application/octet-stream",
      });

      setUploadProgress(30);

      // Upload file to S3
      const formData = new FormData();
      formData.append("file", selectedFile);

      const uploadResponse = await fetch(
        `${import.meta.env.VITE_FRONTEND_FORGE_API_URL}/storage/upload?path=${encodeURIComponent(uploadUrlResponse.fileKey)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_FRONTEND_FORGE_API_KEY}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      setUploadProgress(70);

      // Finalize upload and start analysis
      await finalizeUploadMutation.mutateAsync({
        analysisId: uploadUrlResponse.analysisId,
        fileKey: uploadUrlResponse.fileKey,
      });

      setUploadProgress(100);
      toast.success("Análise iniciada! Redirecionando...");

      // Redirect to analysis page
      setTimeout(() => {
        setLocation(`/analysis/${uploadUrlResponse.analysisId}`);
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload do arquivo");
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="container flex items-center h-16">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mr-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl font-bold text-foreground">Nova Análise</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Upload de Arquivo</CardTitle>
            <CardDescription>Selecione um arquivo executável para análise</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Input Area */}
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                accept=".exe,.dll,.bin,.sys,.scr,.elf,.so"
              />

              {selectedFile ? (
                <div className="space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                  <div>
                    <p className="font-semibold text-foreground">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 text-muted mx-auto" />
                  <div>
                    <p className="font-semibold text-foreground">Clique para selecionar arquivo</p>
                    <p className="text-sm text-muted-foreground">ou arraste aqui</p>
                  </div>
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Formatos Suportados</p>
                  <p className="text-muted-foreground">.exe, .dll, .bin, .sys, .scr, .elf, .so</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-foreground">Tamanho Máximo</p>
                  <p className="text-muted-foreground">Até 4GB</p>
                </div>
              </div>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Enviando arquivo...</p>
                  <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-accent h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Iniciar Análise
                </>
              )}
            </Button>

            {/* Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Nota:</strong> A análise pode levar alguns minutos dependendo do tamanho do arquivo. Você será notificado quando estiver concluída.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
