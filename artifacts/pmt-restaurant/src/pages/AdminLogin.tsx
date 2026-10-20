import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { useStaffAuthActions, useStaffUser } from "@/hooks/useStaffAuth";
import { errorMessage } from "@/lib/api";
import { PapelPicadoBorder } from "@/components/site/decor";
import { inputClass } from "@/components/site/form";

// Only allow redirects back into the admin area
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && next.startsWith("/admin") && !next.startsWith("/admin/login") ? next : "/admin";
}

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const { data: user } = useStaffUser();
  const { login } = useStaffAuthActions();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, nofollow";
    document.title = "Staff Login · PMT";
  }, []);

  useEffect(() => {
    if (user) setLocation(nextPath(), { replace: true });
  }, [user, setLocation]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(username, password);
      setLocation(nextPath(), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setPassword("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F5EF] font-sans flex flex-col">
      <PapelPicadoBorder />
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl border-2 border-[#0F5D2F] shadow-xl overflow-hidden">
          <div className="bg-[#F8F5EF] border-b-2 border-[#0F5D2F] px-6 pt-6 pb-4 text-center">
            <img src={`${import.meta.env.BASE_URL}logo.webp`} alt="Papa's Mia Tacos" width={129} height={120} className="h-28 w-auto mx-auto" />
            <p className="text-[#0F5D2F] text-xs font-bold uppercase tracking-[0.2em] mt-3">Staff Login</p>
          </div>
          <div className="px-6 py-6">
            <label className="block mb-4">
              <span className="block text-[13px] font-semibold uppercase tracking-wide text-[#333] mb-1.5">Username</span>
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                required
              />
            </label>
            <label className="block mb-5">
              <span className="block text-[13px] font-semibold uppercase tracking-wide text-[#333] mb-1.5">Password</span>
              <span className="relative block">
                <input
                  className={`${inputClass} pr-11`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[#888] hover:text-[#0F5D2F]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </span>
            </label>
            {error && (
              <p role="alert" className="bg-[#fef2f2] border-2 border-[#A71F29] rounded-lg px-3 py-2 mb-4 text-sm font-semibold text-[#A71F29]">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#0F5D2F] text-white font-bold uppercase tracking-wider text-sm hover:bg-[#0F5D2F]/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
