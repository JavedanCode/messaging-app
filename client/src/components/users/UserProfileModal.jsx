import { MessageCircle, X } from "lucide-react";

import { useChat } from "../../context/ChatContext";

function UserProfileModal({ user, onClose }) {
  const { conversations, startDirectConversation, selectConversation } =
    useChat();

  if (!user) {
    return null;
  }

  const existingConversation = conversations.find(
    (conversation) =>
      conversation.type === "DIRECT" &&
      conversation.members.some((member) => member.user.id === user.id),
  );

  const initial =
    user.displayName?.charAt(0).toUpperCase() ||
    user.username?.charAt(0).toUpperCase() ||
    "?";

  async function handleMessage() {
    try {
      if (existingConversation) {
        await selectConversation(existingConversation.id);
      } else {
        await startDirectConversation(user.id);
      }

      onClose();
    } catch (error) {
      console.error("Failed to open conversation:", error);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/8 bg-[#11141b] shadow-2xl">
        <div className="flex items-center justify-end px-4 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
            aria-label="Close profile"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 text-center">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="mx-auto h-24 w-24 rounded-full object-cover ring-4 ring-white/5"
            />
          ) : (
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-500/10 text-3xl font-semibold text-indigo-400 ring-4 ring-white/5">
              {initial}
            </div>
          )}

          <h2 className="mt-5 text-lg font-semibold text-white">
            {user.displayName || user.username}
          </h2>

          <p className="mt-1 text-sm text-white/35">@{user.username}</p>

          <button
            type="button"
            onClick={handleMessage}
            className="mt-6 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-medium text-white transition hover:bg-indigo-400"
          >
            <MessageCircle size={17} />

            {existingConversation ? "Open conversation" : "Message"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
