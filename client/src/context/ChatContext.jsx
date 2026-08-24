import {
  createContext,
  useCallback,
  useEffect,
  useState,
  useContext,
} from "react";

import {
  createDirectConversation,
  createGroupConversation as createGroupConversationRequest,
  deleteConversation,
  getConversation,
  getConversations,
} from "../api/conversations";

import {
  createMessage,
  deleteMessage,
  getMessages,
  updateMessage,
  uploadAttachment,
} from "../api/messages";
import {
  addGroupMember,
  leaveGroup,
  removeGroupMember,
  updateGroupName,
  updateMemberRole,
} from "../api/conversation-members";

import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";

const ChatContext = createContext(null);

function getConversationTimestamp(conversation) {
  const timestamp = conversation.lastMessageAt || conversation.createdAt;

  if (!timestamp) {
    return 0;
  }

  const time = new Date(timestamp).getTime();

  return Number.isNaN(time) ? 0 : time;
}

function sortConversations(conversations) {
  return [...conversations].sort(
    (a, b) => getConversationTimestamp(b) - getConversationTimestamp(a),
  );
}

function normalizeConversation(conversation) {
  return {
    ...conversation,
    unreadCount: conversation.unreadCount || 0,
  };
}

function upsertConversation(conversations, conversation) {
  const normalizedConversation = normalizeConversation(conversation);

  const existingConversation = conversations.find(
    (item) => item.id === normalizedConversation.id,
  );

  if (!existingConversation) {
    return sortConversations([...conversations, normalizedConversation]);
  }

  return sortConversations(
    conversations.map((item) =>
      item.id === normalizedConversation.id
        ? {
            ...item,
            ...normalizedConversation,
          }
        : item,
    ),
  );
}

export function ChatProvider({ children }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [conversationSearch, setConversationSearch] = useState("");

  const {
    connected: socketConnected,
    joinConversation,
    leaveConversation,
    onNewMessage,
    onMessageUpdated,
    onMessageDeleted,
    onConversationUpdated,
    onConversationCreated,
    onConversationDeleted,
    onConversationMemberAdded,
    onConversationMemberRemoved,
    onConversationMemberRoleUpdated,
    onTypingStart,
    onTypingStop,
    emitTypingStart,
    emitTypingStop,
  } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  const [loadingConversations, setLoadingConversations] = useState(true);

  const [loadingMessages, setLoadingMessages] = useState(false);

  const [error, setError] = useState(null);

  /*
   * Load conversations after authentication is restored.
   */
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    async function loadConversations() {
      try {
        setLoadingConversations(true);
        setError(null);

        const response = await getConversations();

        if (cancelled) {
          return;
        }

        setConversations(
          sortConversations(response.conversations.map(normalizeConversation)),
        );
      } catch (error) {
        if (!cancelled) {
          setError(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingConversations(false);
        }
      }
    }

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  /*
   * Clear chat state after logout.
   */
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLoadingConversations(false);
      setConversations([]);
      setActiveConversation(null);
      setMessages([]);
      setTypingUsers([]);
      setError(null);
    }
  }, [authLoading, isAuthenticated]);

  /*
   * Realtime new-message handling.
   *
   * Messages are delivered through the user's personal socket room,
   * so this also works while the user is viewing another conversation.
   */
  useEffect(() => {
    const unsubscribe = onNewMessage((message) => {
      const conversationId = message.conversationId;

      const isActive = activeConversation?.id === conversationId;

      /*
       * Update the conversation preview and move it to the top.
       */
      setConversations((current) => {
        const existingConversation = current.find(
          (conversation) => conversation.id === conversationId,
        );

        /*
         * If the conversation is not currently loaded, we don't
         * have enough information to safely construct its sidebar
         * representation.
         *
         * This can happen if the conversation was created elsewhere.
         * A future realtime conversation-created event can handle
         * that case without guessing.
         */
        if (!existingConversation) {
          return current;
        }

        const updatedConversation = {
          ...existingConversation,
          lastMessageAt: message.createdAt,
          lastMessage: message,
          unreadCount: isActive
            ? 0
            : (existingConversation.unreadCount || 0) + 1,
        };

        return sortConversations([
          updatedConversation,
          ...current.filter(
            (conversation) => conversation.id !== conversationId,
          ),
        ]);
      });

      /*
       * Add the message to the active conversation only.
       *
       * Socket events are the source of truth here, so the HTTP
       * createMessage response is not inserted separately.
       */
      if (!isActive) {
        return;
      }

      setMessages((current) => {
        if (
          current.some((existingMessage) => existingMessage.id === message.id)
        ) {
          return current;
        }

        return [...current, message];
      });
    });

    return unsubscribe;
  }, [activeConversation?.id, onNewMessage]);

  /*
   * Realtime message editing.
   */
  useEffect(() => {
    const unsubscribe = onMessageUpdated((message) => {
      setConversations((current) =>
        current.map((conversation) => {
          if (
            conversation.id !== message.conversationId ||
            conversation.lastMessage?.id !== message.id
          ) {
            return conversation;
          }

          return {
            ...conversation,
            lastMessage: message,
          };
        }),
      );

      if (activeConversation?.id !== message.conversationId) {
        return;
      }

      setMessages((current) =>
        current.map((existingMessage) =>
          existingMessage.id === message.id ? message : existingMessage,
        ),
      );
    });

    return unsubscribe;
  }, [activeConversation?.id, onMessageUpdated]);

  /*
   * Realtime message deletion.
   */
  useEffect(() => {
    const unsubscribe = onMessageDeleted(({ messageId, conversationId }) => {
      setConversations((current) =>
        current.map((conversation) => {
          if (
            conversation.id !== conversationId ||
            conversation.lastMessage?.id !== messageId
          ) {
            return conversation;
          }

          return {
            ...conversation,
            lastMessage: null,
          };
        }),
      );

      if (activeConversation?.id !== conversationId) {
        return;
      }

      setMessages((current) =>
        current.filter((message) => message.id !== messageId),
      );
    });

    return unsubscribe;
  }, [activeConversation?.id, onMessageDeleted]);

  /*
   * Realtime conversation updates.
   */
  useEffect(() => {
    const unsubscribe = onConversationUpdated(
      ({ conversationId, conversation }) => {
        setConversations((current) => {
          const existing = current.find((item) => item.id === conversationId);

          return sortConversations(
            current
              .map((item) =>
                item.id === conversationId
                  ? {
                      ...item,
                      ...conversation,
                      unreadCount: existing?.unreadCount || 0,
                    }
                  : item,
              )
              .filter(
                (item) =>
                  item.id !== conversationId || item.id === conversationId,
              ),
          );
        });

        if (activeConversation?.id !== conversationId) {
          return;
        }

        setActiveConversation((current) =>
          current ? { ...current, ...conversation } : current,
        );
      },
    );

    return unsubscribe;
  }, [activeConversation?.id, onConversationUpdated]);

  useEffect(() => {
    const unsubscribe = onConversationCreated(({ conversation }) => {
      if (!conversation) return;

      setConversations((current) => upsertConversation(current, conversation));
    });

    return unsubscribe;
  }, [onConversationCreated]);

  useEffect(() => {
    const unsubscribe = onConversationDeleted(({ conversationId }) => {
      setConversations((current) =>
        current.filter((conversation) => conversation.id !== conversationId),
      );

      if (activeConversation?.id !== conversationId) return;

      setActiveConversation(null);
      setMessages([]);
      setTypingUsers([]);
    });

    return unsubscribe;
  }, [activeConversation?.id, onConversationDeleted]);

  useEffect(() => {
    const unsubscribeAdded = onConversationMemberAdded(
      ({ conversationId, member }) => {
        setConversations((current) =>
          current.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            const members = conversation.members ?? [];

            return {
              ...conversation,
              members: members.some(
                (existingMember) => existingMember.userId === member.userId,
              )
                ? members
                : [...members, member],
            };
          }),
        );

        if (activeConversation?.id !== conversationId) {
          return;
        }

        setActiveConversation((current) => {
          if (!current || current.id !== conversationId) {
            return current;
          }

          const members = current.members ?? [];

          return {
            ...current,
            members: members.some(
              (existingMember) => existingMember.userId === member.userId,
            )
              ? members
              : [...members, member],
          };
        });
      },
    );

    const unsubscribeRemoved = onConversationMemberRemoved(
      ({ conversationId, userId }) => {
        setConversations((current) =>
          current.map((conversation) => {
            if (conversation.id !== conversationId) {
              return conversation;
            }

            return {
              ...conversation,
              members: (conversation.members ?? []).filter(
                (existingMember) => existingMember.userId !== userId,
              ),
            };
          }),
        );

        if (activeConversation?.id !== conversationId) {
          return;
        }

        setActiveConversation((current) => {
          if (!current || current.id !== conversationId) {
            return current;
          }

          return {
            ...current,
            members: (current.members ?? []).filter(
              (existingMember) => existingMember.userId !== userId,
            ),
          };
        });
      },
    );

    return () => {
      unsubscribeAdded();
      unsubscribeRemoved();
    };
  }, [
    activeConversation?.id,
    onConversationMemberAdded,
    onConversationMemberRemoved,
  ]);

  useEffect(() => {
    const unsubscribe = onConversationMemberRoleUpdated(
      ({ conversationId, member }) => {
        const updateMembers = (conversation) =>
          conversation.id !== conversationId
            ? conversation
            : {
                ...conversation,
                members: (conversation.members ?? []).map((existingMember) =>
                  existingMember.userId === member.userId
                    ? { ...existingMember, ...member }
                    : existingMember,
                ),
              };

        setConversations((current) => current.map(updateMembers));
        setActiveConversation((current) =>
          current ? updateMembers(current) : current,
        );
      },
    );

    return unsubscribe;
  }, [onConversationMemberRoleUpdated]);

  /*
   * Realtime typing indicators.
   */
  useEffect(() => {
    const unsubscribeStart = onTypingStart(({ conversationId, userId }) => {
      if (activeConversation?.id !== conversationId) {
        return;
      }

      setTypingUsers((current) =>
        current.includes(userId) ? current : [...current, userId],
      );
    });

    const unsubscribeStop = onTypingStop(({ conversationId, userId }) => {
      if (activeConversation?.id !== conversationId) {
        return;
      }

      setTypingUsers((current) => current.filter((id) => id !== userId));
    });

    return () => {
      unsubscribeStart();
      unsubscribeStop();
    };
  }, [activeConversation?.id, onTypingStart, onTypingStop]);

  /*
   * Select and load a conversation.
   */
  const selectConversation = useCallback(
    async (conversationId) => {
      if (activeConversation?.id === conversationId) {
        return;
      }

      setLoadingMessages(true);
      setError(null);
      setTypingUsers([]);

      try {
        if (activeConversation) {
          leaveConversation(activeConversation.id);
        }

        await joinConversation(conversationId);

        const [conversationResponse, messagesResponse] = await Promise.all([
          getConversation(conversationId),
          getMessages(conversationId),
        ]);

        const conversation = conversationResponse.conversation;

        setActiveConversation(conversation);

        /*
         * The API returns newest first. The UI displays oldest
         * to newest, so reverse the result once here.
         */
        setMessages([...messagesResponse.messages].reverse());

        /*
         * Selecting a conversation marks it as read.
         */
        setConversations((current) =>
          sortConversations(
            current.map((existingConversation) =>
              existingConversation.id === conversationId
                ? {
                    ...existingConversation,
                    ...conversation,
                    unreadCount: 0,
                  }
                : existingConversation,
            ),
          ),
        );
      } catch (error) {
        setError(error.message);
        throw error;
      } finally {
        setLoadingMessages(false);
      }
    },
    [activeConversation, joinConversation, leaveConversation],
  );

  /*
   * Start or open a direct conversation.
   */
  async function startDirectConversation(userId) {
    const response = await createDirectConversation(userId);

    const conversation = response.conversation;

    setConversations((current) =>
      upsertConversation(current, {
        ...conversation,
        unreadCount: 0,
      }),
    );

    await selectConversation(conversation.id);

    return conversation;
  }

  async function createGroupConversation(name, userIds) {
    const response = await createGroupConversationRequest(name, userIds);
    const conversation = response.conversation;

    setConversations((current) =>
      upsertConversation(current, { ...conversation, unreadCount: 0 }),
    );
    await selectConversation(conversation.id);
    return conversation;
  }

  async function renameGroup(conversationId, name) {
    await updateGroupName(conversationId, name);
  }

  async function addMember(conversationId, userId) {
    await addGroupMember(conversationId, userId);
  }

  async function removeMember(conversationId, userId) {
    await removeGroupMember(conversationId, userId);
  }

  async function changeMemberRole(conversationId, userId, role) {
    await updateMemberRole(conversationId, userId, role);
  }

  async function leaveConversationGroup(conversationId) {
    await leaveGroup(conversationId);
    clearActiveConversation();
    setConversations((current) =>
      current.filter((conversation) => conversation.id !== conversationId),
    );
  }

  /*
   * Delete a conversation.
   */
  async function removeConversation(conversationId) {
    await deleteConversation(conversationId);

    if (activeConversation?.id === conversationId) {
      leaveConversation(conversationId);

      setActiveConversation(null);
      setMessages([]);
      setTypingUsers([]);
    }

    setConversations((current) =>
      current.filter((conversation) => conversation.id !== conversationId),
    );
  }

  /*
   * Send a text message.
   *
   * The socket event updates local state after the backend
   * successfully creates the message.
   */
  async function sendMessage(content) {
    if (!activeConversation) {
      throw new Error("No conversation selected.");
    }

    const response = await createMessage(activeConversation.id, content);

    return response.message;
  }

  /*
   * Edit a message.
   */
  async function editMessage(messageId, content) {
    if (!activeConversation) {
      throw new Error("No conversation selected.");
    }

    const response = await updateMessage(
      activeConversation.id,
      messageId,
      content,
    );

    return response.message;
  }

  /*
   * Delete a message.
   */
  async function removeMessage(messageId) {
    if (!activeConversation) {
      throw new Error("No conversation selected.");
    }

    await deleteMessage(activeConversation.id, messageId);
  }

  /*
   * Send an attachment.
   */
  async function sendAttachment(file) {
    if (!activeConversation) {
      throw new Error("No conversation selected.");
    }

    const response = await uploadAttachment(activeConversation.id, file);

    return response.message;
  }

  /*
   * Typing indicators.
   */
  function startTyping() {
    if (!activeConversation) {
      return;
    }

    emitTypingStart(activeConversation.id);
  }

  function stopTyping() {
    if (!activeConversation) {
      return;
    }

    emitTypingStop(activeConversation.id);
  }

  /*
   * Clear the active conversation.
   */
  function clearActiveConversation() {
    if (activeConversation) {
      leaveConversation(activeConversation.id);
    }

    setActiveConversation(null);
    setMessages([]);
    setTypingUsers([]);
    setError(null);
  }

  const filteredConversations = conversations.filter((conversation) => {
    const query = conversationSearch.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const isGroup = conversation.type === "GROUP";

    const otherMember = !isGroup
      ? conversation.members.find((member) => member.user.id !== user?.id)?.user
      : null;

    const searchableText = [
      isGroup ? conversation.name : "",
      otherMember?.displayName,
      otherMember?.username,
      conversation.lastMessage?.content,
      conversation.lastMessage?.attachmentName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(query);
  });

  const value = {
    conversations,
    filteredConversations,
    conversationSearch,
    setConversationSearch,

    activeConversation,
    messages,
    typingUsers,

    loadingConversations,
    loadingMessages,

    socketConnected,
    error,

    selectConversation,
    startDirectConversation,
    createGroupConversation,
    renameGroup,
    addMember,
    removeMember,
    changeMemberRole,
    leaveConversationGroup,
    removeConversation,
    clearActiveConversation,

    sendMessage,
    editMessage,
    removeMessage,
    sendAttachment,

    startTyping,
    stopTyping,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChat must be used within a ChatProvider.");
  }

  return context;
}
