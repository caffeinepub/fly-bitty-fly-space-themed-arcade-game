import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  Crown,
  Loader2,
  Medal,
  Pencil,
  Trophy,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useChangeNickname,
  useGetCallerNickname,
  useGetLeaderboard,
  useGetWeeklyLeaderboard,
} from "../hooks/useQueries";

interface LeaderboardPageProps {
  onBack: () => void;
}

type ActiveTab = "alltime" | "weekly";

const getRankIcon = (index: number): React.ReactElement => {
  if (index === 0) return <Crown className="h-5 w-5 text-yellow-400" />;
  if (index === 1) return <Medal className="h-5 w-5 text-gray-300" />;
  if (index === 2) return <Award className="h-5 w-5 text-orange-400" />;
  return (
    <span className="text-white/60 font-bold text-sm w-5 text-center inline-block">
      {index + 1}
    </span>
  );
};

export default function LeaderboardPage({ onBack }: LeaderboardPageProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("alltime");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [changeNicknameValue, setChangeNicknameValue] = useState("");
  const [changeNicknameError, setChangeNicknameError] = useState("");

  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const { data: currentNickname } = useGetCallerNickname();
  const changeNickname = useChangeNickname();

  const { data: allTimeScores, isLoading: loadingAllTime } =
    useGetLeaderboard();
  const { data: weeklyScores, isLoading: loadingWeekly } =
    useGetWeeklyLeaderboard();

  const topAllTime = (
    allTimeScores?.filter((e) => e.nickname && e.nickname.trim() !== "") ?? []
  ).slice(0, 25);

  const topWeekly = (
    weeklyScores?.filter((e) => e.nickname && e.nickname.trim() !== "") ?? []
  ).slice(0, 25);

  const handleTabSwitch = (tab: ActiveTab) => {
    if (tab === activeTab || isAnimating) return;
    setIsAnimating(true);
    setActiveTab(tab);
    setTimeout(() => setIsAnimating(false), 400);
  };

  const validateNicknameLocal = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return "Nickname must be at least 2 characters";
    if (trimmed.length > 20) return "Nickname must be 20 characters or less";
    return null;
  };

  const handleChangeNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeNicknameError("");

    const trimmed = changeNicknameValue.trim();
    const localError = validateNicknameLocal(trimmed);
    if (localError) {
      setChangeNicknameError(localError);
      return;
    }

    try {
      await changeNickname.mutateAsync(trimmed);
      setShowChangeDialog(false);
      setChangeNicknameValue("");
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("already exists") || msg.includes("taken")) {
        setChangeNicknameError(
          "This nickname is already taken. Please choose another.",
        );
      } else {
        setChangeNicknameError("Failed to change nickname. Please try again.");
      }
    }
  };

  const isLoading = activeTab === "alltime" ? loadingAllTime : loadingWeekly;
  const scores = activeTab === "alltime" ? topAllTime : topWeekly;

  return (
    <div
      className="relative w-full min-h-screen"
      style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}
    >
      {/* Background */}
      <div
        className="fixed inset-0 bg-cover bg-center -z-10"
        style={{
          backgroundImage: "url(/assets/IMG_4874.jpeg)",
          filter: "brightness(0.7)",
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/70 -z-10" />

      {/* Stars */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        {[...Array(25)].map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static decorative array
            key={`lbstar-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: `${(i * 37.3) % 100}%`,
              left: `${(i * 61.7) % 100}%`,
              animationDelay: `${(i * 0.3) % 2}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      {/* Back Button */}
      <div className="fixed top-4 left-4 z-20">
        <Button
          onClick={onBack}
          size="icon"
          variant="outline"
          data-ocid="leaderboard.back_button"
          className="bg-black/60 backdrop-blur-sm border-white/30 hover:bg-black/80 text-white w-12 h-12"
          aria-label="Back to main menu"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 w-full max-w-2xl mx-auto py-8 pb-20">
        {/* Header */}
        <div className="text-center space-y-2 pt-12">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-yellow-400 tracking-wider drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]">
              LEADERBOARDS
            </h1>
            <Trophy className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-white/70 text-base sm:text-lg">
            Top pilots in the cosmos
          </p>
        </div>

        {/* Change Nickname bar */}
        {isAuthenticated && currentNickname && (
          <div className="flex items-center justify-between bg-slate-800/70 backdrop-blur-sm px-5 py-3 rounded-xl border border-yellow-400/40 w-full">
            <p className="text-white/70 text-sm">
              Your nickname:{" "}
              <span className="text-yellow-400 font-bold">
                {currentNickname}
              </span>
            </p>
            <Button
              variant="outline"
              size="sm"
              data-ocid="leaderboard.edit_button"
              onClick={() => {
                setChangeNicknameValue("");
                setChangeNicknameError("");
                setShowChangeDialog(true);
              }}
              className="bg-transparent border-white/30 text-white/70 hover:text-white hover:bg-white/10 text-xs gap-1.5"
            >
              <Pencil className="h-3 w-3" />
              Change Nickname
            </Button>
          </div>
        )}

        {/* Tab Buttons */}
        <div className="flex gap-4 w-full max-w-md">
          <button
            type="button"
            data-ocid="leaderboard.tab.1"
            onClick={() => handleTabSwitch("alltime")}
            className={`
              flex-1 py-4 px-6 font-black text-lg rounded-2xl border-2 transition-all duration-300
              ${isAnimating ? "leaderboard-tab-spin" : ""}
              ${
                activeTab === "alltime"
                  ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-black border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.5)]"
                  : "bg-black/40 text-white/60 border-white/20 hover:border-yellow-400/50 hover:text-white/90"
              }
            `}
          >
            ALL-TIME
          </button>
          <button
            type="button"
            data-ocid="leaderboard.tab.2"
            onClick={() => handleTabSwitch("weekly")}
            className={`
              flex-1 py-4 px-6 font-black text-lg rounded-2xl border-2 transition-all duration-300
              ${isAnimating ? "leaderboard-tab-spin" : ""}
              ${
                activeTab === "weekly"
                  ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-black border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.5)]"
                  : "bg-black/40 text-white/60 border-white/20 hover:border-yellow-400/50 hover:text-white/90"
              }
            `}
          >
            WEEKLY
          </button>
        </div>

        {/* Tab Label */}
        <p className="text-white/50 text-sm -mt-2">
          {activeTab === "weekly"
            ? "Resets every Monday"
            : "All-time best scores"}
        </p>

        {/* Leaderboard Card */}
        <div className="w-full bg-gradient-to-br from-slate-800/90 to-purple-900/90 backdrop-blur-lg border-2 border-yellow-400/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Card Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-yellow-400/20">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <h2 className="text-xl font-black text-yellow-400">
              {activeTab === "alltime"
                ? "All-Time Champions"
                : "This Week's Champions"}
            </h2>
          </div>

          {/* Leaderboard Content */}
          <div className="p-4">
            {isLoading ? (
              <div
                data-ocid="leaderboard.loading_state"
                className="flex flex-col items-center justify-center py-12 gap-3"
              >
                <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
                <p className="text-white/60">Loading scores…</p>
              </div>
            ) : scores.length === 0 ? (
              <div
                data-ocid="leaderboard.empty_state"
                className="flex flex-col items-center justify-center py-12 gap-3 text-center"
              >
                <Trophy className="h-12 w-12 text-white/20" />
                <p className="text-white/60 text-lg font-bold">No scores yet</p>
                <p className="text-white/40 text-sm">
                  Be the first to make history!
                </p>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: "calc(100vh - 340px)",
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <div className="space-y-2 pr-1">
                  {scores.map((entry, index) => (
                    <div
                      key={`${entry.nickname}-${index}`}
                      data-ocid={`leaderboard.item.${index + 1}`}
                      className={`
                        flex items-center justify-between p-3 rounded-xl transition-all duration-200
                        ${index === 0 ? "bg-yellow-400/20 border border-yellow-400/40" : ""}
                        ${index === 1 ? "bg-gray-300/10 border border-gray-300/30" : ""}
                        ${index === 2 ? "bg-orange-400/10 border border-orange-400/30" : ""}
                        ${index > 2 ? "bg-slate-700/30 hover:bg-slate-700/50" : ""}
                      `}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-6 flex justify-center flex-shrink-0">
                          {getRankIcon(index)}
                        </div>
                        <p
                          className={`font-bold text-base truncate ${
                            index === 0 ? "text-yellow-400" : "text-white"
                          }`}
                        >
                          {entry.nickname}
                        </p>
                      </div>
                      <div
                        className={`text-xl font-black flex-shrink-0 ml-3 ${
                          index === 0 ? "text-yellow-400" : "text-white/90"
                        }`}
                      >
                        {Number(entry.score)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer note for weekly */}
        {activeTab === "weekly" && (
          <p className="text-white/40 text-xs text-center">
            Weekly leaderboard resets every Monday at midnight UTC
          </p>
        )}
      </div>

      {/* Change Nickname Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent
          data-ocid="leaderboard.dialog"
          className="bg-gradient-to-br from-slate-800 to-purple-900 border-2 border-yellow-400 text-white max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-yellow-400">
              Change Nickname
            </DialogTitle>
            <DialogDescription className="text-white/70">
              Your current nickname{" "}
              <span className="text-yellow-400 font-bold">
                "{currentNickname}"
              </span>{" "}
              will be replaced. Your old nickname will be freed up for others.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleChangeNicknameSubmit}
            className="space-y-4 pt-2"
          >
            <div className="space-y-2">
              <Label
                htmlFor="lb-change-nickname"
                className="text-white font-semibold"
              >
                New Nickname (2–20 characters)
              </Label>
              <Input
                id="lb-change-nickname"
                data-ocid="leaderboard.input"
                type="text"
                value={changeNicknameValue}
                onChange={(e) => setChangeNicknameValue(e.target.value)}
                placeholder="Enter new nickname"
                className="bg-slate-700 border-slate-500 text-white placeholder:text-white/40"
                maxLength={20}
                autoFocus
              />
              {changeNicknameError && (
                <p
                  data-ocid="leaderboard.error_state"
                  className="text-red-400 text-sm flex items-center gap-1"
                >
                  <AlertCircle className="h-4 w-4" />
                  {changeNicknameError}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                data-ocid="leaderboard.cancel_button"
                onClick={() => setShowChangeDialog(false)}
                className="bg-transparent border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="leaderboard.confirm_button"
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold"
                disabled={changeNickname.isPending}
              >
                {changeNickname.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save New Nickname"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
