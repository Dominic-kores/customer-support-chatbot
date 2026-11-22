
import "dotenv/config";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Validate essential secrets at startup.
for (const key of [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_MODEL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_API_KEY"
]) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

// Claude: chatbot responses and tool calls
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Supabase: server-side access only
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Resend remains optional during development
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const MODEL = process.env.ANTHROPIC_MODEL;
