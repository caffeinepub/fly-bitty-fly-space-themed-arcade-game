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
  Award,
  Crown,
  Loader2,
  Medal,
  Pencil,
  Rocket,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import LoginButton from "../components/LoginButton";
import {
  useChangeNickname,
  useGetCallerNickname,
  useGetLeaderboard,
} from "../hooks/useQueries";

interface StartScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onNavigateLeaderboard: () => void;
}

export default function StartScreen({
  onStart,
  isMuted,
  onToggleMute,
  onNavigateLeaderboard,
}: StartScreenProps) {
  const [showItemsList, setShowItemsList] = useState(false);
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [changeNicknameValue, setChangeNicknameValue] = useState("");
  const [changeNicknameError, setChangeNicknameError] = useState("");

  const { data: currentNickname } = useGetCallerNickname();
  const changeNickname = useChangeNickname();

  const { data: allTimeScores, isLoading: loadingAllTime } =
    useGetLeaderboard();

  // Top 5 for the Hall of Fame preview
  const topAllTime = (
    allTimeScores?.filter((e) => e.nickname && e.nickname.trim() !== "") ?? []
  ).slice(0, 5);

  const getRankIcon = (index: number): React.ReactElement => {
    if (index === 0) return <Crown className="h-4 w-4 text-yellow-400" />;
    if (index === 1) return <Medal className="h-4 w-4 text-gray-300" />;
    if (index === 2) return <Award className="h-4 w-4 text-orange-400" />;
    return <span className="text-white/60 font-bold text-sm">{index + 1}</span>;
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

  return (
    <div className="relative w-full min-h-screen overflow-y-auto">
      {/* Background Image */}
      <div
        className="fixed inset-0 bg-cover bg-center -z-10"
        style={{
          backgroundImage: "url(/assets/IMG_4874.jpeg)",
          filter: "brightness(0.9)",
        }}
      />

      {/* Overlay gradient for better text readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 -z-10" />

      {/* Animated stars */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        {[...Array(20)].map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static decorative array
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Top Right Controls */}
      <div className="fixed top-4 right-4 z-20 flex items-center gap-3">
        <Button
          onClick={onToggleMute}
          size="icon"
          variant="outline"
          data-ocid="start.toggle"
          className="bg-black/60 backdrop-blur-sm border-white/30 hover:bg-black/80 text-white"
          aria-label={isMuted ? "Unmute music" : "Mute music"}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>
        <LoginButton />
      </div>

      {/* Scrollable Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 w-full max-w-6xl mx-auto py-8 pb-20">
        <div className="text-center space-y-4 pt-4">
          <h1 className="text-5xl sm:text-6xl md:text-8xl font-black text-yellow-400 tracking-wider drop-shadow-[0_0_30px_rgba(250,204,21,0.8)] animate-pulse">
            FLY BITTY FLY
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white font-bold drop-shadow-lg">
            Navigate through the crypto cosmos!
          </p>
        </div>

        <Button
          onClick={onStart}
          size="lg"
          data-ocid="start.primary_button"
          className="text-xl sm:text-2xl px-8 sm:px-12 py-6 sm:py-8 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-black rounded-full shadow-2xl transform hover:scale-110 transition-all duration-200 border-4 border-yellow-300"
        >
          <Rocket className="mr-2 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8" />
          PLAY NOW
        </Button>

        <Button
          onClick={() => setShowItemsList(true)}
          size="lg"
          data-ocid="start.open_modal_button"
          className="text-xl sm:text-2xl px-8 sm:px-12 py-6 sm:py-8 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-black rounded-full shadow-2xl transform hover:scale-110 transition-all duration-200 border-4 border-yellow-300"
        >
          RULES AND ITEMS
        </Button>

        <Button
          onClick={onNavigateLeaderboard}
          size="lg"
          data-ocid="start.secondary_button"
          className="text-xl sm:text-2xl px-8 sm:px-12 py-6 sm:py-8 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-black rounded-full shadow-2xl transform hover:scale-110 transition-all duration-200 border-4 border-yellow-300"
        >
          <Trophy className="mr-2 sm:mr-3 h-6 w-6 sm:h-8 sm:w-8" />
          LEADERBOARDS
        </Button>

        {/* Hall of Fame — Top 5 All-Time */}
        <div className="w-full max-w-sm mt-2">
          <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg border-2 border-yellow-400/40 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-yellow-400/20">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <h3 className="text-lg font-black text-yellow-400 tracking-wide">
                HALL OF FAME
              </h3>
            </div>
            <div className="p-3 space-y-1.5">
              {loadingAllTime ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 text-yellow-400 animate-spin" />
                </div>
              ) : topAllTime.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-3">
                  No scores yet — be the first!
                </p>
              ) : (
                topAllTime.map((entry, index) => (
                  <div
                    key={`hof-${entry.nickname}-${index}`}
                    data-ocid={`hall_of_fame.item.${index + 1}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/30 hover:bg-black/40 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="w-5 flex justify-center flex-shrink-0">
                        {getRankIcon(index)}
                      </div>
                      <span className="text-white text-sm font-semibold truncate">
                        {entry.nickname}
                      </span>
                    </div>
                    <span className="text-yellow-400 font-black text-base flex-shrink-0 ml-2">
                      {Number(entry.score)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rules and Items Fullscreen Pop-up */}
      {showItemsList && (
        <div
          data-ocid="start.modal"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-slate-800 to-purple-900 border-4 border-yellow-400 rounded-2xl shadow-2xl">
            <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-purple-900 border-b-2 border-yellow-400/50 p-4 flex justify-between items-center">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-yellow-400">
                GAME RULES & ITEMS
              </h2>
              <Button
                onClick={() => setShowItemsList(false)}
                size="icon"
                variant="outline"
                data-ocid="start.close_button"
                className="bg-red-600 hover:bg-red-700 text-white border-red-400"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-black/30 p-6 rounded-xl border-2 border-yellow-400/30">
                <h3 className="text-xl sm:text-2xl font-black text-yellow-400 mb-4">
                  HOW TO PLAY
                </h3>
                <p className="text-base sm:text-lg text-white/90 leading-relaxed">
                  Tap the screen to stay afloat, collect items and avoid danger
                  to stay alive as long as possible! Navigate through Bitcoin
                  and Ethereum obstacles while collecting power-ups. You start
                  with 5 lives. If you touch the bottom of the screen, you'll
                  bounce back up but lose 1 life!
                </p>
              </div>

              <div className="bg-black/30 p-6 rounded-xl border-2 border-yellow-400/30">
                <h3 className="text-xl sm:text-2xl font-black text-yellow-400 mb-4">
                  COLLECTIBLE ITEMS
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 bg-black/40 p-4 rounded-lg">
                    <img
                      src="/assets/generated/health-item-transparent.dim_48x48.png"
                      alt="Health"
                      className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0"
                    />
                    <div>
                      <p className="font-bold text-green-400 text-lg sm:text-xl mb-1">
                        ❤️ HEALTH
                      </p>
                      <p className="text-sm sm:text-base text-white/90">
                        Player gains +1 life (up to maximum of 5 lives)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-black/40 p-4 rounded-lg">
                    <img
                      src="/assets/generated/slowdown-item-transparent.dim_48x48.png"
                      alt="Slow Down"
                      className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0"
                    />
                    <div>
                      <p className="font-bold text-blue-400 text-lg sm:text-xl mb-1">
                        ⏰ SLOW DOWN
                      </p>
                      <p className="text-sm sm:text-base text-white/90">
                        Game speed reduced by 50% for 5 seconds
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-black/40 p-4 rounded-lg">
                    <img
                      src="/assets/generated/shield-item-transparent.dim_48x48.png"
                      alt="Shield"
                      className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0"
                    />
                    <div>
                      <p className="font-bold text-cyan-400 text-lg sm:text-xl mb-1">
                        🛡️ SHIELD
                      </p>
                      <p className="text-sm sm:text-base text-white/90">
                        Player becomes invincible for 5 seconds (no health lost
                        from obstacles or hazards)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 bg-black/40 p-4 rounded-lg">
                    <img
                      src="/assets/generated/comet-item-transparent.dim_48x48.png"
                      alt="Comet"
                      className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0"
                    />
                    <div>
                      <p className="font-bold text-orange-400 text-lg sm:text-xl mb-1">
                        🔥 COMET
                      </p>
                      <p className="text-sm sm:text-base text-white/90">
                        Player loses 1 life
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <Button
                  onClick={() => setShowItemsList(false)}
                  size="lg"
                  data-ocid="start.close_button"
                  className="text-xl px-8 py-6 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-black rounded-full shadow-xl"
                >
                  CLOSE
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Nickname Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent
          data-ocid="start.dialog"
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
                htmlFor="start-change-nickname"
                className="text-white font-semibold"
              >
                New Nickname (2–20 characters)
              </Label>
              <Input
                id="start-change-nickname"
                data-ocid="start.input"
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
                  data-ocid="start.error_state"
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
                data-ocid="start.cancel_button"
                onClick={() => setShowChangeDialog(false)}
                className="bg-transparent border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="start.confirm_button"
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
