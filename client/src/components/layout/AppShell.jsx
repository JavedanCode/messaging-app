import { useState } from "react";
import {
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Settings,
  User,
  X,
  Users,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

function AppShell({
  user,
  sidebar,
  main,
  onNewConversation,
  onFriends,
  onLogout,
  onAccount,
  conversationSearch,
  onConversationSearchChange,
}) {
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const navigate = useNavigate();

  const displayName = user?.displayName || user?.username || "Account";

  const initial = displayName.charAt(0).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <div className="mx-auto flex h-screen max-w-[1800px] overflow-hidden border-x border-white/5">
        <aside className="flex w-[320px] shrink-0 flex-col border-r border-white/6 bg-[#101218]">
          <div className="flex h-16 items-center justify-between border-b border-white/6 px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
                <MessageCircle size={20} />
              </div>

              <span className="text-sm font-semibold tracking-tight">
                JavedanChat
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onNewConversation}
                className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
                aria-label="New conversation"
                title="New conversation"
              >
                <Plus size={19} />
              </button>

              <button
                type="button"
                onClick={onFriends}
                className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
                aria-label="Friends"
                title="Friends"
              >
                <Users size={18} />
              </button>

              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
                aria-label="Settings"
                title="Settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          <div className="border-b border-white/6 p-4">
            <div className="flex h-10 items-center gap-2 rounded-xl border border-white/6 bg-white/4 px-3 transition focus-within:border-indigo-500/30">
              <Search size={17} className="shrink-0 text-white/30" />

              <input
                type="text"
                value={conversationSearch}
                onChange={(event) =>
                  onConversationSearchChange(event.target.value)
                }
                placeholder="Search conversations..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
                aria-label="Search conversations"
              />

              {conversationSearch && (
                <button
                  type="button"
                  onClick={() => onConversationSearchChange("")}
                  className="shrink-0 rounded-md p-1 text-white/25 transition hover:bg-white/5 hover:text-white/60"
                  aria-label="Clear conversation search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1">{sidebar}</div>

          <div className="relative border-t border-white/6 p-3">
            {showAccountMenu && (
              <div className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-xl border border-white/8 bg-[#181b22] p-1 shadow-2xl">
                <button
                  type="button"
                  onClick={onAccount}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-white/60 transition hover:bg-white/5 hover:text-white"
                >
                  <User size={16} />
                  <span>Account</span>
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10"
                  onClick={onLogout}
                >
                  <LogOut size={16} />

                  <span>Log out</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAccountMenu((current) => !current)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-white/5"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-400">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/80">
                  {displayName}
                </p>

                <p className="truncate text-xs text-white/30">
                  @{user?.username}
                </p>
              </div>
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 bg-[#0c0f15]">{main}</main>
      </div>
    </div>
  );
}

export default AppShell;
