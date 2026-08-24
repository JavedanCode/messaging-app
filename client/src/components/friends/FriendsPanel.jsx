import { useState } from "react";
import { Check, UserPlus, Users, X } from "lucide-react";

import { useFriendships } from "../../context/useFriendships";
import { searchUsers } from "../../api/users";

function Person({ user, action, label, onClick, secondaryAction }) {
  const name = user.displayName || user.username;
  return (
    <div className="flex items-center gap-3 rounded-xl p-3 hover:bg-white/4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-400">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          name.charAt(0).toUpperCase()
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-white/85">{name}</p>
        <p className="truncate text-xs text-white/30">@{user.username}</p>
      </div>
      {action && (
        <button
          type="button"
          onClick={onClick}
          className="rounded-lg p-2 text-white/45 hover:bg-white/8 hover:text-white"
          aria-label={label}
          title={label}
        >
          {action}
        </button>
      )}
      {secondaryAction && (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          className="rounded-lg p-2 text-white/45 hover:bg-white/8 hover:text-white"
          aria-label={secondaryAction.label}
          title={secondaryAction.label}
        >
          {secondaryAction.icon}
        </button>
      )}
    </div>
  );
}

function FriendsPanel({ onClose }) {
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    acceptRequest,
    rejectRequest,
    remove,
    sendRequest,
  } = useFriendships();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  async function search(event) {
    const value = event.target.value;
    setQuery(value);
    if (!value.trim()) return setResults([]);
    try {
      setResults((await searchUsers(value.trim())).users);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function run(action) {
    try {
      setError("");
      await action();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/8 bg-[#11141b] shadow-2xl">
        <header className="flex items-center justify-between border-b border-white/6 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Friends</h2>
            <p className="mt-1 text-xs text-white/30">
              Manage connections and requests.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-white/35 hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 px-3">
            <UserPlus size={16} className="text-white/30" />
            <input
              value={query}
              onChange={search}
              placeholder="Find people to add..."
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
            />
          </div>
          {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
          {query &&
            results.map((result) => (
              <Person
                key={result.id}
                user={result}
                action={<UserPlus size={16} />}
                label="Send friend request"
                onClick={() => run(() => sendRequest(result.id))}
              />
            ))}
          {loading ? (
            <p className="py-8 text-center text-xs text-white/30">
              Loading friends...
            </p>
          ) : (
            <>
              {incomingRequests.length > 0 && (
                <section className="mb-5">
                  <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/35">
                    Incoming requests
                  </h3>
                  {incomingRequests.map((request) => (
                    <Person
                      key={request.id}
                      user={request.requester}
                      action={<Check size={16} />}
                      label="Accept request"
                      onClick={() => run(() => acceptRequest(request.id))}
                      secondaryAction={{
                        icon: <X size={16} />,
                        label: "Reject request",
                        onClick: () => run(() => rejectRequest(request.id)),
                      }}
                    />
                  ))}
                </section>
              )}
              {outgoingRequests.length > 0 && (
                <section className="mb-5">
                  <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/35">
                    Sent requests
                  </h3>
                  {outgoingRequests.map((request) => (
                    <Person
                      key={request.id}
                      user={request.receiver}
                      label="Pending"
                    />
                  ))}
                </section>
              )}
              <section>
                <h3 className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wider text-white/35">
                  <Users size={14} /> Friends ({friends.length})
                </h3>
                {friends.length ? (
                  friends.map((friend) => (
                    <Person
                      key={friend.id}
                      user={friend}
                      action={<X size={16} />}
                      label="Remove friend"
                      onClick={() => run(() => remove(friend.id))}
                    />
                  ))
                ) : (
                  <p className="px-2 py-6 text-center text-xs text-white/30">
                    No friends yet.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FriendsPanel;
