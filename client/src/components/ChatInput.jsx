
import { useState } from "react";
import { Send, Square } from "lucide-react";

export default function ChatInput({
  onSend,
  onStop,
  streaming
}) {
  const [text, setText] = useState("");

  // Send the current message.
  function handleSubmit(event) {
    event.preventDefault();

    if (!text.trim() || streaming) return;

    onSend(text.trim());
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <textarea
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder="Ask about orders, products, delivery..."
        rows={2}
        disabled={streaming}

        // Enter sends; Shift+Enter creates a new line.
        onKeyDown={event => {
          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {
            event.preventDefault();
            handleSubmit(event);
          }
        }}

        className="min-h-14 flex-1 resize-none rounded-xl border-2 border-violet-100 bg-white px-4 py-3 text-sm outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-100"
      />

      {/* Show Stop while AI is streaming. */}
      {streaming ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop response"
          className="flex w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-md shadow-rose-300/50"
        >
          <Square size={18} />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send message"
          className="flex w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-violet-600 text-white shadow-md shadow-pink-300/50 transition hover:scale-105 disabled:hover:scale-100"
        >
          <Send size={18} />
        </button>
      )}
    </form>
  );
}
