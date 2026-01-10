import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, analyses, analysisResults, chatMessages, Analysis, ChatMessage, InsertAnalysis, InsertAnalysisResult } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Analysis queries

export async function getUserAnalyses(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(analyses).where(eq(analyses.userId, userId)).orderBy((t) => t.createdAt);
}

export async function getAnalysisById(analysisId: number, userId?: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(analyses).where(eq(analyses.id, analysisId)).limit(1);
  const analysis = result[0];
  
  if (analysis && userId && analysis.userId !== userId) {
    return undefined;
  }
  
  return analysis;
}

export async function createAnalysis(data: InsertAnalysis) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(analyses).values(data);
  const analysisId = result[0].insertId;
  
  return getAnalysisById(Number(analysisId));
}

export async function updateAnalysisStatus(
  analysisId: number,
  status: Analysis["status"],
  progress?: number,
  threatLevel?: Analysis["threatLevel"]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updates: any = { status, updatedAt: new Date() };
  if (progress !== undefined) updates.analysisProgress = progress;
  if (threatLevel !== undefined) updates.threatLevel = threatLevel;
  if (status === "completed") updates.completedAt = new Date();
  
  await db.update(analyses).set(updates).where(eq(analyses.id, analysisId));
}

export async function getOrCreateAnalysisResult(analysisId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(analysisResults).where(eq(analysisResults.analysisId, analysisId)).limit(1);
  
  if (existing.length > 0) {
    return existing[0];
  }
  
  const result = await db.insert(analysisResults).values({ analysisId });
  return db.select().from(analysisResults).where(eq(analysisResults.id, Number(result[0].insertId))).limit(1).then(r => r[0]);
}

export async function updateAnalysisResult(
  analysisId: number,
  data: Partial<InsertAnalysisResult>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await db.select().from(analysisResults).where(eq(analysisResults.analysisId, analysisId)).limit(1);
  
  if (existing.length === 0) {
    await db.insert(analysisResults).values({ analysisId, ...data });
  } else {
    await db.update(analysisResults).set(data).where(eq(analysisResults.analysisId, analysisId));
  }
}

export async function getAnalysisResult(analysisId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(analysisResults).where(eq(analysisResults.analysisId, analysisId)).limit(1);
  return result[0];
}

export async function addChatMessage(
  analysisId: number,
  role: ChatMessage["role"],
  content: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(chatMessages).values({ analysisId, role, content });
}

export async function getChatHistory(analysisId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(chatMessages).where(eq(chatMessages.analysisId, analysisId)).orderBy((t) => t.timestamp);
}
