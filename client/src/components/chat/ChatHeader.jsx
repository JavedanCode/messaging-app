import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Trash2, Users } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { useFriendships } from "../../context/useFriendships";

import UserProfileModal from "../users/UserProfileModal";
import Avatar from "../users/Avatar";

function ChatHeader({ conversation }) {
  const { user } = useAuth();
  const { removeConversation } = useChat();
  const { friends } = useFriendships();

  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const menuRef = useRef(null);

  const isGroup = conversation.type === "GROUP";

  const otherMember = !isGroup
    ? conversation.members.find((member) => member.user.id !== user.id)
    : null;

  const name = isGroup
    ? conversation.name
    : otherMember?.user.displayName ||
      otherMember?.user.username ||
      "Unknown user";

  const memberCount = conversation.members.length;

  const canDeleteConversation =
    !isGroup ||
    conversation.createdById === user.id ||
    conversation.members.some(
      (member) => member.user.id === user.id && member.role === "ADMIN",
    );

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

  function openDeleteConfirmation() {
    setShowMenu(false);
    setShowDeleteConfirmation(true);
  }

  function closeDeleteConfirmation() {
    if (deleting) {
      return;
    }

    setShowDeleteConfirmation(false);
  }

  async function handleDeleteConversation() {
    if (deleting) {
      return;
    }

    try {
      setDeleting(true);

      await removeConversation(conversation.id);

      setShowDeleteConfirmation(false);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      setDeleting(false);
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/6 px-5">
        <button
          type="button"
          onClick={() => {
            if (!isGroup && otherMember?.user) {
              setShowUserProfile(true);
            }
          }}
          disabled={isGroup || !otherMember?.user}
          className={`flex min-w-0 items-center gap-3 rounded-xl text-left ${
            !isGroup && otherMember?.user
              ? "cursor-pointer transition hover:bg-white/5"
              : "cursor-default"
          }`}
        >
          {!isGroup ? (
            <Avatar
              user={{
                ...otherMember?.user,
                online: friends.find(
                  (friend) => friend.id === otherMember?.user?.id,
                )?.online,
              }}
              className="h-10 w-10"
            />
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-400">
              {name?.charAt(0).toUpperCase() || "?"}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-white">
              {name}
            </h1>

            <p className="mt-0.5 flex items-center gap-1 text-xs text-white/30">
              {isGroup ? (
                <>
                  <Users size={12} />
                  {memberCount} members
                </>
              ) : (
                `@${otherMember?.user.username || "unknown"}`
              )}
            </p>
          </div>
        </button>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setShowMenu((current) => !current)}
            className="rounded-lg p-2 text-white/35 transition hover:bg-white/5 hover:text-white"
            aria-label="Conversation options"
            title="Conversation options"
          >
            <MoreHorizontal size={20} />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-11 z-30 min-w-44 overflow-hidden rounded-xl border border-white/8 bg-[#181b22] p-1 shadow-2xl">
              {canDeleteConversation && (
                <button
                  type="button"
                  onClick={openDeleteConfirmation}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-red-400 transition hover:bg-red-500/10"
                >
                  <Trash2 size={14} />
                  Delete conversation
                </button>
              )}

              {!canDeleteConversation && (
                <div className="px-3 py-2.5 text-xs text-white/30">
                  No conversation actions available.
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {showDeleteConfirmation && (
        <DeleteConversationDialog
          conversationName={name}
          deleting={deleting}
          onCancel={closeDeleteConfirmation}
          onConfirm={handleDeleteConversation}
        />
      )}

      {showUserProfile && otherMember?.user && (
        <UserProfileModal
          user={otherMember.user}
          onClose={() => setShowUserProfile(false)}
        />
      )}
    </>
  );
}

function DeleteConversationDialog({
  conversationName,
  deleting,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/8 bg-[#11141b] shadow-2xl">
        <div className="p-5">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <Trash2 size={18} />
          </div>

          <h2 className="text-sm font-semibold text-white">
            Delete conversation?
          </h2>

          <p className="mt-2 text-sm leading-6 text-white/40">
            This will permanently delete the conversation
            {conversationName ? (
              <>
                {" "}
                with <span className="text-white/65">{conversationName}</span>
              </>
            ) : null}
            . All messages in it will also be deleted.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/6 bg-white/[0.02] px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg px-3 py-2 text-xs text-white/40 transition hover:bg-white/5 hover:text-white disabled:opacity-30"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-red-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? "Deleting..." : "Delete conversation"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatHeader;
