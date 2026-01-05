"use client";

import { CheckCircle2, Mail, Lock, Trash2 } from "lucide-react";
import { useState } from "react";

import { updateProfile } from "@/app/actions/settings";
import { ChangePasswordModal } from "@/components/settings/change-password-modal";
import { DeleteAccountModal } from "@/components/settings/delete-account-modal";
import { SettingsContent } from "@/components/settings/settings-content";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";

function getInitials(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
  if (email) {
    return email.substring(0, 2).toUpperCase();
  }
  return "U";
}

export default function ProfileAccountPage() {
  const { user } = useAuth();
  const { profile, refreshProfile, isPremium } = useProfile();

  // Use profile data directly for display, local state for edits
  const profileUsername = profile?.username || "";
  const profileBio = profile?.bio || "";
  // Initialize state with profile values
  const [username, setUsername] = useState(profileUsername);
  const [bio, setBio] = useState(profileBio);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);

  // Use local state if it has a value, otherwise fall back to profile data
  // This handles the case where profile loads after component mount
  const displayUsername = username || profileUsername;
  const displayBio = bio || profileBio;

  async function handleSaveChanges() {
    setIsSaving(true);
    setError(null);

    const result = await updateProfile({
      username: displayUsername,
      bio: displayBio,
    });

    setIsSaving(false);

    if (result.success) {
      // Refresh profile to get updated data
      await refreshProfile();
    } else {
      setError(result.error);
    }
  }

  const userEmail = user?.email || profile?.email || "";
  const userFullName = profile?.full_name || "";
  const userAvatar = profile?.avatar_url || "";
  const initials = getInitials(userFullName, userEmail);

  return (
    <SettingsContent
      title="Profile & Account"
      description="Manage your public identity and security settings."
    >
      <div className="space-y-8">
        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Profile Grid */}
        <div className="bg-card border border-border rounded-lg p-6 md:p-8">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Profile
          </h3>

          {/* Avatar Display */}
          <div className="mb-8 flex items-center gap-6">
            <Avatar className="size-20">
              <AvatarImage src={userAvatar} alt={userFullName || userEmail} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">
                {userFullName || "No name set"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Avatar upload coming soon
              </p>
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Display Name */}
            {/*     <div className="space-y-2">
              <Label htmlFor="displayName">Full Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
              />
            </div> */}

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground">
                  @
                </span>
                <Input
                  id="username"
                  value={displayUsername}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="pl-7"
                />
              </div>
            </div>
          </div>

          {/* Bio Textarea */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={displayBio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell readers about yourself..."
              className="resize-none"
              rows={4}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground">
              {displayBio.length}/300 characters
            </p>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-card border border-border rounded-lg p-6 md:p-8">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Account
          </h3>

          <div className="space-y-6">
            {/* Email Field */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">
                    {userEmail || "No email set"}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* Password Change */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Lock className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Password
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Change your account password
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordModal(true)}
                >
                  Change Password
                </Button>
              </div>

              {/* Password Change Success Message */}
              {passwordChanged && (
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-lg p-3">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>Password changed successfully</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 md:p-8">
          <div className="flex items-start gap-4">
            <Trash2 className="size-5 text-destructive mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-destructive mb-2">
                Delete Account
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Permanently delete your library and all reading data. This
                cannot be undone.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="min-w-32"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        isPaidUser={isPremium}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={showPasswordModal}
        onOpenChange={(open) => {
          setShowPasswordModal(open);
          if (!open) {
            setPasswordChanged(false);
          }
        }}
        onSuccess={() => {
          setPasswordChanged(true);
          // Hide message after 5 seconds
          setTimeout(() => setPasswordChanged(false), 5000);
        }}
      />
    </SettingsContent>
  );
}
