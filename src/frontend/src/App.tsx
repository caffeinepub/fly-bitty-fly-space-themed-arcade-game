import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import ChatPage from "./pages/ChatPage";
import GameOverScreen from "./pages/GameOverScreen";
import GameScreen from "./pages/GameScreen";
import LeaderboardPage from "./pages/LeaderboardPage";
import StartScreen from "./pages/StartScreen";
import { MusicSynth } from "./utils/musicSynth";

type GameState =
  | "start"
  | "countdown"
  | "playing"
  | "gameOver"
  | "leaderboard"
  | "chat";

function App() {
  const [gameState, setGameState] = useState<GameState>("start");
  const [finalScore, setFinalScore] = useState(0);
  const synthRef = useRef<MusicSynth | null>(null);
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem("flyBittyFly_musicMuted");
    return saved === "true";
  });
  const { identity } = useInternetIdentity();
  const _isAuthenticated = !!identity; // kept for future use

  // Initialize synth
  useEffect(() => {
    synthRef.current = new MusicSynth();
    return () => {
      synthRef.current?.destroy();
    };
  }, []);

  // Sync mute state
  useEffect(() => {
    synthRef.current?.setMuted(isMuted);
    localStorage.setItem("flyBittyFly_musicMuted", isMuted.toString());
  }, [isMuted]);

  // Control music based on game state
  // biome-ignore lint/correctness/useExhaustiveDependencies: isMuted is intentionally excluded; mute toggling is handled by the separate setMuted effect
  useEffect(() => {
    if (gameState === "playing" || gameState === "countdown") {
      synthRef.current?.start(isMuted);
    } else if (
      gameState === "gameOver" ||
      gameState === "start" ||
      gameState === "leaderboard" ||
      gameState === "chat"
    ) {
      synthRef.current?.stop();
    }
  }, [gameState]);

  const handleStartGame = () => {
    setGameState("countdown");
    setFinalScore(0);
  };

  const handleCountdownComplete = () => {
    setGameState("playing");
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    setGameState("gameOver");
  };

  const handleRestart = () => {
    setGameState("countdown");
    setFinalScore(0);
  };

  const handleBackToStart = () => {
    setGameState("start");
    setFinalScore(0);
  };

  const handleNavigateLeaderboard = () => {
    setGameState("leaderboard");
  };

  const handleNavigateChat = () => {
    setGameState("chat");
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  return (
    <div className="w-full min-h-screen">
      {gameState === "start" && (
        <StartScreen
          onStart={handleStartGame}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onNavigateLeaderboard={handleNavigateLeaderboard}
          onNavigateChat={handleNavigateChat}
        />
      )}
      {gameState === "leaderboard" && (
        <LeaderboardPage onBack={handleBackToStart} />
      )}
      {gameState === "chat" && <ChatPage onBack={handleBackToStart} />}
      {gameState === "countdown" && (
        <GameScreen
          onGameOver={handleGameOver}
          isCountdown={true}
          onCountdownComplete={handleCountdownComplete}
          isMuted={isMuted}
        />
      )}
      {gameState === "playing" && (
        <GameScreen
          onGameOver={handleGameOver}
          isCountdown={false}
          isMuted={isMuted}
        />
      )}
      {gameState === "gameOver" && (
        <GameOverScreen
          score={finalScore}
          onRestart={handleRestart}
          onBackToStart={handleBackToStart}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      )}
    </div>
  );
}

export default App;
