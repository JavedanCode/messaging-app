import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AppShell from "../components/layout/AppShell";
import ChatHeader from "../components/chat/ChatHeader";
import MessageComposer from "../components/chat/MessageComposer";
import MessageList from "../components/chat/MessageList";
import ConversationList from "../components/conversations/ConversationList";
import NewConversationModal from "../components/conversations/NewConversationModal";
import GroupConversationModal from "../components/conversations/GroupConversationModal";
import FriendsPanel from "../components/friends/FriendsPanel";
import DetailsPanel from "../components/layout/DetailsPanel";
import { useAuth } from "../context/AuthContext";
import { useChat } from "../context/ChatContext";
import { useFriendships } from "../context/useFriendships";

function Chat() {
  const { activeConversation, conversationSearch, setConversationSearch } =
    useChat();
  const { user, logout } = useAuth();
  const { incomingRequests } = useFriendships();
  const navigate = useNavigate();

  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showFriends, setShowFriends] = useState(false);

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }

  function handleAccount() {
    navigate("/settings");
  }

  return (
    <>
      <AppShell
        user={user}
        onAccount={handleAccount}
        onLogout={handleLogout}
        onNewConversation={() => setShowNewConversation(true)}
        onFriends={() => setShowFriends(true)}
        pendingFriendRequests={incomingRequests.length}
        conversationSearch={conversationSearch}
        onConversationSearchChange={setConversationSearch}
        sidebar={<ConversationList />}
        main={
          <div className="flex h-full flex-col xl:flex-row">
            <div className="min-h-0 min-w-0 flex-1">
              {activeConversation ? (
                <div className="flex h-full flex-col">
                  <ChatHeader conversation={activeConversation} />
                  <MessageList />
                  <MessageComposer />
                </div>
              ) : (
                <EmptyChatState />
              )}
            </div>
            <DetailsPanel />
          </div>
        }
      />

      {showNewConversation && (
        <NewConversationModal
          onClose={() => setShowNewConversation(false)}
          onCreateGroup={() => {
            setShowNewConversation(false);
            setShowNewGroup(true);
          }}
        />
      )}

      {showNewGroup && (
        <GroupConversationModal onClose={() => setShowNewGroup(false)} />
      )}
      {showFriends && <FriendsPanel onClose={() => setShowFriends(false)} />}
    </>
  );
}

function EmptyChatState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-sm px-6 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
          <MessageCircle size={28} />
        </div>

        <h1 className="text-lg font-semibold tracking-tight">
          Your conversations
        </h1>

        <p className="mt-2 text-sm leading-6 text-white/35">
          Select a conversation to start messaging.
        </p>
      </div>
    </div>
  );
}

export default Chat;
