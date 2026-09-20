"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSharedAuthSession, type AuthPayload } from "@/lib/shared-auth";
type AccountProfile = {
  id: string;
  email: string;
  displayName: string;
  role: "teacher" | "student";
  career: string;
  interests: string[];
};
export function AccountDialog({
  profile,
  onClose,
  onSaved,
}: {
  profile: AccountProfile;
  onClose: () => void;
  onSaved: (profile: AccountProfile) => void;
}) {
  const [name, setName] = useState(profile.displayName);
  const [career, setCareer] = useState(profile.career);
  const [interests, setInterests] = useState(profile.interests.join(", "));
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: name,
          career,
          interests: interests
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      const payload = (await response.json()) as {
        profile?: AccountProfile;
        error?: string;
      };
      if (!response.ok || !payload.profile)
        throw new Error(payload.error ?? "프로필을 저장하지 못했습니다.");
      onSaved(payload.profile);
      setMessage("프로필을 저장했습니다.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setMessage("");
    if (password !== confirmation)
      return setError("새 비밀번호가 서로 다릅니다.");
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword: password }),
      });
      const payload = (await response.json()) as {
        session?: AuthPayload;
        error?: string;
      };
      if (!response.ok || !payload.session)
        throw new Error(payload.error ?? "변경하지 못했습니다.");
      saveSharedAuthSession(payload.session);
      setCurrentPassword("");
      setPassword("");
      setConfirmation("");
      setMessage("통합 계정 비밀번호를 변경했습니다.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="account-settings-dialog max-h-[92vh] overflow-y-auto sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>내 계정·프로필</DialogTitle>
          <DialogDescription>{profile.email}</DialogDescription>
        </DialogHeader>
        <form className="account-settings-form" onSubmit={saveProfile}>
          <h3>진로 프로필</h3>
          <Label htmlFor="account-name">이름</Label>
          <Input
            id="account-name"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Label htmlFor="account-career">희망 진로</Label>
          <Input
            id="account-career"
            required
            maxLength={120}
            value={career}
            onChange={(e) => setCareer(e.target.value)}
          />
          <Label htmlFor="account-interests">관심 키워드 (쉼표로 구분)</Label>
          <Input
            id="account-interests"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            프로필 저장
          </Button>
        </form>
        <form className="account-settings-form" onSubmit={savePassword}>
          <h3>비밀번호 변경</h3>
          <p>문학·문법·진로 사이트의 통합 계정에 함께 적용됩니다.</p>
          <Label htmlFor="account-current-password">현재 비밀번호</Label>
          <Input
            id="account-current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Label htmlFor="account-new-password">새 비밀번호 (8자 이상)</Label>
          <Input
            id="account-new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={256}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Label htmlFor="account-confirm-password">새 비밀번호 확인</Label>
          <Input
            id="account-confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          <Button type="submit" variant="outline" disabled={busy}>
            비밀번호 변경
          </Button>
        </form>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="manager-message">
            {message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
