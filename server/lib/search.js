
import { supabase } from "./clients.js";
import { embedText } from "./documents.js";

export async function searchDocuments(query) {
  // Step 1: Convert the question into an embedding.
  const queryEmbedding = await embedText(query, "RETRIEVAL_QUERY");

  // Step 2: Compare against stored embeddings.
  const { data, error } = await supabase.rpc(
    "match_documents",
    {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: 4,
      match_threshold: 0.3
    }
  );

  if (error) throw error;

  // Step 3: Assign citation numbers.
  return (data || []).map((item, index) => ({
    ...item,
    source_number: index + 1
  }));
}
