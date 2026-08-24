import { MessageCircle, Settings, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="flex w-[72px] shrink-0 flex-col items-center border-r border-white/6 bg-[#0d0f13] py-4">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500 text-white"
        aria-label="Messages"
        title="Messages"
      >
        <MessageCircle size={20} strokeWidth={2.2} />
      </button>

      <nav className="mt-8 flex flex-1 flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/5 hover:text-white"
          aria-label="Account settings"
          title="Account settings"
        >
          <User size={20} />
        </button>

        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/5 hover:text-white"
          aria-label="Settings"
          title="Settings"
        >
          <Settings size={20} />
        </button>
      </nav>
    </aside>
  );
}

export default Sidebar;
