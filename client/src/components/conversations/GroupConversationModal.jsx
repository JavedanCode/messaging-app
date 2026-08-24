import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import { searchUsers } from "../../api/users";
import { useChat } from "../../context/ChatContext";

function GroupConversationModal({ onClose }) {
  const { createGroupConversation } = useChat();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) return;
    const timeout = setTimeout(
      () =>
        searchUsers(query.trim())
          .then((response) => setUsers(response.users))
          .catch((requestError) => setError(requestError.message)),
      250,
    );
    return () => clearTimeout(timeout);
  }, [query]);

  function toggleUser(user) {
    setSelected((current) =>
      current.some((item) => item.id === user.id)
        ? current.filter((item) => item.id !== user.id)
        : [...current, user],
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (!name.trim() || selected.length < 1)
      return setError("Add a group name and at least one member.");
    try {
      setSaving(true);
      await createGroupConversation(
        name.trim(),
        selected.map((user) => user.id),
      );
      onClose();
    } catch (requestError) {
      setError(requestError.message);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/8 bg-[#11141b] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-white/6 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">New group</h2>
            <p className="mt-1 text-xs text-white/30">
              Choose people to start together.
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
        <div className="space-y-4 p-5">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Group name"
            className="h-11 w-full rounded-xl border border-white/8 bg-white/4 px-3 text-sm text-white outline-none placeholder:text-white/25"
          />
          <input
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              if (!value.trim()) setUsers([]);
            }}
            placeholder="Search members"
            className="h-11 w-full rounded-xl border border-white/8 bg-white/4 px-3 text-sm text-white outline-none placeholder:text-white/25"
          />
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {users.map((user) => {
              const isSelected = selected.some((item) => item.id === user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user)}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-white/5"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/10 text-sm text-indigo-400">
                    {(user.displayName || user.username)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <span className="min-w-0 flex-1 truncate text-sm text-white/80">
                    {user.displayName || user.username}
                  </span>
                  {isSelected && (
                    <Check size={16} className="text-indigo-400" />
                  )}
                </button>
              );
            })}
          </div>
          {selected.length > 0 && (
            <p className="text-xs text-white/40">
              {selected.length} member{selected.length === 1 ? "" : "s"}{" "}
              selected
            </p>
          )}
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            disabled={saving}
            className="h-11 w-full rounded-xl bg-indigo-500 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create group"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default GroupConversationModal;
