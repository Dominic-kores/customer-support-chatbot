
import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { supabase } from "./lib/clients.js";
import { processChat } from "./lib/chat.js";

import {
  saveDocument,
  deleteDocument
} from "./lib/documents.js";

const app = express();
const PORT = process.env.PORT || 5002;

// ============================================
// MIDDLEWARE
// ============================================

// Hide some Express implementation details.
app.disable("x-powered-by");

// Add HTTP security headers.
app.use(helmet());

// Allow requests from our React frontend.
app.use(cors({
  origin: process.env.CLIENT_URL
    .split(",")
    .map(value => value.trim())
}));

// Parse JSON request bodies.
app.use(express.json({
  limit: "200kb"
}));

// Limit chat requests to reduce abuse and API costs.
app.use("/api/chat", rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false
}));

// ============================================
// ADMIN AUTHENTICATION
// ============================================
// Development-only authentication.
// Use proper role-based user authentication
// before deploying for real customers.

function requireAdmin(req, res, next) {
  const provided = req.headers["x-admin-key"];

  if (
    typeof provided !== "string" ||
    provided !== process.env.ADMIN_API_KEY
  ) {
    return res.status(401).json({
      error: "Administrator access required"
    });
  }

  next();
}

// ============================================
// HEALTH CHECK
// ============================================

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Safari Connect AI"
  });
});

// ============================================
// SSE HELPER
// ============================================
// Every SSE message begins with "data:"
// and ends with two newline characters.

function sendSSE(res, event) {
  if (res.destroyed || res.writableEnded) return;

  res.write(
    `data: ${JSON.stringify(event)}\n\n`
  );
}

// ============================================
// CHAT STREAMING ENDPOINT
// ============================================

app.post("/api/chat/stream", async (req, res) => {
  const message = req.body.message;
  const sessionId = req.body.sessionId;

  // Validate user input before opening the stream.
  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.length > 4000
  ) {
    return res.status(400).json({
      error: "Message must contain 1-4000 characters"
    });
  }

  if (
    typeof sessionId !== "string" ||
    !/^[a-zA-Z0-9-]{10,80}$/.test(sessionId)
  ) {
    return res.status(400).json({
      error: "Invalid conversation session ID"
    });
  }

  // Tell the browser we are returning SSE.
  res.setHeader(
    "Content-Type",
    "text/event-stream; charset=utf-8"
  );

  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send response headers immediately.
  res.flushHeaders();

  // Allow cancellation when the customer clicks Stop.
  const controller = new AbortController();

  res.on("close", () => {
    if (!res.writableFinished) {
      controller.abort();
    }
  });

  try {
    // All RAG, tool and conversation logic lives
    // in the reusable processChat service.
    await processChat({
      message: message.trim(),
      sessionId,

      // Forward each event to the browser.
      onEvent: event => sendSSE(res, event),

      // Pass the cancellation signal to Claude.
      abortSignal: controller.signal
    });
  } catch (error) {
    if (!controller.signal.aborted) {
      console.error("Chat error:", error);

      sendSSE(res, {
        type: "error",
        message: "Unable to process your request."
      });
    }
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

// ============================================
// FAQ MANAGEMENT
// ============================================

// GET: Return all FAQ documents.
app.get("/api/documents", requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return res.status(500).json({
      error: "Failed to retrieve documents"
    });
  }

  res.json(data);
});

// POST: Create a FAQ and embed its content.
app.post("/api/documents/upload", requireAdmin,
  async (req, res) => {
    try {
      const result = await saveDocument({
        title: req.body.title,
        content: req.body.content
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  }
);

// PUT: Edit and re-embed an existing FAQ.
app.put("/api/documents/:id", requireAdmin,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id")
        .eq("id", req.params.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          error: "FAQ not found"
        });
      }

      const result = await saveDocument({
        id: req.params.id,
        title: req.body.title,
        content: req.body.content
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  }
);

// DELETE: Remove FAQ and its document chunks.
app.delete("/api/documents/:id", requireAdmin,
  async (req, res) => {
    try {
      await deleteDocument(req.params.id);

      res.json({
        success: true
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);

// POST: Regenerate embeddings for one FAQ.
app.post("/api/documents/:id/reembed", requireAdmin,
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id,title,content")
        .eq("id", req.params.id)
        .single();

      if (error) {
        return res.status(404).json({
          error: "FAQ not found"
        });
      }

      const result = await saveDocument(data);

      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  }
);

// ============================================
// ANALYTICS - OPTIONAL BONUS
// ============================================

app.get("/api/analytics", requireAdmin,
  async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          "role,content,escalated,response_ms,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const rows = data || [];

      const questions = rows.filter(
        row => row.role === "user"
      );

      const answers = rows.filter(
        row => row.role === "assistant"
      );

      const escalations = answers.filter(
        row => row.escalated
      ).length;

      const measured = answers.filter(
        row => Number.isFinite(row.response_ms)
      );

      const averageResponseMs = measured.length
        ? Math.round(
            measured.reduce(
              (sum, row) => sum + row.response_ms,
              0
            ) / measured.length
          )
        : null;

      const topics = {
        orders: 0,
        products: 0,
        delivery: 0,
        payments: 0,
        returns: 0,
        other: 0
      };

      // Count one primary topic per question.
      for (const question of questions) {
        const text = question.content.toLowerCase();

        if (/order|tracking|status/.test(text)) {
          topics.orders++;
        } else if (/phone|laptop|price|stock/.test(text)) {
          topics.products++;
        } else if (/delivery|shipping/.test(text)) {
          topics.delivery++;
        } else if (/mpesa|m-pesa|payment/.test(text)) {
          topics.payments++;
        } else if (/refund|return|warranty/.test(text)) {
          topics.returns++;
        } else {
          topics.other++;
        }
      }

      res.json({
        total_questions: questions.length,
        escalations,

        escalation_rate: answers.length
          ? Math.round(escalations / answers.length * 100)
          : 0,

        average_response_ms: averageResponseMs,
        topics,

        recent_questions: questions.slice(0, 10)
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Unable to load analytics"
      });
    }
  }
);

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(
    `Safari Connect API running on port ${PORT}`
  );
});
