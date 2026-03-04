import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Award,
  Crown,
  Home,
  Loader2,
  Medal,
  Pencil,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import LoginButton from "../components/LoginButton";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useChangeNickname,
  useGetCallerNickname,
  useGetTopScores,
  useGetWeeklyTopScores,
  useSaveNickname,
  useSubmitScore,
  useValidateNickname,
} from "../hooks/useQueries";

interface GameOverScreenProps {
  score: number;
  onRestart: () => void;
  onBackToStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export default function GameOverScreen({
  score,
  onRestart,
  onBackToStart,
  isMuted,
  onToggleMute,
}: GameOverScreenProps) {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;
  const submitScore = useSubmitScore();
  const { data: topScores, isLoading: loadingTopScores } = useGetTopScores();
  const { data: weeklyTopScores, isLoading: loadingWeeklyScores } =
    useGetWeeklyTopScores();
  const { data: currentNickname, isLoading: loadingNickname } =
    useGetCallerNickname();
  const validateNickname = useValidateNickname();
  const saveNickname = useSaveNickname();
  const changeNickname = useChangeNickname();

  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [nickname, setNickname] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [changeNicknameValue, setChangeNicknameValue] = useState("");
  const [changeNicknameError, setChangeNicknameError] = useState("");

  // Track if we've attempted auto-submit to prevent repeated attempts
  const submitAttemptedRef = useRef(false);

  // STEP 3: Authenticated + HAS nickname → auto-submit once
  // biome-ignore lint/correctness/useExhaustiveDependencies: submitScore.mutate is stable ref
  useEffect(() => {
    if (
      isAuthenticated &&
      !loadingNickname &&
      currentNickname &&
      score > 0 &&
      !scoreSubmitted &&
      !submitScore.isPending &&
      !submitAttemptedRef.current
    ) {
      submitAttemptedRef.current = true;
      submitScore.mutate(score, {
        onSuccess: () => setScoreSubmitted(true),
        onError: (error) => {
          console.error("Failed to submit score:", error);
          setScoreSubmitted(true);
        },
      });
    }
  }, [
    isAuthenticated,
    loadingNickname,
    currentNickname,
    score,
    scoreSubmitted,
    submitScore.isPending,
  ]);

  const validateNicknameLocal = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length < 2) return "Nickname must be at least 2 characters";
    if (trimmed.length > 20) return "Nickname must be 20 characters or less";
    return null;
  };

  // STEP 2: Save nickname then submit score
  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNicknameError("");

    const trimmed = nickname.trim();
    const localError = validateNicknameLocal(trimmed);
    if (localError) {
      setNicknameError(localError);
      return;
    }

    try {
      await validateNickname.mutateAsync(trimmed);
      await saveNickname.mutateAsync(trimmed);
      setNickname("");
      // After saving nickname, submit the score
      if (score > 0 && !submitAttemptedRef.current) {
        submitAttemptedRef.current = true;
        submitScore.mutate(score, {
          onSuccess: () => setScoreSubmitted(true),
          onError: (error) => {
            console.error("Failed to submit score:", error);
            setScoreSubmitted(true);
          },
        });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("already exists") || msg.includes("taken")) {
        setNicknameError(
          "This nickname is already taken. Please choose another.",
        );
      } else {
        setNicknameError("Failed to save nickname. Please try again.");
      }
    }
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

  const getRankIcon = (index: number): React.ReactElement => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-300" />;
    if (index === 2) return <Award className="h-5 w-5 text-orange-400" />;
    return <span className="text-white/60 font-bold">{index + 1}</span>;
  };

  // Determine which step we're in for score submission
  const needsNickname =
    isAuthenticated &&
    !loadingNickname &&
    currentNickname === null &&
    score > 0;
  const needsLogin = !isAuthenticated && score > 0;
  const hasNickname = isAuthenticated && !loadingNickname && !!currentNickname;

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background stars */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(50)].map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static decorative array
            key={`star-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${1 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Mute Toggle Button - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <Button
          onClick={onToggleMute}
          size="icon"
          variant="outline"
          data-ocid="gameover.toggle"
          className="bg-black/60 backdrop-blur-sm border-white/30 hover:bg-black/80 text-white"
          aria-label={isMuted ? "Unmute music" : "Mute music"}
        >
          {isMuted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </Button>
      </div>

      <Card className="relative z-10 w-full max-w-2xl mx-4 bg-gradient-to-br from-slate-800/90 to-purple-900/90 backdrop-blur-lg border-4 border-yellow-400 shadow-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-yellow-400 p-4 rounded-full animate-bounce">
              <Trophy className="h-12 w-12 text-slate-900" />
            </div>
          </div>
          <CardTitle className="text-4xl font-black text-yellow-400 tracking-wide">
            GAME OVER
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center space-y-2">
            <p className="text-white/80 text-lg">Your Score</p>
            <p className="text-6xl font-black text-white drop-shadow-lg">
              {score}
            </p>
            <p className="text-white/60 text-sm">
              {score === 0 && "Don't give up! Try again!"}
              {score > 0 && score < 5 && "Good start! Keep practicing!"}
              {score >= 5 &&
                score < 10 &&
                "Nice flying! You're getting better!"}
              {score >= 10 && score < 20 && "Great job! You're a natural!"}
              {score >= 20 && "Amazing! You're a crypto pilot!"}
            </p>

            {/* STEP 1: Not authenticated, show login prompt */}
            {needsLogin && (
              <div
                data-ocid="gameover.section"
                className="mt-4 bg-slate-700/50 p-4 rounded-lg border-2 border-yellow-400/40 space-y-3"
              >
                <p className="text-yellow-400 text-sm font-semibold">
                  💡 Login to save your score and compete on the leaderboard!
                </p>
                <div className="flex justify-center">
                  <LoginButton />
                </div>
              </div>
            )}

            {/* Score submitted success */}
            {isAuthenticated && scoreSubmitted && submitScore.isSuccess && (
              <p
                data-ocid="gameover.success_state"
                className="text-green-400 text-sm font-semibold mt-2"
              >
                ✓ Score submitted to the leaderboard!
              </p>
            )}
            {isAuthenticated && scoreSubmitted && submitScore.isError && (
              <p
                data-ocid="gameover.error_state"
                className="text-red-400 text-sm font-semibold mt-2"
              >
                ⚠ Failed to submit score. Please try again.
              </p>
            )}
            {isAuthenticated && submitScore.isPending && (
              <p
                data-ocid="gameover.loading_state"
                className="text-yellow-400 text-sm font-semibold mt-2 flex items-center justify-center gap-2"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting score…
              </p>
            )}
          </div>

          {/* STEP 2: Authenticated but no nickname yet — show nickname form */}
          {needsNickname && (
            <div className="bg-slate-700/50 p-6 rounded-lg border-2 border-yellow-400/50 space-y-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-bold text-yellow-400 mb-1">
                    Choose Your Nickname
                  </h3>
                  <p className="text-white/80 text-sm">
                    Pick a unique nickname to submit your score. This will be
                    your permanent display name on the leaderboard.
                  </p>
                </div>
              </div>
              <form onSubmit={handleNicknameSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="nickname"
                    className="text-white font-semibold"
                  >
                    Nickname (2–20 characters)
                  </Label>
                  <Input
                    id="nickname"
                    data-ocid="gameover.input"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter your nickname"
                    className="bg-slate-800 border-slate-600 text-white placeholder:text-white/40"
                    maxLength={20}
                    autoFocus
                  />
                  {nicknameError && (
                    <p
                      data-ocid="gameover.error_state"
                      className="text-red-400 text-sm flex items-center gap-1"
                    >
                      <AlertCircle className="h-4 w-4" />
                      {nicknameError}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  data-ocid="gameover.submit_button"
                  className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold"
                  disabled={
                    validateNickname.isPending || saveNickname.isPending
                  }
                >
                  {validateNickname.isPending || saveNickname.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Save Nickname & Submit Score"
                  )}
                </Button>
              </form>
            </div>
          )}

          {/* Change Nickname button — visible only for authenticated users who already have a nickname */}
          {hasNickname && (
            <div className="flex items-center justify-between bg-slate-700/30 px-4 py-3 rounded-lg">
              <p className="text-white/70 text-sm">
                Playing as{" "}
                <span className="text-yellow-400 font-bold">
                  {currentNickname}
                </span>
              </p>
              <Button
                variant="outline"
                size="sm"
                data-ocid="gameover.edit_button"
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

          {/* Leaderboards */}
          <Tabs defaultValue="alltime" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700/50">
              <TabsTrigger
                value="alltime"
                data-ocid="gameover.tab"
                className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
              >
                All-Time
              </TabsTrigger>
              <TabsTrigger
                value="weekly"
                data-ocid="gameover.tab"
                className="data-[state=active]:bg-yellow-400 data-[state=active]:text-black"
              >
                This Week
              </TabsTrigger>
            </TabsList>
            <TabsContent value="alltime" className="mt-4">
              <LeaderboardList
                scores={topScores}
                isLoading={loadingTopScores}
                getRankIcon={getRankIcon}
              />
            </TabsContent>
            <TabsContent value="weekly" className="mt-4">
              <LeaderboardList
                scores={weeklyTopScores}
                isLoading={loadingWeeklyScores}
                getRankIcon={getRankIcon}
              />
            </TabsContent>
          </Tabs>

          <div className="space-y-3">
            <Button
              onClick={onRestart}
              size="lg"
              data-ocid="gameover.primary_button"
              className="w-full text-xl py-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-lg shadow-lg transform hover:scale-105 transition-all"
            >
              <RotateCcw className="mr-2 h-6 w-6" />
              Play Again
            </Button>
            <Button
              onClick={onBackToStart}
              size="lg"
              variant="outline"
              data-ocid="gameover.secondary_button"
              className="w-full text-lg py-6 bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 font-semibold rounded-lg backdrop-blur-sm transform hover:scale-105 transition-all"
            >
              <Home className="mr-2 h-5 w-5" />
              Main Menu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 text-center text-white/60 text-sm">
        <p>
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 underline"
          >
            caffeine.ai
          </a>
        </p>
      </div>

      {/* Change Nickname Dialog */}
      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent
          data-ocid="gameover.dialog"
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
                htmlFor="change-nickname"
                className="text-white font-semibold"
              >
                New Nickname (2–20 characters)
              </Label>
              <Input
                id="change-nickname"
                data-ocid="gameover.input"
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
                  data-ocid="gameover.error_state"
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
                data-ocid="gameover.cancel_button"
                onClick={() => setShowChangeDialog(false)}
                className="bg-transparent border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                data-ocid="gameover.confirm_button"
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

interface LeaderboardListProps {
  scores?: Array<{ nickname: string; score: bigint }>;
  isLoading: boolean;
  getRankIcon: (index: number) => React.ReactElement;
}

function LeaderboardList({
  scores,
  isLoading,
  getRankIcon,
}: LeaderboardListProps) {
  if (isLoading) {
    return (
      <div
        data-ocid="leaderboard.loading_state"
        className="bg-slate-700/30 rounded-lg p-6 text-center"
      >
        <p className="text-white/60">Loading leaderboard…</p>
      </div>
    );
  }

  // Filter out entries with empty/blank nicknames
  const filteredScores =
    scores?.filter((e) => e.nickname && e.nickname.trim() !== "") ?? [];

  if (filteredScores.length === 0) {
    return (
      <div
        data-ocid="leaderboard.empty_state"
        className="bg-slate-700/30 rounded-lg p-6 text-center"
      >
        <p className="text-white/60">No scores yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
      <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-yellow-400" />
        Top 10 Pilots
      </h3>
      {filteredScores.map((entry, index) => (
        <div
          key={`${entry.nickname}-${index}`}
          data-ocid={`leaderboard.item.${index + 1}`}
          className="flex items-center justify-between p-3 rounded-lg bg-slate-600/30"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 flex justify-center">{getRankIcon(index)}</div>
            <div>
              <p className="font-semibold text-white">{entry.nickname}</p>
            </div>
          </div>
          <div className="text-xl font-bold text-white">
            {Number(entry.score)}
          </div>
        </div>
      ))}
    </div>
  );
}
