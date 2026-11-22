
# Safari Connect AI — Customer Support Chatbot

A full-stack AI-powered customer support application
for a fictional Kenyan electronics retailer.

## Project Objectives

- Build a full-stack React and Express application.
- Implement RAG using OpenAI embeddings and Supabase.
- Generate grounded customer support answers with Claude.
- Stream AI responses using Server-Sent Events.
- Implement AI tool calling for orders and products.
- Maintain conversation history.
- Escalate unresolved enquiries to human agents.
- Manage FAQs through an admin dashboard.
- Explore analytics and multilingual support.

## Tech Stack

- React, Vite and Tailwind CSS
- Node.js and Express
- Anthropic Claude
- OpenAI text-embedding-3-small
- Supabase PostgreSQL and pgvector
- Resend
- Vercel and Railway

## Features

1. RAG-powered customer support
2. Semantic FAQ retrieval
3. Source citations
4. AI response streaming
5. Product availability lookup
6. Order status tracking
7. Conversation history
8. Human support escalation
9. FAQ administration
10. Conversation analytics

## Getting Started

### Backend

cd server
npm install

Configure .env and run database/schema.sql.

npm run seed
npm run dev

### Frontend

cd client
npm install
npm run dev

## API Routes

POST   /api/chat/stream
POST   /api/documents/upload
GET    /api/documents
PUT    /api/documents/:id
DELETE /api/documents/:id
POST   /api/documents/:id/reembed
GET    /api/analytics
GET    /api/health

## Testing

Test FAQ retrieval, streaming, order tracking,
product searches, escalation, admin CRUD
and conversation history.

## Deployment

Frontend: Vercel
Backend: Railway
Database: Supabase

## Notes

This application uses fictional retailer policies,
product prices and demonstration orders.

Before production use, implement authenticated
sessions, customer data protection, role-based
authorization and stronger operational controls.




## Author
Dominic Kores
Software Development & AI Engineer