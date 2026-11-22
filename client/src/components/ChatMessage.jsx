
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Bot,
  UserRound,
  Wrench,
  CheckCircle2
} from "lucide-react";

import SourceCitations from "./SourceCitations.jsx";

export default function ChatMessage({
  message,
  streaming
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 ${
      isUser ? "flex-row-reverse" : ""
    }`}>
      {/* Avatar */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
        isUser
          ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-orange-300/50"
          : "bg-gradient-to-br from-orange-500 via-pink-500 to-violet-600 text-white shadow-md shadow-pink-300/50"
      }`}>
        {isUser
          ? <UserRound size={18} />
          : <Bot size={18} />
        }
      </div>

      {/* Message bubble */}
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
        isUser
          ? "bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-pink-300/50"
          : "border border-violet-100 bg-white text-slate-800 shadow-violet-100"
      }`}>
        {isUser ? (
          // User content is displayed as ordinary text.
          <p className="whitespace-pre-wrap text-sm">
            {message.content}
          </p>
        ) : (
          <>
            {/* Convert AI Markdown into React content. */}
            <div className="markdown-content text-sm leading-7">
              {message.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              ) : (
                <span className="animate-pulse font-medium text-pink-500">
                  {streaming ? "Thinking..." : ""}
                </span>
              )}
            </div>

            {/* Display tools used by the assistant. */}
            {message.toolCalls?.length > 0 && (
              <div className="mt-3 space-y-1">
                {message.toolCalls.map((tool, index) => (
                  <p
                    key={index}
                    className="flex items-center gap-2 text-xs font-medium text-fuchsia-600"
                  >
                    <Wrench size={13} />
                    {tool.replaceAll("_", " ")}
                  </p>
                ))}
              </div>
            )}

            {/* Show FAQ citations. */}
            <SourceCitations
              sources={message.sources}
            />

            {/* Confirm successful human escalation. */}
            {message.escalated && (
              <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-600">
                <CheckCircle2 size={15} />
                Support ticket created.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
