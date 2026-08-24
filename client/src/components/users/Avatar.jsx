function Avatar({ user, className = "h-10 w-10", textClassName = "text-sm" }) {
  const label = user?.displayName || user?.username || "?";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-500/10 font-semibold text-indigo-400 ${className} ${textClassName}`}
    >
      {user?.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.nextElementSibling?.classList.remove("hidden");
          }}
        />
      ) : null}
      <span className={user?.avatarUrl ? "hidden" : ""}>{initial}</span>
      {user?.online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#11141b] ${user.online ? "bg-emerald-400" : "bg-white/25"}`}
          title={user.online ? "Online" : "Offline"}
        />
      )}
    </div>
  );
}

export default Avatar;
