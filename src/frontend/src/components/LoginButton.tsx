import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { LogIn, LogOut } from "lucide-react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";

export default function LoginButton() {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === "logging-in";
  const text =
    loginStatus === "logging-in"
      ? "Logging in..."
      : isAuthenticated
        ? "Logout"
        : "Login";

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error("Login error:", error);
        if (error.message === "User is already authenticated") {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  return (
    <Button
      onClick={handleAuth}
      disabled={disabled}
      size="lg"
      className={`px-8 py-6 rounded-full transition-all font-bold text-lg ${
        isAuthenticated
          ? "bg-white/20 hover:bg-white/30 text-white border-2 border-white/40"
          : "bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black border-4 border-yellow-300"
      } disabled:opacity-50 transform hover:scale-105 shadow-lg`}
    >
      {isAuthenticated ? (
        <>
          <LogOut className="mr-2 h-5 w-5" />
          {text}
        </>
      ) : (
        <>
          <LogIn className="mr-2 h-5 w-5" />
          {text}
        </>
      )}
    </Button>
  );
}
