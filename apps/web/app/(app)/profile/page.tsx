"use client";

import { trpc } from "@/lib/trpc/client";
import { supabase } from "@/lib/supabase/client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Save, ArrowLeft, User, Mail, Calendar, Shield } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile, isLoading, refetch } = trpc.settings.get.useQuery();
  const updateProfile = trpc.settings.updateProfile.useMutation();

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarVersion, setAvatarVersion] = useState<number>(0);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? "");
      setAvatarUrl(profile.avatarUrl ?? "");
      setAvatarVersion(profile.updatedAt ? new Date(profile.updatedAt).getTime() : 0);
    }
  }, [profile]);

  const initial = (displayName || profile?.email || "?")[0]?.toUpperCase() ?? "?";

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    const localPreview = URL.createObjectURL(file);
    setAvatarUrl(localPreview);
    setAvatarVersion(Date.now());

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const path = `${session.user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      let resolvedUrl = publicUrl;
      try {
        const probe = await fetch(publicUrl, { method: "HEAD" });
        if (!probe.ok) {
          const { data: signed, error: signedError } = await supabase.storage
            .from("avatars")
            .createSignedUrl(path, 60 * 60 * 24 * 365);
          if (signedError || !signed?.signedUrl) {
            throw new Error("Avatar uploaded but could not be read from storage.");
          }
          resolvedUrl = signed.signedUrl;
        }
      } catch {
        const { data: signed, error: signedError } = await supabase.storage
          .from("avatars")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signedError || !signed?.signedUrl) {
          throw new Error(
            "Avatar uploaded but cannot be displayed. In Supabase Storage, make the `avatars` bucket public or add a SELECT policy for authenticated users."
          );
        }
        resolvedUrl = signed.signedUrl;
      }

      // Persist avatar immediately and bump a cache-busting version
      // so the new image appears without a hard refresh.
      await updateProfile.mutateAsync({ avatarUrl: resolvedUrl });
      setAvatarUrl(resolvedUrl);
      setAvatarVersion(Date.now());
      await refetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message ?? "Upload failed");
      setAvatarUrl(profile?.avatarUrl ?? "");
    } finally {
      URL.revokeObjectURL(localPreview);
      setUploading(false);
    }
  }

  async function handleSave() {
    setError("");
    try {
      await updateProfile.mutateAsync({ displayName, avatarUrl });
      await refetch();
      setAvatarVersion(Date.now());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message ?? "Save failed");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (isLoading) return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
      <Loader2 size={24} color="var(--color-text-muted)" style={{ animation: "spin 1s linear infinite" }} />
    </div>
  );

  const isSignedStorageUrl = avatarUrl.includes("/object/sign/") || avatarUrl.includes("token=");
  const avatarSrc =
    avatarUrl && avatarVersion && !isSignedStorageUrl
      ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${avatarVersion}`
      : avatarUrl;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
        <button type="button" onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 6, borderRadius: 8, display: "flex" }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Profile</h1>
        <div style={{ marginLeft: "auto" }}>
          <button type="button" onClick={handleSave} disabled={updateProfile.isPending}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer", background: saved ? "#22c55e" : "var(--color-accent)", color: "white", fontSize: 14, fontWeight: 500, opacity: updateProfile.isPending ? 0.7 : 1 }}>
            {updateProfile.isPending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Avatar section */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, padding: 32, marginBottom: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ position: "relative" }}>
          {avatarUrl ? (
            <img
              src={avatarSrc}
              alt={initial}
              onError={() => {
                setError(
                  "Avatar exists but cannot be read. Configure Supabase Storage read access for the `avatars` bucket."
                );
              }}
              style={{ width: 96, height: 96, borderRadius: "50%", objectFit: "cover", border: "3px solid var(--color-border)" }} />
          ) : (
            <div style={{ width: 96, height: 96, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, color: "white", border: "3px solid var(--color-border)" }}>
              {initial}
            </div>
          )}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: "50%", background: "var(--color-accent)", border: "2px solid var(--color-surface)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {uploading ? <Loader2 size={12} color="white" style={{ animation: "spin 1s linear infinite" }} /> : <Camera size={12} color="white" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
        </div>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Click the camera icon to upload a photo</p>
        {avatarUrl && (
          <button type="button" onClick={() => setAvatarUrl("")}
            style={{ fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer" }}>
            Remove photo
          </button>
        )}
      </div>

      {/* Info fields */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden", marginBottom: 16 }}>
        {/* Display name */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <User size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Display name</p>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              style={{ width: "100%", background: "none", border: "none", outline: "none", fontSize: 15, color: "var(--color-text)", fontFamily: "inherit" }}
            />
          </div>
        </div>

        {/* Email (read-only) */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <Mail size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email</p>
            <p style={{ fontSize: 15, color: "var(--color-text-muted)" }}>{profile?.email}</p>
          </div>
        </div>

        {/* Member since */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
          <Calendar size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Member since</p>
            <p style={{ fontSize: 15, color: "var(--color-text)" }}>
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Account actions */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <Shield size={16} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 500 }}>Account security</p>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>Password is managed through your email provider</p>
          </div>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <button type="button" onClick={handleSignOut}
            style={{ width: "100%", padding: "10px 16px", borderRadius: 10, border: "1px solid #ef444466", background: "transparent", color: "#ef4444", fontSize: 14, cursor: "pointer", fontWeight: 500 }}>
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <p style={{ marginTop: 12, fontSize: 13, color: "#ef4444", textAlign: "center" }}>{error}</p>
      )}
    </div>
  );
}
