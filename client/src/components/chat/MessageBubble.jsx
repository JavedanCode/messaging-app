import { useEffect, useRef, useState } from "react";

import {
  Check,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { getMessageAttachmentUrl } from "../../api/messages";

function MessageBubble({ message }) {
  const { user } = useAuth();
  const { editMessage, removeMessage } = useChat();

  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const menuRef = useRef(null);
  const textareaRef = useRef(null);

  const isOwnMessage = message.senderId === user.id;
  const isTextMessage = message.type === "TEXT";

  const senderName =
    message.sender?.displayName || message.sender?.username || "Unknown user";

  useEffect(() => {
    if (!showMenu) {
      return;
    }

    function handleClickOutside(event) {
      if (!menuRef.current?.contains(event.target)) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    if (!editing) {
      return;
    }

    setEditContent(message.content || "");

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });
  }, [editing, message.content]);

  function startEditing() {
    setShowMenu(false);
    setEditContent(message.content || "");
    setEditing(true);
  }

  function cancelEditing() {
    if (saving) {
      return;
    }

    setEditing(false);
    setEditContent(message.content || "");
  }

  async function handleSaveEdit() {
    const trimmedContent = editContent.trim();

    if (!trimmedContent || saving) {
      return;
    }

    if (trimmedContent === message.content?.trim()) {
      cancelEditing();
      return;
    }

    try {
      setSaving(true);

      await editMessage(message.id, trimmedContent);

      setEditing(false);
    } catch (error) {
      console.error("Failed to edit message:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleting) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this message?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeleting(true);
      setShowMenu(false);

      await removeMessage(message.id);
    } catch (error) {
      console.error("Failed to delete message:", error);
      setDeleting(false);
    }
  }

  function handleEditKeyDown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSaveEdit();
    }
  }

  return (
    <div
      className={`group flex gap-3 ${
        isOwnMessage ? "justify-end" : "justify-start"
      }`}
    >
      {!isOwnMessage &&
        (message.sender?.avatarUrl ? (
          <img
            src={message.sender.avatarUrl}
            alt=""
            className="mt-1 h-8 w-8 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/6 text-xs font-semibold text-white/50">
            {senderName.charAt(0).toUpperCase()}
          </div>
        ))}

      <div
        className={`max-w-[75%] ${
          isOwnMessage ? "items-end" : "items-start"
        } flex flex-col`}
      >
        {!isOwnMessage && (
          <span className="mb-1 px-1 text-[11px] font-medium text-white/35">
            {senderName}
          </span>
        )}

        {editing ? (
          <div className="w-full min-w-[280px] rounded-2xl border border-indigo-400/30 bg-white/6 p-2">
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              onKeyDown={handleEditKeyDown}
              maxLength={5000}
              rows={3}
              disabled={saving}
              className="w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-white outline-none placeholder:text-white/25"
            />

            <div className="mt-2 flex items-center justify-end gap-2 border-t border-white/6 pt-2">
              <button
                type="button"
                onClick={cancelEditing}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-white/40 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
              >
                <X size={13} />
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!editContent.trim() || saving}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Check size={13} />
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div
            className={`rounded-2xl px-4 py-2.5 ${
              isOwnMessage
                ? "rounded-br-md bg-indigo-500 text-white"
                : "rounded-bl-md bg-white/6 text-white/85"
            }`}
          >
            {isTextMessage && (
              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                {message.content}
              </p>
            )}

            {!isTextMessage && <AttachmentMessage message={message} />}
          </div>
        )}

        <div
          className={`mt-1 flex items-center gap-1 px-1 text-[10px] text-white/20 ${
            isOwnMessage ? "justify-end" : "justify-start"
          }`}
        >
          <span>{formatMessageTime(message.createdAt)}</span>

          {message.updatedAt &&
            new Date(message.updatedAt).getTime() >
              new Date(message.createdAt).getTime() && <span>· edited</span>}
        </div>
      </div>

      {isOwnMessage && !editing && (
        <div ref={menuRef} className="relative mt-2">
          <button
            type="button"
            onClick={() => setShowMenu((current) => !current)}
            disabled={deleting}
            className="hidden rounded-lg p-1.5 text-white/20 transition hover:bg-white/5 hover:text-white/60 group-hover:block disabled:opacity-30"
            aria-label="Message options"
            title="Message options"
          >
            <MoreHorizontal size={15} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 z-20 min-w-32 overflow-hidden rounded-xl border border-white/8 bg-[#181b22] p-1 shadow-2xl">
              {isTextMessage && (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/65 transition hover:bg-white/5 hover:text-white"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              )}

              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-red-400 transition hover:bg-red-500/10"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {deleting && (
        <span className="mt-3 text-[10px] text-white/25">Deleting...</span>
      )}
    </div>
  );
}

function AttachmentMessage({ message }) {
  const isImage = message.type === "IMAGE";

  if (isImage) {
    return <ImageAttachment message={message} />;
  }

  return (
    <div className="flex min-w-[220px] max-w-sm items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/50">
        <Download size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">
          {message.attachmentName || "Attachment"}
        </p>

        {message.attachmentSize && (
          <p className="mt-0.5 text-xs text-white/40">
            {formatFileSize(message.attachmentSize)}
          </p>
        )}
      </div>

      <AttachmentDownloadButton message={message} />
    </div>
  );
}
function ImageAttachment({ message }) {
  const { activeConversation } = useChat();

  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadImageUrl() {
      if (!activeConversation || !message.id) {
        return;
      }

      try {
        setLoading(true);
        setError(false);

        const response = await getMessageAttachmentUrl(
          activeConversation.id,
          message.id,
        );

        if (!cancelled) {
          setUrl(response.url);
        }
      } catch (error) {
        console.error("Failed to load image attachment:", error);

        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadImageUrl();

    return () => {
      cancelled = true;
    };
  }, [activeConversation?.id, message.id]);

  useEffect(() => {
    if (!showViewer) {
      return;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setShowViewer(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showViewer]);

  function handleDownload(event) {
    event.stopPropagation();

    if (!url) {
      return;
    }

    setShowMenu(false);

    const link = document.createElement("a");

    link.href = url;
    link.download = message.attachmentName || "image";
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  if (loading) {
    return (
      <div className="flex h-48 w-64 items-center justify-center rounded-xl bg-white/5">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className="flex h-32 w-64 items-center justify-center rounded-xl bg-white/5 px-4 text-center text-xs text-white/35">
        Unable to load image.
      </div>
    );
  }

  return (
    <>
      <div className="group relative max-w-sm overflow-hidden rounded-xl">
        <button
          type="button"
          onClick={() => setShowViewer(true)}
          className="block w-full cursor-zoom-in"
          title="Open image"
        >
          <img
            src={url}
            alt={message.attachmentName || "Image attachment"}
            className="block max-h-80 max-w-full object-cover transition duration-200 group-hover:brightness-90"
          />
        </button>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-end p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <div className="pointer-events-auto relative">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowMenu((current) => !current);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
              aria-label="Image options"
              title="Image options"
            >
              <MoreHorizontal size={17} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-10 z-20 min-w-32 overflow-hidden rounded-xl border border-white/10 bg-[#181b22] p-1 shadow-2xl">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-white/70 transition hover:bg-white/5 hover:text-white"
                >
                  <Download size={14} />
                  Download
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showViewer && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 backdrop-blur-sm"
          onClick={() => setShowViewer(false)}
        >
          <button
            type="button"
            onClick={() => setShowViewer(false)}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/15 hover:text-white"
            aria-label="Close image"
          >
            <X size={20} />
          </button>

          <img
            src={url}
            alt={message.attachmentName || "Image attachment"}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] object-contain"
          />
        </div>
      )}
    </>
  );
}

function AttachmentDownloadButton({ message }) {
  const { activeConversation } = useChat();
  const [loading, setLoading] = useState(false);

  function handleDownload(event) {
    event.stopPropagation();

    if (!url) {
      return;
    }

    setShowMenu(false);

    const link = document.createElement("a");
    link.href = url;
    link.download = message.attachmentName || "image";
    link.rel = "noopener noreferrer";

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
      aria-label="Open attachment"
      title="Open attachment"
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
      ) : (
        <Download size={15} />
      )}
    </button>
  );
}

function formatMessageTime(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default MessageBubble;
