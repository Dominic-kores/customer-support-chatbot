
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import {
  ShoppingBag,
  Headphones,
  MessageSquarePlus,
  LoaderCircle
} from "lucide-react";

import { useStreamingChat } from "../hooks/useStreamingChat.js";
import ChatMessage from "../components/ChatMessage.jsx";
import ChatInput from "../components/ChatInput.jsx";

// Suggested questions to help new customers.
const suggestions = [
  "What smartphones do you have?",
  "Track order SC-1847",
  "How long does delivery to Mombasa take?",
  "Do you accept M-Pesa?"
];

// A different bright tint for each suggestion card.
const suggestionStyles = [
  "border-orange-200 bg-orange-50 text-orange-800 hover:border-orange-400 hover:shadow-orange-200",
  "border-pink-200 bg-pink-50 text-pink-800 hover:border-pink-400 hover:shadow-pink-200",
  "border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-400 hover:shadow-violet-200",
  "border-teal-200 bg-teal-50 text-teal-800 hover:border-teal-400 hover:shadow-teal-200"
];

export default function ChatPage() {
  const {
    messages,
    streaming,
    activeTool,
    sendMessage,
    stop,
    newChat
  } = useStreamingChat();

  const bottomRef = useRef(null);

  // Scroll to the latest message as text streams.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-amber-50 via-pink-50 to-violet-100">
      {/* Navigation header */}
      <header className="bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 text-white shadow-lg shadow-pink-500/20">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-3 text-white ring-1 ring-white/40 backdrop-blur">
              <ShoppingBag size={22} />
            </div>

            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-white">
                Safari Connect
              </h1>
              <p className="text-xs text-white/80">
                AI-Powered Customer Support
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin"
              className="text-sm font-medium text-white/90 hover:text-white hover:underline"
            >
              Admin
            </Link>

            <button
              onClick={newChat}
              className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-pink-600 shadow-md transition hover:scale-105 hover:shadow-lg"
            >
              <MessageSquarePlus size={16} />
              New Chat
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-6">
        <section className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-white bg-white/90 shadow-2xl shadow-violet-300/40 backdrop-blur">

          {/* Assistant header */}
          <div className="flex items-center gap-3 border-b border-pink-100 bg-gradient-to-r from-amber-100 via-pink-100 to-violet-100 px-5 py-4">
            <div className="rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-violet-600 p-2 text-white shadow-md shadow-pink-400/40">
              <Headphones size={18} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Safari AI Assistant
              </h2>

              <p className="flex items-center gap-2 text-xs text-slate-500">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                Ready to help
              </p>
            </div>
          </div>

          {/* Conversation messages */}
          <div className="h-[60vh] min-h-80 flex-1 space-y-6 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="mx-auto max-w-xl py-10 text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-violet-600 text-white shadow-lg shadow-pink-400/40">
                  <ShoppingBag size={30} />
                </div>

                <h2 className="bg-gradient-to-r from-orange-500 via-pink-500 to-violet-600 bg-clip-text text-3xl font-extrabold text-transparent">
                  Karibu Safari Connect!
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Welcome! Ask me about products,
                  deliveries, orders, payments,
                  returns or warranties.
                </p>

                {/* Clickable example questions */}
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {suggestions.map((question, i) => (
                    <button
                      key={question}
                      onClick={() => sendMessage(question)}
                      className={`rounded-xl border-2 p-4 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-lg ${suggestionStyles[i % suggestionStyles.length]}`}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Display every message */}
            {messages.map((message, index) => (
              <ChatMessage
                key={message.id}
                message={message}
                streaming={
                  streaming &&
                  index === messages.length - 1
                }
              />
            ))}

            {/* Active tool notification */}
            {streaming && activeTool && (
              <div className="flex items-center gap-2 text-xs font-medium text-fuchsia-600">
                <LoaderCircle
                  size={16}
                  className="animate-spin"
                />

                Running {activeTool.replaceAll("_", " ")}...
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Message composer */}
          <div className="border-t border-pink-100 bg-white/70 p-4">
            <ChatInput
              onSend={sendMessage}
              onStop={stop}
              streaming={streaming}
            />

            <p className="mt-3 text-center text-xs text-slate-400">
              AI-generated answers may be imperfect.
              Confirm important details with support.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
