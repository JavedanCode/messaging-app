import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

import { useChat } from "../../context/ChatContext";
import { uploadAttachment } from "../../api/messages";

function MessageComposer() {
  const { activeConversation, sendMessage, startTyping, stopTyping } =
    useChat();

  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      stopTyping();
    };
  }, [activeConversation?.id]);

  useEffect(() => {
    if (!showEmojiPicker) {
      return;
    }

    function handleClickOutside(event) {
      if (!emojiPickerRef.current?.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setShowEmojiPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showEmojiPicker]);

  function handleChange(event) {
    const value = event.target.value;

    setContent(value);

    if (!value.trim()) {
      stopTyping();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      return;
    }

    startTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, 1500);
  }

  function handleEmojiClick(emojiData) {
    const textarea = textareaRef.current;

    if (!textarea) {
      setContent((current) => current + emojiData.emoji);
      return;
    }

    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;

    const newContent =
      content.slice(0, start) + emojiData.emoji + content.slice(end);

    setContent(newContent);

    requestAnimationFrame(() => {
      textarea.focus();

      const cursorPosition = start + emojiData.emoji.length;

      textarea.setSelectionRange(cursorPosition, cursorPosition);
    });

    if (newContent.trim()) {
      startTyping();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 1500);
    }

    setShowEmojiPicker(false);
  }
  async function handleFileChange(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file || uploading) {
      return;
    }

    const MAX_FILE_SIZE = 4 * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE) {
      setAttachmentError("Files must be smaller than 4 MB.");
      return;
    }

    setAttachmentError("");
    setUploading(true);

    try {
      await uploadAttachment(activeConversation.id, file);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    } catch (error) {
      console.error("Failed to upload attachment:", error);
      setAttachmentError(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent || sending) {
      return;
    }

    try {
      setSending(true);

      stopTyping();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      await sendMessage(trimmedContent);

      setContent("");

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key !== "Enter") {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();

    handleSubmit(event);
  }

  if (!activeConversation) {
    return null;
  }

  return (
    <div className="shrink-0 border-t border-white/6 bg-[#0c0f15] px-5 py-4">
      {attachmentError && (
        <div className="mx-auto mb-3 flex max-w-4xl items-center justify-between gap-3 rounded-xl border border-red-400/15 bg-red-400/8 px-3 py-2.5 text-xs text-red-300">
          <span>{attachmentError}</span>

          <button
            type="button"
            onClick={() => setAttachmentError("")}
            className="shrink-0 text-red-300/60 transition hover:text-red-200"
            aria-label="Dismiss attachment error"
          >
            ×
          </button>
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-4xl items-end gap-2"
      >
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/30 transition hover:bg-white/5 hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Attach file"
          title="Attach file"
        >
          {uploading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
          ) : (
            <Paperclip size={19} />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="relative flex min-h-11 flex-1 items-end rounded-2xl border border-white/6 bg-white/4 px-3 transition focus-within:border-white/10 focus-within:bg-white/5">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            rows={1}
            maxLength={5000}
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-3 text-sm leading-5 text-white outline-none placeholder:text-white/25"
          />

          <div ref={emojiPickerRef} className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker((current) => !current)}
              className={`mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                showEmojiPicker
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "text-white/25 hover:bg-white/5 hover:text-white/70"
              }`}
              aria-label="Add emoji"
              aria-expanded={showEmojiPicker}
            >
              <Smile size={18} />
            </button>

            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 z-40">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  height={400}
                  width={340}
                  searchDisabled={false}
                  previewConfig={{
                    showPreview: false,
                  }}
                  skinTonesDisabled
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!content.trim() || sending || uploading}
          className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Send message"
        >
          <Send size={17} />
        </button>
      </form>

      <p className="mx-auto mt-2 max-w-4xl px-12 text-[10px] text-white/15">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}

export default MessageComposer;
