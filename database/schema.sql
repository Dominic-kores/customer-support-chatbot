
-- Enable vector similarity search
create extension if not exists vector with schema extensions;

-- 1. FAQ documents
create table if not exists documents (
  id text primary key,
  title text not null,
  content text,
  chunk_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Embedded FAQ chunks
create table if not exists document_chunks (
  id bigserial primary key,
  document_id text not null
    references documents(id) on delete cascade,
  document_title text not null,
  content text not null,
  chunk_index int not null,
  embedding vector(768),
  created_at timestamptz default now()
);

-- Prevent duplicate chunks per document
create unique index if not exists chunks_doc_idx
on document_chunks(document_id, chunk_index);

-- Cosine vector index
create index if not exists chunks_embedding_idx
on document_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- 3. Conversation history
create table if not exists conversations (
  id bigserial primary key,
  session_id text not null,
  role text not null,
  content text not null,
  sources jsonb,
  tool_calls jsonb,
  escalated boolean default false,
  created_at timestamptz default now()
);

create index if not exists conversations_session_idx
on conversations(session_id, id desc);

-- 4. Mock customer orders
create table if not exists orders (
  id text primary key,
  customer_name text not null,
  items jsonb not null,
  total int not null,
  payment_method text not null,
  status text not null,
  tracking_number text,
  delivery_estimate text,
  created_at timestamptz default now()
);

-- 5. Human escalation tickets
create table if not exists support_tickets (
  id text primary key,
  session_id text not null,
  reason text not null,
  priority text default 'medium',
  status text default 'open',
  created_at timestamptz default now()
);

-- 6. Vector similarity matching
create or replace function match_documents(
  query_embedding vector(768),
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

-- Server-only database access.
-- Never expose these tables directly to anonymous users.
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table conversations enable row level security;
alter table orders enable row level security;
alter table support_tickets enable row level security;
