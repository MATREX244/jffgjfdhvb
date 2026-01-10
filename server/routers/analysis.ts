import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createAnalysis,
  updateAnalysisStatus,
  getAnalysisById,
  getUserAnalyses,
  getAnalysisResult,
  updateAnalysisResult,
  addChatMessage,
  getChatHistory,
} from "../db";
import { storagePut, storageGet } from "../storage";
import { analyzeBinary } from "../malwareAnalyzer";
import { invokeLLM } from "../_core/llm";
import { nanoid } from "nanoid";

export const analysisRouter = router({
  /**
   * Get all analyses for the current user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const analyses = await getUserAnalyses(ctx.user.id);
    return analyses.map((a) => ({
      id: a.id,
      fileName: a.fileName,
      fileSize: a.fileSize,
      status: a.status,
      threatLevel: a.threatLevel,
      analysisProgress: a.analysisProgress,
      createdAt: a.createdAt,
      completedAt: a.completedAt,
    }));
  }),

  /**
   * Get details of a specific analysis
   */
  getDetail: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ ctx, input }) => {
      const analysis = await getAnalysisById(input.analysisId);
      if (!analysis || analysis.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      const result = await getAnalysisResult(input.analysisId);
      const chatHistory = await getChatHistory(input.analysisId);

      return {
        id: analysis.id,
        fileName: analysis.fileName,
        fileSize: analysis.fileSize,
        fileHash: analysis.fileHash,
        fileMimeType: analysis.fileMimeType,
        status: analysis.status,
        threatLevel: analysis.threatLevel,
        analysisProgress: analysis.analysisProgress,
        createdAt: analysis.createdAt,
        completedAt: analysis.completedAt,
        result: result
          ? {
              suspiciousPatterns: result.suspiciousPatterns ? JSON.parse(result.suspiciousPatterns) : [],
              detectedThreats: result.detectedThreats ? JSON.parse(result.detectedThreats) : [],
              behaviorAnalysis: result.behaviorAnalysis ? JSON.parse(result.behaviorAnalysis) : [],
              aiAnalysis: result.aiAnalysis,
              recommendations: result.recommendations ? JSON.parse(result.recommendations) : [],
              summary: result.summary,
            }
          : null,
        chatHistory: chatHistory.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      };
    }),

  /**
   * Get download URL for analyzed file
   */
  getFileUrl: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ ctx, input }) => {
      const analysis = await getAnalysisById(input.analysisId);
      if (!analysis || analysis.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      const { url } = await storageGet(analysis.fileKey);
      return { url };
    }),

  /**
   * Create a presigned URL for file upload
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        fileSize: z.number().min(1).max(4 * 1024 * 1024 * 1024), // 4GB max
        mimeType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate file type
      const allowedExtensions = [".exe", ".dll", ".bin", ".sys", ".scr", ".elf", ".so"];
      const fileExt = input.fileName.substring(input.fileName.lastIndexOf(".")).toLowerCase();

      if (!allowedExtensions.includes(fileExt)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File type not supported. Supported: .exe, .dll, .bin, .sys, .scr, .elf, .so",
        });
      }

      // Create analysis record
      const fileKey = `analyses/${ctx.user.id}/${nanoid()}/${input.fileName}`;

      const analysis = await createAnalysis({
        userId: ctx.user.id,
        fileName: input.fileName,
        fileKey,
        fileUrl: "", // Will be updated after upload
        fileSize: input.fileSize,
        fileMimeType: input.mimeType,
        status: "pending",
      });

      if (!analysis) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create analysis" });
      }

      return {
        analysisId: analysis.id,
        fileKey,
        uploadUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL}/storage/upload`,
      };
    }),

  /**
   * Finalize upload and start analysis
   */
  finalizeUpload: protectedProcedure
    .input(
      z.object({
        analysisId: z.number(),
        fileKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const analysis = await getAnalysisById(input.analysisId);
      if (!analysis || analysis.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      // Get the file URL from storage
      const { url } = await storageGet(input.fileKey);

      // Update analysis with file URL
      await updateAnalysisStatus(input.analysisId, "analyzing", 10);

      // Add initial chat message
      await addChatMessage(input.analysisId, "system", `Starting analysis of ${analysis.fileName}...`);

      // Start background analysis (in production, this would be a queue job)
      analyzeFileInBackground(input.analysisId, input.fileKey, ctx.user.id).catch((err) => {
        console.error("Background analysis failed:", err);
      });

      return { success: true };
    }),

  /**
   * Get chat history for an analysis
   */
  getChatHistory: protectedProcedure
    .input(z.object({ analysisId: z.number() }))
    .query(async ({ ctx, input }) => {
      const analysis = await getAnalysisById(input.analysisId);
      if (!analysis || analysis.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Analysis not found" });
      }

      const messages = await getChatHistory(input.analysisId);
      return messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }));
    }),
});

/**
 * Background analysis function
 * In production, this would be handled by a job queue (Bull, RabbitMQ, etc)
 */
async function analyzeFileInBackground(analysisId: number, fileKey: string, userId: number) {
  try {
    // Get file from storage
    const { url } = await storageGet(fileKey);

    // Fetch file content
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch file from storage");
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Get analysis record for filename
    const analysis = await getAnalysisById(analysisId, userId);
    if (!analysis) {
      throw new Error("Analysis record not found");
    }

    // Update progress
    await updateAnalysisStatus(analysisId, "analyzing", 25);
    await addChatMessage(analysisId, "system", `Analyzing binary structure and patterns...`);

    // Perform binary analysis
    const binaryAnalysis = analyzeBinary(buffer, analysis.fileName);

    // Update progress
    await updateAnalysisStatus(analysisId, "analyzing", 50);
    await addChatMessage(
      analysisId,
      "assistant",
      `Found ${binaryAnalysis.suspiciousPatterns.length} suspicious patterns and ${binaryAnalysis.detectedThreats.length} potential threats.`
    );

    // Update progress
    await updateAnalysisStatus(analysisId, "analyzing", 65);
    await addChatMessage(analysisId, "system", `Invoking AI for contextual analysis...`);

    // Get AI analysis
    const aiPrompt = `Você é um especialista sênior em análise de malware e engenharia reversa. Sua tarefa é realizar uma análise profunda, cautelosa e extremamente analítica dos resultados binários fornecidos.

DADOS DO ARQUIVO:
- Nome: ${analysis.fileName}
- Tamanho: ${binaryAnalysis.fileSize} bytes
- Hash (SHA-256): ${binaryAnalysis.fileHash}

PADRÕES SUSPEITOS DETECTADOS:
${binaryAnalysis.suspiciousPatterns.map((p) => `- [${p.severity.toUpperCase()}] ${p.name}: ${p.description}`).join("\n")}

AMEAÇAS IDENTIFICADAS:
${binaryAnalysis.detectedThreats.map((t) => `- ${t.type} (Confiança: ${t.confidence.toFixed(1)}%): ${t.description}`).join("\n")}

INDICADORES COMPORTAMENTAIS:
${binaryAnalysis.behaviorAnalysis.map((b) => `- [${b.severity.toUpperCase()}] ${b.behavior}: ${b.description}`).join("\n")}

MÉTRICAS GERAIS:
- Score de Risco: ${binaryAnalysis.riskScore}/100
- Nível de Ameaça: ${binaryAnalysis.threatLevel}

INSTRUÇÕES DE ANÁLISE:
1. Seja extremamente cauteloso. Se houver qualquer dúvida, classifique como suspeito.
2. Analise como esses padrões (como injeção de código, ganchos de teclado ou ofuscação) podem ser usados em conjunto para um ataque.
3. Forneça uma explicação técnica do que o código provavelmente tenta fazer.
4. Liste ações imediatas de mitigação.
5. Use um tom profissional, técnico e direto.

Responda em Português Brasileiro.`;

    const aiResponse = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a cybersecurity expert specializing in malware analysis. Provide detailed, technical analysis of malware samples.",
        },
        { role: "user", content: aiPrompt },
      ],
    });

    const aiContent = aiResponse.choices[0]?.message.content;
    const aiAnalysis = typeof aiContent === "string" ? aiContent : "Unable to generate AI analysis";

    // Update progress
    await updateAnalysisStatus(analysisId, "analyzing", 80);
    if (aiAnalysis) {
      await addChatMessage(analysisId, "assistant", aiAnalysis);
    }

    // Generate recommendations
    const recommendations = generateRecommendations(binaryAnalysis);

    // Update progress
    await updateAnalysisStatus(analysisId, "analyzing", 90);

    // Store results
    await updateAnalysisResult(analysisId, {
      suspiciousPatterns: JSON.stringify(binaryAnalysis.suspiciousPatterns),
      detectedThreats: JSON.stringify(binaryAnalysis.detectedThreats),
      behaviorAnalysis: JSON.stringify(binaryAnalysis.behaviorAnalysis),
      aiAnalysis,
      recommendations: JSON.stringify(recommendations),
      summary: binaryAnalysis.summary,
    });

    // Final update
    await updateAnalysisStatus(analysisId, "completed", 100, binaryAnalysis.threatLevel);
    await addChatMessage(analysisId, "system", "Analysis completed successfully.");
  } catch (error) {
    console.error("Analysis error:", error);
    await updateAnalysisStatus(analysisId, "failed", 0);
    await addChatMessage(analysisId, "system", `Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(analysis: ReturnType<typeof analyzeBinary>): string[] {
  const recommendations: string[] = [];

  if (analysis.threatLevel === "critical") {
    recommendations.push("QUARANTINE IMMEDIATELY: Do not execute this file under any circumstances");
    recommendations.push("Report to your security team and incident response");
    recommendations.push("Check all systems for signs of compromise");
  } else if (analysis.threatLevel === "malicious") {
    recommendations.push("Isolate affected systems from the network");
    recommendations.push("Perform forensic analysis to determine if execution occurred");
    recommendations.push("Review system logs for suspicious activity");
  } else if (analysis.threatLevel === "suspicious") {
    recommendations.push("Exercise caution before execution");
    recommendations.push("Run in isolated environment if execution is necessary");
    recommendations.push("Monitor system behavior closely");
  }

  // Specific recommendations based on detected threats
  if (analysis.detectedThreats.some((t) => t.type === "ransomware")) {
    recommendations.push("Ensure all systems have up-to-date backups");
    recommendations.push("Verify backup integrity and isolation from production systems");
  }

  if (analysis.detectedThreats.some((t) => t.type === "rat" || t.type === "backdoor")) {
    recommendations.push("Check for unauthorized remote access attempts");
    recommendations.push("Review firewall logs for suspicious outbound connections");
  }

  if (analysis.detectedThreats.some((t) => t.type === "spyware" || t.type === "keylogger")) {
    recommendations.push("Change all passwords from a clean system");
    recommendations.push("Monitor for data exfiltration");
  }

  if (recommendations.length === 0) {
    recommendations.push("File appears safe, but exercise normal security practices");
  }

  return recommendations;
}
