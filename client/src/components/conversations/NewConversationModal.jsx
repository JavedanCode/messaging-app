import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { searchUsers } from "../../api/users";
import UserProfileModal from "../users/UserProfileModal";

function NewConversationModal({ onClose, onCreateGroup }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setUsers([]);
      setSearching(false);
      setError(null);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setSearching(true);
        setError(null);

        const response = await searchUsers(trimmedQuery);

        setUsers(response.users);
      } catch (error) {
        setError(error.message);
        setUsers([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  function handleSelectUser(user) {
    setSelectedUser(user);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/8 bg-[#11141b] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">
                New conversation
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Find someone by username or name.
              </p>
            </div>

            <button
              type="button"
              onClick={onCreateGroup}
              className="mr-2 rounded-lg px-2 py-1 text-xs text-indigo-300 hover:bg-indigo-500/10"
            >
              New group
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4">
            <div className="flex h-11 items-center gap-3 rounded-xl border border-white/8 bg-white/4 px-3 focus-within:border-indigo-500/40">
              <Search size={17} className="shrink-0 text-white/30" />

              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search users..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto px-3 pb-3">
            {searching && (
              <div className="px-3 py-8 text-center text-xs text-white/30">
                Searching...
              </div>
            )}

            {!searching && query.trim() && users.length === 0 && !error && (
              <div className="px-3 py-8 text-center text-xs text-white/30">
                No users found.
              </div>
            )}

            {error && (
              <div className="px-3 py-4 text-center text-xs text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-1">
              {users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/5"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-400">
                      {getInitial(user)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/85">
                      {user.displayName || user.username}
                    </p>

                    <p className="mt-0.5 truncate text-xs text-white/30">
                      @{user.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedUser && (
        <UserProfileModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
}

function getInitial(user) {
  return (
    user.displayName?.charAt(0).toUpperCase() ||
    user.username?.charAt(0).toUpperCase() ||
    "?"
  );
}

export default NewConversationModal;
