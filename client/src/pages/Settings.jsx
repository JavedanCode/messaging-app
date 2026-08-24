import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronRight,
  Image,
  KeyRound,
  Mail,
  Save,
  Shield,
  Trash2,
  User,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { getCurrentUser } from "../api/auth";
import {
  changePassword,
  changeUsername,
  confirmEmailChange,
  deleteAccount,
  linkGitHubAccount,
  linkGoogleAccount,
  requestEmailChange,
  updateProfile,
} from "../api/users";
import { useAuth } from "../context/AuthContext";

function Settings() {
  const navigate = useNavigate();
  const location = useLocation();

  const { user, updateAuthenticatedUser, logout } = useAuth();

  const [profile, setProfile] = useState({
    displayName: user?.displayName ?? "",
    avatarUrl: user?.avatarUrl ?? "",
  });

  const [profileState, setProfileState] = useState({
    saving: false,
    success: false,
    error: "",
  });

  const [username, setUsername] = useState(user?.username ?? "");

  const [usernameState, setUsernameState] = useState({
    saving: false,
    success: false,
    error: "",
  });

  const [password, setPassword] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordState, setPasswordState] = useState({
    saving: false,
    success: false,
    error: "",
  });

  const [email, setEmail] = useState({
    newEmail: "",
    code: "",
  });

  const [emailState, setEmailState] = useState({
    requesting: false,
    confirming: false,
    requested: false,
    success: false,
    error: "",
  });

  const [oauthState, setOauthState] = useState({
    success: "",
    error: "",
  });

  const [deleteState, setDeleteState] = useState({
    deleting: false,
    error: "",
  });

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);

    const linkedProvider = params.get("oauthLinked");
    const oauthError = params.get("oauthError");

    if (!linkedProvider && !oauthError) {
      return;
    }

    if (linkedProvider) {
      const providerName =
        linkedProvider === "google"
          ? "Google"
          : linkedProvider === "github"
            ? "GitHub"
            : linkedProvider;

      setOauthState({
        success: `${providerName} account connected successfully.`,
        error: "",
      });

      getCurrentUser()
        .then((response) => {
          updateAuthenticatedUser(response.user);
        })
        .catch(() => {
          // The OAuth link itself succeeded. If refreshing the local
          // user state fails, leave the success message visible.
        });
    }

    if (oauthError) {
      const messages = {
        OAUTH_ACCOUNT_ALREADY_LINKED: "This account is already connected.",
        OAUTH_ACCOUNT_ALREADY_LINKED_TO_ANOTHER_USER:
          "This account is already connected to another user.",
        OAUTH_EMAIL_REQUIRED:
          "The OAuth provider did not provide a usable email address.",
        OAUTH_AUTHENTICATION_FAILED:
          "OAuth authentication failed. Please try again.",
        OAUTH_STATE_INVALID:
          "The OAuth request expired or was invalid. Please try again.",
      };

      setOauthState({
        success: "",
        error:
          messages[oauthError] ||
          "Unable to connect this account. Please try again.",
      });
    }

    navigate("/settings", { replace: true });
  }, [location.search, navigate, updateAuthenticatedUser]);

  async function handleProfileSubmit(event) {
    event.preventDefault();

    setProfileState({
      saving: true,
      success: false,
      error: "",
    });

    try {
      const response = await updateProfile({
        displayName: profile.displayName.trim() || undefined,
        avatarUrl: profile.avatarUrl.trim() || undefined,
      });

      updateAuthenticatedUser(response.user);

      setProfile({
        displayName: response.user.displayName ?? "",
        avatarUrl: response.user.avatarUrl ?? "",
      });

      setProfileState({
        saving: false,
        success: true,
        error: "",
      });
    } catch (error) {
      setProfileState({
        saving: false,
        success: false,
        error: error.message,
      });
    }
  }

  async function handleUsernameSubmit(event) {
    event.preventDefault();

    const nextUsername = username.trim();

    if (!nextUsername || nextUsername === user?.username) {
      return;
    }

    setUsernameState({
      saving: true,
      success: false,
      error: "",
    });

    try {
      const response = await changeUsername(nextUsername);

      updateAuthenticatedUser(response.user);

      setUsername(response.user.username);

      setUsernameState({
        saving: false,
        success: true,
        error: "",
      });
    } catch (error) {
      setUsernameState({
        saving: false,
        success: false,
        error: error.message,
      });
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    if (password.newPassword !== password.confirmPassword) {
      setPasswordState({
        saving: false,
        success: false,
        error: "New passwords do not match.",
      });

      return;
    }

    setPasswordState({
      saving: true,
      success: false,
      error: "",
    });

    try {
      await changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      });

      /*
       * The backend revokes every session after a password change.
       * The current refresh token is therefore no longer usable.
       *
       * Clear the local auth state and return to login. The user must
       * authenticate again with the new password.
       */
      setPassword({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setPasswordState({
        saving: false,
        success: false,
        error: error.message,
      });
    }
  }

  async function handleEmailRequest(event) {
    event.preventDefault();

    setEmailState({
      requesting: true,
      confirming: false,
      requested: false,
      success: false,
      error: "",
    });

    try {
      await requestEmailChange(email.newEmail.trim());

      setEmailState({
        requesting: false,
        confirming: false,
        requested: true,
        success: false,
        error: "",
      });
    } catch (error) {
      setEmailState({
        requesting: false,
        confirming: false,
        requested: false,
        success: false,
        error: error.message,
      });
    }
  }

  async function handleEmailConfirmation(event) {
    event.preventDefault();

    setEmailState({
      requesting: false,
      confirming: true,
      requested: true,
      success: false,
      error: "",
    });

    try {
      const response = await confirmEmailChange({
        code: email.code.trim(),
      });

      if (response.user) {
        updateAuthenticatedUser(response.user);
      }

      setEmail({
        newEmail: "",
        code: "",
      });

      setEmailState({
        requesting: false,
        confirming: false,
        requested: false,
        success: true,
        error: "",
      });
    } catch (error) {
      setEmailState({
        requesting: false,
        confirming: false,
        requested: true,
        success: false,
        error: error.message,
      });
    }
  }

  async function handleDeleteAccount() {
    setDeleteState({
      deleting: true,
      error: "",
    });

    try {
      await deleteAccount(
        user?.authProviders?.includes("LOCAL")
          ? {
              currentPassword: deletePassword,
            }
          : {},
      );

      await logout();

      navigate("/login", { replace: true });
    } catch (error) {
      setDeleteState({
        deleting: false,
        error: error.message,
      });
    }
  }

  const displayName = profile.displayName || user?.username || "User";
  const avatarInitial = displayName.charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <div className="mx-auto min-h-screen max-w-4xl border-x border-white/5 bg-[#0c0f15]">
        <header className="flex h-16 items-center gap-4 border-b border-white/6 px-6">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
            aria-label="Back to conversations"
            title="Back"
          >
            <ArrowLeft size={19} />
          </button>

          <div>
            <h1 className="text-sm font-semibold">Account settings</h1>

            <p className="text-xs text-white/30">
              Manage your profile, security, and account
            </p>
          </div>
        </header>

        <main className="px-6 py-8">
          <div className="mx-auto max-w-2xl">
            {/* PROFILE */}

            <section>
              <SettingsSectionHeader
                icon={User}
                title="Profile"
                description="Update the information other people see when they interact with you."
              />

              <form
                onSubmit={handleProfileSubmit}
                className="rounded-2xl border border-white/6 bg-[#101218]"
              >
                <div className="border-b border-white/6 p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-500/10 text-xl font-semibold text-indigo-400">
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        avatarInitial
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white/80">
                        {displayName}
                      </p>

                      <p className="mt-1 truncate text-xs text-white/30">
                        @{user?.username}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <Field
                    id="displayName"
                    label="Display name"
                    icon={User}
                    value={profile.displayName}
                    placeholder="Your display name"
                    onChange={(value) => {
                      setProfile((current) => ({
                        ...current,
                        displayName: value,
                      }));

                      setProfileState((current) => ({
                        ...current,
                        success: false,
                        error: "",
                      }));
                    }}
                  />

                  <Field
                    id="avatarUrl"
                    label="Avatar URL"
                    icon={Image}
                    type="url"
                    value={profile.avatarUrl}
                    placeholder="https://example.com/avatar.jpg"
                    onChange={(value) => {
                      setProfile((current) => ({
                        ...current,
                        avatarUrl: value,
                      }));

                      setProfileState((current) => ({
                        ...current,
                        success: false,
                        error: "",
                      }));
                    }}
                  />

                  <p className="-mt-2 text-xs leading-5 text-white/25">
                    Use a publicly accessible image URL.
                  </p>

                  <Feedback
                    error={profileState.error}
                    success={
                      profileState.success
                        ? "Profile updated successfully."
                        : ""
                    }
                  />

                  <div className="flex justify-end pt-1">
                    <SubmitButton icon={Save} loading={profileState.saving}>
                      Save changes
                    </SubmitButton>
                  </div>
                </div>
              </form>
            </section>

            {/* USERNAME */}

            <section className="mt-10">
              <SettingsSectionHeader
                icon={User}
                title="Username"
                description="Your username is unique and is used to identify your account."
              />

              <form
                onSubmit={handleUsernameSubmit}
                className="rounded-2xl border border-white/6 bg-[#101218] p-6"
              >
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-white/70"
                >
                  Username
                </label>

                <div className="flex items-center overflow-hidden rounded-xl border border-white/8 bg-white/4 focus-within:border-indigo-500/50">
                  <span className="pl-3 text-sm text-white/25">@</span>

                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value);

                      setUsernameState((current) => ({
                        ...current,
                        success: false,
                        error: "",
                      }));
                    }}
                    maxLength={30}
                    autoComplete="username"
                    className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/20"
                    placeholder="username"
                  />
                </div>

                <Feedback
                  error={usernameState.error}
                  success={
                    usernameState.success
                      ? "Username updated successfully."
                      : ""
                  }
                />

                <div className="mt-5 flex justify-end">
                  <SubmitButton
                    loading={usernameState.saving}
                    disabled={
                      !username.trim() || username.trim() === user?.username
                    }
                  >
                    Change username
                  </SubmitButton>
                </div>
              </form>
            </section>

            {/* PASSWORD */}

            <section className="mt-10">
              <SettingsSectionHeader
                icon={KeyRound}
                title="Password"
                description="Change your password. All existing sessions will be signed out for security."
              />

              <form
                onSubmit={handlePasswordSubmit}
                className="rounded-2xl border border-white/6 bg-[#101218] p-6"
              >
                <div className="space-y-5">
                  <PasswordField
                    id="currentPassword"
                    label="Current password"
                    value={password.currentPassword}
                    onChange={(value) =>
                      setPassword((current) => ({
                        ...current,
                        currentPassword: value,
                      }))
                    }
                  />

                  <PasswordField
                    id="newPassword"
                    label="New password"
                    value={password.newPassword}
                    onChange={(value) =>
                      setPassword((current) => ({
                        ...current,
                        newPassword: value,
                      }))
                    }
                  />

                  <PasswordField
                    id="confirmPassword"
                    label="Confirm new password"
                    value={password.confirmPassword}
                    onChange={(value) =>
                      setPassword((current) => ({
                        ...current,
                        confirmPassword: value,
                      }))
                    }
                  />

                  <Feedback
                    error={passwordState.error}
                    success={
                      passwordState.success
                        ? "Password changed successfully."
                        : ""
                    }
                  />

                  <div className="flex justify-end pt-1">
                    <SubmitButton
                      icon={Shield}
                      loading={passwordState.saving}
                      disabled={
                        !password.currentPassword ||
                        !password.newPassword ||
                        !password.confirmPassword
                      }
                    >
                      Change password
                    </SubmitButton>
                  </div>
                </div>
              </form>
            </section>

            {/* EMAIL */}

            <section className="mt-10">
              <SettingsSectionHeader
                icon={Mail}
                title="Email address"
                description="Change the email address associated with your account."
              />

              <div className="rounded-2xl border border-white/6 bg-[#101218] p-6">
                <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-white/6 bg-white/3 px-4 py-3">
                  <div>
                    <p className="text-xs text-white/30">Current email</p>

                    <p className="mt-1 text-sm text-white/75">{user?.email}</p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${
                      user?.emailVerifiedAt
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {user?.emailVerifiedAt ? "Verified" : "Unverified"}
                  </span>
                </div>

                {!emailState.requested && !emailState.success && (
                  <form onSubmit={handleEmailRequest} className="space-y-5">
                    <Field
                      id="newEmail"
                      label="New email address"
                      icon={Mail}
                      type="email"
                      value={email.newEmail}
                      placeholder="you@example.com"
                      onChange={(value) => {
                        setEmail((current) => ({
                          ...current,
                          newEmail: value,
                        }));

                        setEmailState((current) => ({
                          ...current,
                          error: "",
                        }));
                      }}
                    />

                    <Feedback error={emailState.error} />

                    <div className="flex justify-end">
                      <SubmitButton
                        loading={emailState.requesting}
                        disabled={!email.newEmail.trim()}
                      >
                        Request email change
                      </SubmitButton>
                    </div>
                  </form>
                )}

                {emailState.requested && !emailState.success && (
                  <form
                    onSubmit={handleEmailConfirmation}
                    className="space-y-5"
                  >
                    <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 px-4 py-3">
                      <p className="text-sm font-medium text-indigo-300">
                        Verification code required
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/35">
                        We sent a verification code for{" "}
                        <span className="text-white/60">{email.newEmail}</span>.
                        Enter the code below to confirm the change.
                      </p>
                    </div>

                    <Field
                      id="emailCode"
                      label="Verification code"
                      value={email.code}
                      placeholder="Enter verification code"
                      onChange={(value) => {
                        setEmail((current) => ({
                          ...current,
                          code: value,
                        }));

                        setEmailState((current) => ({
                          ...current,
                          error: "",
                        }));
                      }}
                    />

                    <Feedback error={emailState.error} />

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEmail({
                            newEmail: "",
                            code: "",
                          });

                          setEmailState({
                            requesting: false,
                            confirming: false,
                            requested: false,
                            success: false,
                            error: "",
                          });
                        }}
                        className="text-sm text-white/35 transition hover:text-white/70"
                      >
                        Cancel
                      </button>

                      <SubmitButton
                        loading={emailState.confirming}
                        disabled={!email.code.trim()}
                      >
                        Confirm email
                      </SubmitButton>
                    </div>
                  </form>
                )}

                {emailState.success && (
                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                        <Check size={15} />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-emerald-400">
                          Email address updated
                        </p>

                        <p className="mt-1 text-xs leading-5 text-white/35">
                          Your email address has been changed successfully.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* CONNECTED ACCOUNTS */}

            <section className="mt-10">
              <SettingsSectionHeader
                icon={Shield}
                title="Connected accounts"
                description="Connect Google or GitHub to sign in to your account more easily."
              />

              <div className="overflow-hidden rounded-2xl border border-white/6 bg-[#101218]">
                <OAuthAccountRow
                  provider="Google"
                  connected={user?.authProviders?.includes("GOOGLE")}
                  onConnect={linkGoogleAccount}
                />

                <OAuthAccountRow
                  provider="GitHub"
                  connected={user?.authProviders?.includes("GITHUB")}
                  onConnect={linkGitHubAccount}
                />
              </div>

              <Feedback error={oauthState.error} success={oauthState.success} />
            </section>

            {/* DANGER ZONE */}

            <section className="mt-10 pb-10">
              <div className="mb-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-red-400">
                  <AlertTriangle size={18} />
                  Danger zone
                </h2>

                <p className="mt-1 text-sm leading-6 text-white/35">
                  Permanently delete your account and all associated data.
                </p>
              </div>

              <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-white/80">
                      Delete account
                    </h3>

                    <p className="mt-1 max-w-md text-xs leading-5 text-white/35">
                      This action cannot be undone. Your conversations,
                      messages, and account data will be permanently removed.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirmation(true)}
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-500/20 px-4 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
                  >
                    <Trash2 size={16} />
                    Delete account
                  </button>
                </div>

                {deleteState.error && (
                  <div className="mt-5 rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                    {deleteState.error}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {showDeleteConfirmation && (
        <DeleteAccountModal
          deleting={deleteState.deleting}
          requiresPassword={user?.authProviders?.includes("LOCAL")}
          password={deletePassword}
          setPassword={setDeletePassword}
          onCancel={() => {
            if (!deleteState.deleting) {
              setShowDeleteConfirmation(false);
              setDeletePassword("");
            }
          }}
          onConfirm={handleDeleteAccount}
        />
      )}
    </div>
  );
}

function SettingsSectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2">
        <Icon size={17} className="text-indigo-400" />

        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>

      <p className="mt-1 text-sm leading-6 text-white/35">{description}</p>
    </div>
  );
}

function Field({
  id,
  label,
  icon: Icon,
  type = "text",
  value,
  placeholder,
  onChange,
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-white/70"
      >
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
          />
        )}

        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`h-11 w-full rounded-xl border border-white/8 bg-white/4 pr-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-indigo-500/50 focus:bg-white/5 ${
            Icon ? "pl-10" : "pl-3"
          }`}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

function PasswordField({ id, label, value, onChange }) {
  return (
    <Field
      id={id}
      label={label}
      type="password"
      value={value}
      placeholder="••••••••"
      onChange={onChange}
    />
  );
}

function Feedback({ error, success }) {
  if (!error && !success) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
      <Check size={16} />
      {success}
    </div>
  );
}

function SubmitButton({
  children,
  loading = false,
  disabled = false,
  icon: Icon,
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {Icon && <Icon size={16} />}

      {loading ? "Saving..." : children}

      {!loading && !Icon && <ChevronRight size={15} />}
    </button>
  );
}

function OAuthAccountRow({ provider, connected, onConnect }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/6 p-5 last:border-b-0">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-sm font-semibold text-white/70">
          {provider === "Google" ? "G" : "GH"}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">{provider}</p>

          <p className="mt-1 text-xs text-white/30">
            {connected
              ? `Your ${provider} account is connected.`
              : `Connect your ${provider} account.`}
          </p>
        </div>
      </div>

      {connected ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
          <Check size={13} />
          Connected
        </span>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-white/10 px-3 text-xs font-medium text-white/65 transition hover:bg-white/5 hover:text-white"
        >
          Connect
        </button>
      )}
    </div>
  );
}

function DeleteAccountModal({
  deleting,
  onCancel,
  onConfirm,
  requiresPassword,
  password,
  setPassword,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/8 bg-[#15181f] p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
          <Trash2 size={20} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">Delete your account?</h2>

        <p className="mt-2 text-sm leading-6 text-white/40">
          This permanently deletes your account and associated conversations and
          messages. This action cannot be undone.
        </p>

        {requiresPassword && (
          <div className="mt-5">
            <label
              htmlFor="deletePassword"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Confirm your password
            </label>

            <input
              id="deletePassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="h-11 w-full rounded-xl border border-white/8 bg-white/4 px-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-red-400/50"
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="h-10 rounded-xl px-4 text-sm text-white/50 transition hover:bg-white/5 hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={deleting || (requiresPassword && !password)}
            onClick={onConfirm}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-500 px-4 text-sm font-medium text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={16} />

            {deleting ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
