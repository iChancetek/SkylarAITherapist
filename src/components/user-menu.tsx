
"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUserPreferences } from "@/lib/user-preferences";
import { useAuthContext, useFirebaseAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Languages, Lock, LogOut } from "lucide-react";

export function UserMenu() {
  const { user, userProfile, updateUserProfile } = useAuthContext();
  const { preferences } = useUserPreferences(); // Hook into preferences
  const { handleLogout, handlePasswordReset } = useFirebaseAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  if (!user) return null;

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const onPasswordChangeClick = () => {
    if (user?.email) {
      handlePasswordReset(user.email);
    } else {
      toast({
        title: "Error",
        description: "Could not find your email address to send a reset link.",
        variant: "destructive"
      });
    }
  }

  const handleLanguageChange = async (langCode: string) => {
    await updateUserProfile({ language: langCode });
    toast({
      title: "Language Updated",
      description: `Your language has been set to ${languages.find(l => l.code === langCode)?.name}.`,
    });
  }

  // Prioritize preferences.userName (immediate local state) over auth profile
  const displayName = preferences.userName || userProfile?.fullName || user.displayName || user.email;
  const avatarUrl = preferences.profileImage || userProfile?.profileImage || user.photoURL;

  return (
    <div className="">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-3 rounded-full bg-background/20 p-2 pr-4 text-foreground backdrop-blur-sm transition-colors hover:bg-background/30">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl ?? undefined} alt={displayName ?? "User"} />
              <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{displayName}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex items-center justify-between focus:bg-inherit" onSelect={(e) => e.preventDefault()}>
            <Label htmlFor="theme-switch" className="flex items-center gap-2 font-normal cursor-pointer">
              {theme === "dark" ? <Moon /> : <Sun />}
              Theme
            </Label>
            <Switch
              id="theme-switch"
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Languages className="mr-2 h-4 w-4" />
              <span>Language</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={userProfile?.language || 'en'} onValueChange={handleLanguageChange}>
                {languages.map(lang => (
                  <DropdownMenuRadioItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={onPasswordChangeClick}>
            <Lock className="mr-2 h-4 w-4" />
            <span>Change Password</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
