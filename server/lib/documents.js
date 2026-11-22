
import { randomUUID } from "node:crypto";
import { pipeline } from "@huggingface/transformers";
import { supabase } from "./clients.js";

// Split on word boundaries with overlapping context.
export function chunkText(text, size = 120, overlap = 25) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const chunks = [];

  if (overlap >= size || size <= 0) {
    throw new Error("Invalid chunk configuration");
  }

  for (let i = 0; i < words.length; i += size - overlap) {
    chunks.push(words.slice(i, i + size).join(" "));

    if (i + size >= words.length) break;
  }

  return chunks;
}

// Local embedding model (runs on this machine, no API key needed).
// Downloaded once on first use, then cached.
export const EMBEDDING_DIMENSIONS = 384;
let extractorPromise;

function getExtractor() {
  extractorPromise ??= pipeline(
    "feature-extraction",
    process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2"
  );
  return extractorPromise;
}

// Generate one 384-dimensional embedding.
export async function embedText(text) {
  const extractor = await getExtractor();
  const output = await extractor(text, {
    pooling: "mean",
    normalize: true
  });

  const vector = Array.from(output.data);

  if (vector.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected a ${EMBEDDING_DIMENSIONS}-dimensional vector`
    );
  }

  return vector;
}

// Create or update a document and its chunks.
export async function saveDocument({
  id = randomUUID(),
  title,
  content
}) {
  if (!title?.trim() || !content?.trim()) {
    throw new Error("Title and content are required");
  }

  const chunks = chunkText(content);

  // Generate embeddings before changing the database.
  const vectors = [];

  for (const chunk of chunks) {
    vectors.push(await embedText(chunk));
  }

  const { error: documentError } = await supabase
    .from("documents")
    .upsert({
      id,
      title,
      content,
      chunk_count: chunks.length,
      updated_at: new Date().toISOString()
    });

  if (documentError) throw documentError;

  // Replace old embeddings when editing an FAQ.
  const { error: deleteError } = await supabase
    .from("document_chunks")
    .delete()
    .eq("document_id", id);

  if (deleteError) throw deleteError;

  const rows = chunks.map((chunk, index) => ({
    document_id: id,
    document_title: title,
    content: chunk,
    chunk_index: index,

    // pgvector accepts vector text representation.
    embedding: JSON.stringify(vectors[index])
  }));

  const { error: insertError } = await supabase
    .from("document_chunks")
    .insert(rows);

  if (insertError) throw insertError;

  return {
    id,
    title,
    chunk_count: rows.length
  };
}

export async function deleteDocument(id) {
  // ON DELETE CASCADE removes the document's chunks.
  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) throw error;
}
