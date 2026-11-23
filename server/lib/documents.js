
import { randomUUID } from "node:crypto";
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

// Gemini embeddings via the Gemini API.
// gemini-embedding-001 supports 768, 1536 or 3072 dimensions.
// 768 keeps storage small and fits pgvector's ivfflat index limit.
export const EMBEDDING_DIMENSIONS = 768;
const EMBEDDING_MODEL =
  process.env.EMBEDDING_MODEL || "gemini-embedding-001";
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

// Gemini only normalizes 3072-dim vectors, so normalize the rest
// ourselves to keep cosine similarity accurate.
function normalize(vector) {
  const norm = Math.hypot(...vector);
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

// Embed many texts in one request.
// taskType: "RETRIEVAL_DOCUMENT" for stored chunks,
//           "RETRIEVAL_QUERY" for user questions.
export async function embedTexts(
  texts,
  taskType = "RETRIEVAL_DOCUMENT"
) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const response = await fetch(
    `${GEMINI_API_URL}/${EMBEDDING_MODEL}:batchEmbedContents`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        requests: texts.map((text) => ({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
          taskType,
          outputDimensionality: EMBEDDING_DIMENSIONS
        }))
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Gemini embedding failed (${response.status}): ${await response.text()}`
    );
  }

  const { embeddings } = await response.json();

  return embeddings.map(({ values }) => {
    if (values.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Expected a ${EMBEDDING_DIMENSIONS}-dimensional vector`
      );
    }
    return normalize(values);
  });
}

// Generate one embedding.
export async function embedText(text, taskType) {
  const [vector] = await embedTexts([text], taskType);
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
  const vectors = await embedTexts(chunks, "RETRIEVAL_DOCUMENT");

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
