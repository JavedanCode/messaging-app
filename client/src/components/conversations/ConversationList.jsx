import { MessageCircle } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import Avatar from "../users/Avatar";
import { useChat } from "../../context/ChatContext";
import { useFriendships } from "../../context/useFriendships";

function ConversationList() {
  const {
    filteredConversations,
    activeConversation,
    selectConversation,
    loadingConversations,
    conversationSearch,
  } = useChat();

  const { user } = useAuth();
  const { friends } = useFriendships();

  if (loadingConversations) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 rounded-xl p-3">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-white/5" />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-28 animate-pulse rounded bg-white/5" />
              <div className="h-2.5 w-40 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    if (conversationSearch.trim()) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/4 text-white/25">
            <MessageCircle size={21} />
          </div>

          <p className="text-sm font-medium text-white/60">
            No conversations found
          </p>

          <p className="mt-1 text-xs leading-5 text-white/30">
            Try searching for a name, username, or message.
          </p>
        </div>
      );
    }

    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/4 text-white/25">
          <MessageCircle size={21} />
        </div>

        <p className="text-sm font-medium text-white/60">
          No conversations yet
        </p>

        <p className="mt-1 text-xs leading-5 text-white/30">
          Click + above to start a conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-3">
      {filteredConversations.map((conversation) => {
        const isActive = activeConversation?.id === conversation.id;

        const isGroup = conversation.type === "GROUP";

        const title = isGroup
          ? conversation.name || "Unnamed group"
          : getDirectConversationName(conversation, user?.id);

        const unreadCount = conversation.unreadCount || 0;

        const lastMessage = conversation.lastMessage;

        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => selectConversation(conversation.id)}
            className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
              isActive ? "bg-indigo-500/12" : "hover:bg-white/4"
            }`}
          >
            {!isGroup ? (
              <Avatar
                user={{
                  ...getDirectConversationMember(conversation, user?.id)?.user,
                  online: friends.find(
                    (friend) =>
                      friend.id ===
                      getDirectConversationMember(conversation, user?.id)?.user
                        ?.id,
                  )?.online,
                }}
                className="h-11 w-11"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-400">
                {getConversationInitial(conversation, user?.id)}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`truncate text-sm font-medium ${
                    isActive
                      ? "text-white"
                      : unreadCount > 0
                        ? "text-white"
                        : "text-white/80"
                  }`}
                >
                  {title}
                </span>

                <div className="flex shrink-0 items-center gap-2">
                  {conversation.lastMessageAt && (
                    <span
                      className={`text-[10px] ${
                        unreadCount > 0 ? "text-indigo-400" : "text-white/25"
                      }`}
                    >
                      {formatConversationTime(conversation.lastMessageAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-1 flex items-center gap-2">
                <p
                  className={`min-w-0 flex-1 truncate text-xs ${
                    unreadCount > 0
                      ? "font-medium text-white/60"
                      : "text-white/30"
                  }`}
                >
                  {getLastMessagePreview(lastMessage, isGroup, user?.id)}
                </p>

                {unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getDirectConversationMember(conversation, currentUserId) {
  return conversation.members.find(
    (member) => member.user.id !== currentUserId,
  );
}

function getDirectConversationName(conversation, currentUserId) {
  const member = getDirectConversationMember(conversation, currentUserId);

  return member?.user?.displayName || member?.user?.username || "Unknown user";
}

function getConversationInitial(conversation, currentUserId) {
  const name =
    conversation.type === "GROUP"
      ? conversation.name
      : getDirectConversationName(conversation, currentUserId);

  return name?.charAt(0).toUpperCase() || "?";
}

function getLastMessagePreview(message, isGroup, currentUserId) {
  if (!message) {
    return isGroup ? "No messages yet" : "No messages yet";
  }

  const prefix =
    isGroup && message.sender?.id === currentUserId
      ? "You: "
      : isGroup && message.sender?.displayName
        ? `${message.sender.displayName}: `
        : message.sender?.id === currentUserId
          ? "You: "
          : "";

  if (message.type === "TEXT") {
    return `${prefix}${message.content || ""}`;
  }

  if (message.type === "IMAGE") {
    return `${prefix}Photo`;
  }

  if (message.type === "FILE") {
    return `${prefix}${message.attachmentName || "File"}`;
  }

  return `${prefix}Message`;
}

function formatConversationTime(timestamp) {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export default ConversationList;
