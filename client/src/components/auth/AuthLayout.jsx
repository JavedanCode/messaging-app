import { MessageCircle } from "lucide-react";

function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="flex min-h-screen bg-[#0b0d11] text-white">
      <section className="relative hidden flex-1 overflow-hidden lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.18),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(139,92,246,0.12),transparent_35%)]" />

        <div className="relative flex w-full flex-col justify-between p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500">
              <MessageCircle size={21} strokeWidth={2.3} />
            </div>

            <span className="text-lg font-semibold tracking-tight">
              Messaging
            </span>
          </div>

          <div className="max-w-lg">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-indigo-400">
              Stay connected
            </p>

            <h2 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              Conversations that feel like they belong to you.
            </h2>

            <p className="mt-6 max-w-md text-base leading-7 text-white/45">
              A fast, simple place to keep your conversations, groups, and
              shared moments together.
            </p>
          </div>

          <p className="text-sm text-white/25">
            Built with React, Node.js, PostgreSQL & Socket.IO.
          </p>
        </div>
      </section>

      <section className="flex w-full items-center justify-center px-6 py-12 sm:px-10 lg:w-[520px] lg:shrink-0 xl:w-[560px]">
        <div className="w-full max-w-[380px]">
          <div className="mb-8 lg:hidden">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500">
                <MessageCircle size={21} strokeWidth={2.3} />
              </div>

              <span className="text-lg font-semibold tracking-tight">
                Messaging
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>

            <p className="mt-2 text-sm leading-6 text-white/40">{subtitle}</p>
          </div>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8">{footer}</div>}
        </div>
      </section>
    </main>
  );
}

export default AuthLayout;
