import { useEffect, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";

import AuthInput from "../components/auth/AuthInput";
import AuthLayout from "../components/auth/AuthLayout";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const DEMO_EMAIL = "demo@javedanchat.com";
const DEMO_PASSWORD = "DemoPassword123!";

function Login() {
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const oauthError = searchParams.get("oauthError");

    if (oauthError === "OAUTH_ACCOUNT_LINK_REQUIRED") {
      setError(
        "An account with this email already exists. Sign in with your existing account, then link Google or GitHub from Account Settings.",
      );
    } else if (oauthError === "OAUTH_EMAIL_REQUIRED") {
      setError("Your OAuth account does not provide a usable email address.");
    } else if (oauthError === "OAUTH_STATE_INVALID") {
      setError(
        "The OAuth sign-in session expired or is invalid. Please try again.",
      );
    } else if (oauthError === "OAUTH_AUTHENTICATION_FAILED") {
      setError("We couldn't complete OAuth sign-in. Please try again.");
    }
  }, [searchParams]);

  async function handleDemoLogin() {
    setError("");
    setSubmitting(true);

    try {
      await login({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      navigate("/");
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  }

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
      await login(form);
      navigate("/");
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
      title="Welcome back"
      subtitle="Sign in to continue to your conversations."
      footer={
        <p className="text-center text-sm text-white/35">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-indigo-400 transition hover:text-indigo-300"
          >
            Create one
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
          label="Email"
          id="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          autoComplete="email"
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium text-white/75"
            >
              Password
            </label>

            <Link
              to="/forgot-password"
              className="text-xs font-medium text-indigo-400 transition hover:text-indigo-300"
            >
              Forgot password?
            </Link>
          </div>

          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            className="h-11 w-full rounded-xl border border-white/10 bg-white/4 px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-indigo-400/60 focus:bg-white/6 focus:ring-2 focus:ring-indigo-400/10"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            <>
              Sign in
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

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={submitting}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-indigo-400/20 bg-indigo-500/8 text-sm font-medium text-indigo-300 transition hover:border-indigo-400/30 hover:bg-indigo-500/12 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <LoaderCircle size={18} className="animate-spin" />
          ) : (
            "Try the demo"
          )}
        </button>
      </div>
    </AuthLayout>
  );
}

export default Login;
