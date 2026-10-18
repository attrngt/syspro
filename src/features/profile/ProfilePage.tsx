import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useSession, getHomeRouteByRole } from "../auth/useSession";
import { useSubscribePush } from "../notifications/usePushSubscription";
import { useChangePassword } from "./useProfileActions";
import { InstallGuide } from "./InstallGuide";

export function ProfilePage() {
  const { profile, signOut } = useSession();
  const subscribePushMutation = useSubscribePush();
  const changePasswordMutation = useChangePassword();

  const [newPassword, setNewPassword] = useState("");
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  function handleEnablePush() {
    setPushMsg(null);
    subscribePushMutation.mutate(undefined, {
      onSuccess: () => setPushMsg("Notifikasi perangkat berhasil diaktifkan."),
      onError: (err) => setPushMsg(err.message),
    });
  }

  function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword.length < 8) {
      setPwdMsg("Password baru minimal 8 karakter.");
      return;
    }
    changePasswordMutation.mutate(newPassword, {
      onSuccess: () => {
        setPwdMsg("Password berhasil diperbarui.");
        setNewPassword("");
      },
      onError: (err) => setPwdMsg(err.message),
    });
  }

  const homeUrl = profile ? getHomeRouteByRole(profile.role) : "/";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
        <div>
          <h1 className="text-lg font-bold">Profil & Pengaturan</h1>
          <p className="text-xs text-neutral-600">
            {profile?.nama} ({profile?.role})
          </p>
        </div>
        <Link to={homeUrl} className="text-xs font-medium underline py-2">
          ← Ke Beranda
        </Link>
      </div>

      {/* Aktifkan Notifikasi Eksplisit (PRD 4.5 & 11.10) */}
      <div className="border border-neutral-900 p-4 space-y-3">
        <h2 className="font-bold text-sm">Notifikasi Perangkat (Web Push)</h2>
        <p className="text-xs text-neutral-600">
          Terima pemberitahuan pengingat dan perubahan mode kuliah langsung di
          perangkat ini.
        </p>
        {pushMsg && (
          <p className="text-xs font-medium text-neutral-900">{pushMsg}</p>
        )}
        <button
          type="button"
          onClick={handleEnablePush}
          disabled={subscribePushMutation.isPending}
          className="w-full min-h-11 bg-neutral-900 text-white text-xs font-bold disabled:opacity-50"
        >
          {subscribePushMutation.isPending
            ? "Memproses..."
            : "Aktifkan notifikasi"}
        </button>
      </div>

      {/* Panduan Instal PWA (PRD 4.5) */}
      <InstallGuide />

      {/* Ganti Password (PRD 4.5) */}
      <form
        onSubmit={handlePasswordSubmit}
        className="border border-neutral-900 p-4 space-y-3"
      >
        <h2 className="font-bold text-sm">Ganti Password</h2>
        <div>
          <label htmlFor="new-password" className="block text-xs font-medium">
            Password Baru (minimal 8 karakter)
          </label>
          <input
            id="new-password"
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full min-h-11 px-3 border border-neutral-900 text-sm"
            required
          />
        </div>
        {pwdMsg && (
          <p className="text-xs font-medium text-neutral-900">{pwdMsg}</p>
        )}
        <button
          type="submit"
          disabled={changePasswordMutation.isPending}
          className="w-full min-h-11 border border-neutral-900 bg-white text-neutral-900 text-xs font-bold hover:bg-neutral-100 disabled:opacity-50"
        >
          Simpan Password Baru
        </button>
      </form>

      <button
        type="button"
        onClick={() => void signOut()}
        className="w-full min-h-11 border border-red-700 text-red-700 text-xs font-bold hover:bg-red-50"
      >
        Keluar dari Akun
      </button>
    </div>
  );
}
