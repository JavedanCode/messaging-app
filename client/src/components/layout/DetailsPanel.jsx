import { useState } from "react";
import { Check, Crown, LogOut, Pencil, UserMinus } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { searchUsers } from "../../api/users";

function DetailsPanel() {
  const { user } = useAuth();
  const {
    activeConversation,
    renameGroup,
    addMember,
    removeMember,
    changeMemberRole,
    leaveConversationGroup,
  } = useChat();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  if (!activeConversation)
    return (
      <aside className="hidden w-[300px] shrink-0 border-l border-white/6 bg-[#15181e] xl:flex xl:flex-col">
        <div className="border-b border-white/6 px-5 py-4">
          <h2 className="text-sm font-semibold">Details</h2>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-sm text-white/35">
            Select a conversation to see details.
          </p>
        </div>
      </aside>
    );

  const isGroup = activeConversation.type === "GROUP";
  const currentMember = activeConversation.members.find(
    (member) => (member.userId || member.user?.id) === user.id,
  );
  const isAdmin = currentMember?.role === "ADMIN";

  async function findMembers(event) {
    const value = event.target.value;
    setSearch(value);
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

  if (!isGroup) {
    const other = activeConversation.members.find(
      (member) => member.user.id !== user.id,
    )?.user;
    return (
      <aside className="hidden w-[300px] shrink-0 border-l border-white/6 bg-[#15181e] xl:flex xl:flex-col">
        <div className="border-b border-white/6 px-5 py-4">
          <h2 className="text-sm font-semibold">Contact</h2>
        </div>
        <div className="p-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-xl text-indigo-400">
            {(other?.displayName || other?.username || "?")
              .charAt(0)
              .toUpperCase()}
          </div>
          <p className="mt-3 text-sm text-white/80">
            {other?.displayName || other?.username}
          </p>
          <p className="mt-1 text-xs text-white/30">@{other?.username}</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden w-[300px] shrink-0 border-l border-white/6 bg-[#15181e] xl:flex xl:flex-col">
      <div className="border-b border-white/6 px-5 py-4">
        <h2 className="text-sm font-semibold">Group details</h2>
        <p className="mt-1 text-xs text-white/30">
          {activeConversation.members.length} members
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {isAdmin && (
          <form
            className="mb-5 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim())
                run(() =>
                  renameGroup(activeConversation.id, name.trim()).then(() =>
                    setName(""),
                  ),
                );
            }}
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={activeConversation.name || "Group name"}
              className="min-w-0 flex-1 rounded-lg border border-white/8 bg-white/4 px-2.5 py-2 text-xs text-white outline-none"
            />
            <button
              type="submit"
              aria-label="Rename group"
              title="Rename group"
              className="rounded-lg p-2 text-indigo-300 hover:bg-indigo-500/10"
            >
              <Pencil size={14} />
            </button>
          </form>
        )}
        {isAdmin && (
          <div className="mb-5">
            <input
              value={search}
              onChange={findMembers}
              placeholder="Add a member"
              className="mb-2 h-9 w-full rounded-lg border border-white/8 bg-white/4 px-2.5 text-xs text-white outline-none"
            />
            {results.map((result) => (
              <button
                key={result.id}
                type="button"
                onClick={() =>
                  run(() => addMember(activeConversation.id, result.id))
                }
                className="flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs text-white/70 hover:bg-white/5"
              >
                <span className="flex-1 truncate">
                  {result.displayName || result.username}
                </span>
                <Check size={14} />
              </button>
            ))}
          </div>
        )}
        <div className="space-y-1">
          {activeConversation.members.map((member) => {
            const memberUser = member.user;
            const memberId = member.userId || memberUser?.id;
            const isCurrentUser = memberId === user.id;
            return (
              <div
                key={memberId}
                className="flex items-center gap-2 rounded-lg p-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-xs text-indigo-400">
                  {(memberUser?.displayName || memberUser?.username || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-white/75">
                    {memberUser?.displayName ||
                      memberUser?.username ||
                      memberId}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {member.role === "ADMIN" ? "Admin" : "Member"}
                  </p>
                </div>
                {member.role === "ADMIN" && (
                  <Crown size={13} className="text-amber-300" />
                )}
                {isAdmin && !isCurrentUser && (
                  <button
                    type="button"
                    onClick={() =>
                      run(() =>
                        changeMemberRole(
                          activeConversation.id,
                          memberId,
                          member.role === "ADMIN" ? "MEMBER" : "ADMIN",
                        ),
                      )
                    }
                    aria-label="Change member role"
                    title="Change member role"
                    className="text-white/30 hover:text-white"
                  >
                    <Crown size={13} />
                  </button>
                )}
                {isAdmin && !isCurrentUser && (
                  <button
                    type="button"
                    onClick={() =>
                      run(() => removeMember(activeConversation.id, memberId))
                    }
                    aria-label="Remove member"
                    title="Remove member"
                    className="text-white/30 hover:text-red-400"
                  >
                    <UserMinus size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </div>
      <button
        type="button"
        onClick={() => run(() => leaveConversationGroup(activeConversation.id))}
        className="m-4 flex items-center justify-center gap-2 rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10"
      >
        <LogOut size={14} /> Leave group
      </button>
    </aside>
  );
}

export default DetailsPanel;
