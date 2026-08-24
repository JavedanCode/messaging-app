import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL;

export function SocketProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    const socket = io(SOCKET_URL, {
      withCredentials: true,
    });

    socketRef.current = socket;

    function handleConnect() {
      setConnected(true);
    }

    function handleDisconnect() {
      setConnected(false);
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);

      socket.disconnect();

      socketRef.current = null;
      setConnected(false);
    };
  }, [authLoading, isAuthenticated]);

  function joinConversation(conversationId) {
    const socket = socketRef.current;

    if (!socket?.connected) {
      return Promise.reject(new Error("Socket is not connected."));
    }

    return new Promise((resolve, reject) => {
      socket.emit("conversation:join", conversationId, (response) => {
        if (!response?.success) {
          reject(
            new Error(response?.message || "Failed to join the conversation."),
          );

          return;
        }

        resolve(response);
      });
    });
  }

  function leaveConversation(conversationId) {
    const socket = socketRef.current;

    if (!socket?.connected) {
      return;
    }

    socket.emit("conversation:leave", conversationId);
  }

  function emitTypingStart(conversationId) {
    socketRef.current?.emit("typing:start", conversationId);
  }

  function emitTypingStop(conversationId) {
    socketRef.current?.emit("typing:stop", conversationId);
  }

  function subscribe(event, callback) {
    const socket = socketRef.current;

    if (!socket) {
      return () => {};
    }

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }

  const value = {
    connected,

    joinConversation,
    leaveConversation,

    emitTypingStart,
    emitTypingStop,

    onNewMessage: (callback) => subscribe("message:new", callback),

    onMessageUpdated: (callback) => subscribe("message:updated", callback),

    onMessageDeleted: (callback) => subscribe("message:deleted", callback),

    onFriendRequest: (callback) => subscribe("friendship:request", callback),

    onFriendRequestAccepted: (callback) =>
      subscribe("friendship:accepted", callback),

    onFriendRequestRejected: (callback) =>
      subscribe("friendship:rejected", callback),

    onFriendRemoved: (callback) => subscribe("friendship:removed", callback),

    onConversationUpdated: (callback) =>
      subscribe("conversation:updated", callback),

    onConversationMemberAdded: (callback) =>
      subscribe("conversation:member:added", callback),

    onConversationMemberRemoved: (callback) =>
      subscribe("conversation:member:removed", callback),

    onConversationMemberRoleUpdated: (callback) =>
      subscribe("conversation:member:role:updated", callback),

    onPresenceOnline: (callback) => subscribe("presence:online", callback),

    onPresenceOffline: (callback) => subscribe("presence:offline", callback),

    onTypingStart: (callback) => subscribe("typing:start", callback),

    onTypingStop: (callback) => subscribe("typing:stop", callback),
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider.");
  }

  return context;
}
