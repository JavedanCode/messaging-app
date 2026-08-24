import { useEffect, useRef } from "react";

import { useChat } from "../../context/ChatContext";
import MessageBubble from "./MessageBubble";

function MessageList() {
  const { messages, loadingMessages, typingUsers } = useChat();

  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length, typingUsers.length]);

  if (loadingMessages) {
    return (
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <div className="flex items-end gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/5" />

          <div className="h-12 w-48 animate-pulse rounded-2xl bg-white/5" />
        </div>

        <div className="flex justify-end">
          <div className="h-12 w-56 animate-pulse rounded-2xl bg-white/5" />
        </div>

        <div className="flex items-end gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/5" />

          <div className="h-16 w-64 animate-pulse rounded-2xl bg-white/5" />
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="text-center">
          <p className="text-sm font-medium text-white/60">No messages yet</p>

          <p className="mt-1 text-xs text-white/30">
            Send a message to start the conversation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-white/30">
            <div className="flex gap-1 rounded-full bg-white/5 px-3 py-2">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
            </div>

            <span>
              {typingUsers.length === 1
                ? "Someone is typing..."
                : `${typingUsers.length} people are typing...`}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default MessageList;
