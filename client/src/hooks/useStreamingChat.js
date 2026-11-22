
import { useEffect, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL;

// Generate a random demo chat session.
// Production sessions should be authenticated.
function createSessionId() {
  return crypto.randomUUID();
}

export function useStreamingChat() {
  const [sessionId, setSessionId] = useState(
    createSessionId
  );

  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [activeTool, setActiveTool] = useState(null);

  // Store the active network request for cancellation.
  const controllerRef = useRef(null);
  const activeRequestRef = useRef(null);

  // Cancel the request if this hook unmounts.
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  // ==========================================
  // NEW CHAT
  // ==========================================

  function newChat() {
    // Cancel any current response.
    controllerRef.current?.abort();
    activeRequestRef.current = null;
    controllerRef.current = null;

    // Start a completely new session.
    setSessionId(createSessionId());
    setMessages([]);
    setActiveTool(null);
    setStreaming(false);
  }

  // ==========================================
  // STOP GENERATION
  // ==========================================

  function stop() {
    controllerRef.current?.abort();
    activeRequestRef.current = null;
    controllerRef.current = null;

    setStreaming(false);
    setActiveTool(null);
  }

  // ==========================================
  // SEND A CUSTOMER MESSAGE
  // ==========================================

  async function sendMessage(text) {
    if (!text.trim() || activeRequestRef.current) {
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text
    };

    const assistantId = crypto.randomUUID();

    const assistantMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      sources: [],
      toolCalls: [],
      escalated: false
    };

    // Immediately show the user message and an
    // empty AI message while generation begins.
    setMessages(previous => [
      ...previous,
      userMessage,
      assistantMessage
    ]);

    setStreaming(true);
    setActiveTool(null);

    const controller = new AbortController();
    const requestId = crypto.randomUUID();

    controllerRef.current = controller;
    activeRequestRef.current = requestId;

    // Update only the assistant message associated
    // with this request.
    function updateAssistant(updater) {
      if (activeRequestRef.current !== requestId) {
        return;
      }

      setMessages(previous =>
        previous.map(item =>
          item.id === assistantId
            ? { ...item, ...updater(item) }
            : item
        )
      );
    }

    try {
      // Fetch supports streaming response bodies.
      const response = await fetch(
        `${API}/api/chat/stream`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            message: text,
            sessionId
          }),

          signal: controller.signal
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Unable to connect to the chatbot");
      }

      // Get the response reader and text decoder.
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buffer = "";

      // Read the streamed response until completion.
      while (true) {
        const { value, done } = await reader.read();

        if (done) break;

        // Convert bytes into UTF-8 text.
        buffer += decoder.decode(value, {
          stream: true
        });

        // Normalize common SSE newline formats.
        buffer = buffer.replace(/\r\n/g, "\n");

        // Each SSE event ends with a blank line.
        let boundary;

        while ((boundary = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, boundary);

          // Remove the processed event from buffer.
          buffer = buffer.slice(boundary + 2);

          // Join all data lines for this event.
          const data = rawEvent
            .split("\n")
            .filter(line => line.startsWith("data:"))
            .map(line => line.slice(5).trimStart())
            .join("\n");

          if (!data) continue;

          const event = JSON.parse(data);

          // Ignore stale events after stopping/new chat.
          if (activeRequestRef.current !== requestId) {
            return;
          }

          // --------------------------------------
          // EVENT: SOURCES
          // --------------------------------------
          if (event.type === "sources") {
            updateAssistant(() => ({
              sources: event.sources
            }));
          }

          // --------------------------------------
          // EVENT: TEXT
          // --------------------------------------
          if (event.type === "text") {
            updateAssistant(item => ({
              content: item.content + event.text
            }));
          }

          // --------------------------------------
          // EVENT: TOOL CALL
          // --------------------------------------
          if (event.type === "tool_call") {
            setActiveTool(event.name);

            updateAssistant(item => ({
              toolCalls: [
                ...item.toolCalls,
                event.name
              ]
            }));
          }

          // --------------------------------------
          // EVENT: COMPLETION
          // --------------------------------------
          if (event.type === "done") {
            setActiveTool(null);

            updateAssistant(() => ({
              escalated: event.escalated
            }));
          }

          // --------------------------------------
          // EVENT: ERROR
          // --------------------------------------
          if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }

      // Flush any remaining decoder bytes.
      decoder.decode();
    } catch (error) {
      // A deliberate abort is not treated as failure.
      if (error.name !== "AbortError") {
        updateAssistant(item => ({
          content:
            item.content +
            `\n\n⚠️ ${error.message}`
        }));
      }
    } finally {
      // Don't change state for an older request.
      if (activeRequestRef.current === requestId) {
        activeRequestRef.current = null;
        controllerRef.current = null;

        setStreaming(false);
        setActiveTool(null);
      }
    }
  }

  return {
    messages,
    streaming,
    activeTool,
    sendMessage,
    stop,
    newChat
  };
}
