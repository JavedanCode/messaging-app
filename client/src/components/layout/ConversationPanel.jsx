function ConversationPanel() {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-r border-white/6 bg-[#15181e]">
      <div className="border-b border-white/6 px-5 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Messages</h1>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <p className="text-sm text-white/35">
          Your conversations will appear here.
        </p>
      </div>
    </aside>
  );
}

export default ConversationPanel;
