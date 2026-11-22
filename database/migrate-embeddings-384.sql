-- Switch from OpenAI embeddings (1536 dims) to local
-- all-MiniLM-L6-v2 embeddings (384 dims).
-- Run once in the Supabase SQL editor, then re-run `npm run seed`.

-- Old vectors can't be converted, so clear them.
delete from document_chunks;

drop index if exists chunks_embedding_idx;
drop function if exists match_documents(vector, int, float);

alter table document_chunks
  alter column embedding type vector(384);

create index if not exists chunks_embedding_idx
on document_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create or replace function match_documents(
  query_embedding vector(384),
  match_count int default 4,
  match_threshold float default 0.3
)
returns table (
  id bigint,
  document_id text,
  document_title text,
  content text,
  chunk_index int,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.document_title,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding)
      as similarity
  from document_chunks dc
  where 1 - (dc.embedding <=> query_embedding)
    > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
