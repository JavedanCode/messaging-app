import { useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import AuthInput from "../components/auth/AuthInput";
import AuthLayout from "../components/auth/AuthLayout";
import { useAuth } from "../context/AuthContext";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await register(form);
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleOAuthLogin(provider) {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/${provider}`;
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join the conversation and start connecting."
      footer={
        <p className="text-center text-sm text-white/35">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-indigo-400 transition hover:text-indigo-300"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-400/15 bg-red-400/8 px-4 py-3 text-sm leading-5 text-red-300">
            {error}
          </div>
        )}

        <AuthInput
          label="Username"
          id="username"
          value={form.username}
          onChange={handleChange}
          placeholder="yourusername"
          autoComplete="username"
        />

        <AuthInput
          label="Display name"
          id="displayName"
          value={form.displayName}
          onChange={handleChange}
          placeholder="Your name"
          autoComplete="name"
        />

        <AuthInput
          label="Email"
          id="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <AuthInput
          label="Password"
          id="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Create a password"
          autoComplete="new-password"
        />

        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <>
              Create account
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/8" />
        <span className="text-xs text-white/25">OR</span>
        <div className="h-px flex-1 bg-white/8" />
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleOAuthLogin("google")}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-white/3 text-sm font-medium text-white/70 transition hover:bg-white/6 hover:text-white"
        >
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => handleOAuthLogin("github")}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-white/10 bg-white/3 text-sm font-medium text-white/70 transition hover:bg-white/6 hover:text-white"
        >
          Continue with GitHub
        </button>
      </div>
    </AuthLayout>
  );
}

export default Register;
