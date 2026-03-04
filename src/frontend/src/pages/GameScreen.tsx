import { useGameLoop } from "@/hooks/useGameLoop";
import { Clock, Heart, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface GameScreenProps {
  onGameOver: (score: number) => void;
  isCountdown?: boolean;
  onCountdownComplete?: () => void;
  isMuted?: boolean;
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "bitcoin" | "ethereum";
  passed: boolean;
}

type ItemType = "health" | "slowdown" | "shield" | "comet";

interface StationaryItem {
  x: number;
  y: number;
  type: ItemType;
  collected: boolean;
}

interface PowerUp {
  type: "shield" | "slowdown";
  endTime: number;
}

export default function GameScreen({
  onGameOver,
  isCountdown = false,
  onCountdownComplete,
  isMuted = false,
}: GameScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [countdownValue, setCountdownValue] = useState<number | string>(3);
  const [showCountdown, setShowCountdown] = useState(isCountdown);
  const [damageFlash, setDamageFlash] = useState(false);
  const [activePowerUps, setActivePowerUps] = useState<PowerUp[]>([]);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const invulnerableRef = useRef(false);
  const bouncingRef = useRef(false);

  const gameStateRef = useRef({
    birdY: 0,
    birdVelocity: 0,
    obstacles: [] as Obstacle[],
    stationaryItems: [] as StationaryItem[],
    gameOver: false,
    frameCount: 0,
    currentSpeed: 2.5,
    lastObstacleX: -9999,
    baseSpeed: 2.5,
    cameraX: 0,
    lastGeneratedItemX: 10000,
  });

  const GRAVITY = 0.5;
  const JUMP_STRENGTH = -10;
  const BIRD_SIZE = 62.5;
  const OBSTACLE_WIDTH = 80;
  const GAP_SIZE = 308;
  const BASE_SPEED = 2.5;
  const SPEED_INCREMENT = 0.15;
  // Fixed pixel distance between obstacles — constant regardless of speed
  const OBSTACLE_PIXEL_SPACING = 320;
  const INVULNERABLE_TIME = 1000;
  const ITEM_SIZE = 47.3;
  const ITEM_COLLISION_RADIUS = 27.5;
  const BOUNCE_VELOCITY = -15;

  // Load images
  const imagesRef = useRef({
    bird: null as HTMLImageElement | null,
    bitcoin: null as HTMLImageElement | null,
    ethereum: null as HTMLImageElement | null,
    background: null as HTMLImageElement | null,
    healthItem: null as HTMLImageElement | null,
    slowdownItem: null as HTMLImageElement | null,
    shieldItem: null as HTMLImageElement | null,
    cometItem: null as HTMLImageElement | null,
  });

  // Check if shield is active
  const hasShield = activePowerUps.some((p) => p.type === "shield");
  const hasSlowdown = activePowerUps.some((p) => p.type === "slowdown");

  // Play countdown beep sound
  const playBeep = (frequency: number) => {
    if (isMuted) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (error) {
      console.log("Audio playback failed:", error);
    }
  };

  // Play damage sound
  const playDamageSound = () => {
    if (isMuted) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        50,
        ctx.currentTime + 0.3,
      );
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      console.log("Audio playback failed:", error);
    }
  };

  // Play bounce sound
  const playBounceSound = () => {
    if (isMuted) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(300, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        150,
        ctx.currentTime + 0.2,
      );
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (error) {
      console.log("Audio playback failed:", error);
    }
  };

  // Play item pickup sound
  const playPickupSound = (itemType: ItemType) => {
    if (isMuted) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }

      const ctx = audioContextRef.current;

      // Different sounds for different items
      const frequencies: Record<ItemType, number[]> = {
        health: [523, 659, 784],
        slowdown: [440, 554, 659],
        shield: [659, 784, 988],
        comet: [300, 250, 200],
      };

      const freqs = frequencies[itemType];
      let time = 0;

      for (const freq of freqs) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = itemType === "comet" ? "sawtooth" : "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + time);
        osc.connect(gain);
        gain.connect(ctx.destination);

        gain.gain.setValueAtTime(0.3, ctx.currentTime + time);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          ctx.currentTime + time + 0.15,
        );

        osc.start(ctx.currentTime + time);
        osc.stop(ctx.currentTime + time + 0.15);

        time += 0.1;
      }
    } catch (error) {
      console.log("Audio playback failed:", error);
    }
  };

  // Play power-up activation sound
  const playPowerUpSound = () => {
    if (isMuted) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (
          window.AudioContext || (window as any).webkitAudioContext
        )();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        1200,
        ctx.currentTime + 0.3,
      );
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (error) {
      console.log("Audio playback failed:", error);
    }
  };

  // Handle losing a life
  const loseLife = () => {
    if (invulnerableRef.current || hasShield) return;

    const newLives = lives - 1;
    setLives(newLives);

    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 200);

    playDamageSound();

    if (newLives <= 0) {
      gameStateRef.current.gameOver = true;
      onGameOver(score);
    } else {
      const canvas = canvasRef.current;
      if (canvas) {
        gameStateRef.current.birdY = canvas.height / 2;
        gameStateRef.current.birdVelocity = 0;
      }

      invulnerableRef.current = true;
      setTimeout(() => {
        invulnerableRef.current = false;
      }, INVULNERABLE_TIME);
    }
  };

  // Handle bottom bounce
  const handleBottomBounce = () => {
    if (invulnerableRef.current || hasShield || bouncingRef.current) return;

    const newLives = lives - 1;
    setLives(newLives);

    // Visual feedback
    setDamageFlash(true);
    setTimeout(() => setDamageFlash(false), 300);

    // Sound feedback
    playBounceSound();

    if (newLives <= 0) {
      gameStateRef.current.gameOver = true;
      onGameOver(score);
    } else {
      // Bounce the character back up
      gameStateRef.current.birdVelocity = BOUNCE_VELOCITY;

      // Set bouncing flag to prevent multiple bounces
      bouncingRef.current = true;

      // Set invulnerable temporarily
      invulnerableRef.current = true;
      setTimeout(() => {
        invulnerableRef.current = false;
        bouncingRef.current = false;
      }, INVULNERABLE_TIME);
    }
  };

  // Handle item collection
  const collectItem = (item: StationaryItem) => {
    playPickupSound(item.type);

    switch (item.type) {
      case "health":
        if (lives < 5) {
          setLives((prev) => Math.min(prev + 1, 5));
        }
        break;

      case "slowdown":
        setActivePowerUps((prev) => {
          const filtered = prev.filter((p) => p.type !== "slowdown");
          return [
            ...filtered,
            { type: "slowdown", endTime: Date.now() + 5000 },
          ];
        });
        playPowerUpSound();
        break;

      case "shield":
        setActivePowerUps((prev) => {
          const filtered = prev.filter((p) => p.type !== "shield");
          return [...filtered, { type: "shield", endTime: Date.now() + 5000 }];
        });
        playPowerUpSound();
        break;

      case "comet":
        loseLife();
        break;
    }
  };

  // Generate stationary items along the course
  const generateStationaryItems = (canvas: HTMLCanvasElement) => {
    const items: StationaryItem[] = [];
    const _itemTypes: ItemType[] = ["health", "slowdown", "shield", "comet"];

    for (let x = 800; x < 10000; x += 400 + Math.random() * 200) {
      const y = 100 + Math.random() * (canvas.height - 200);

      const rand = Math.random();
      let itemType: ItemType;

      if (rand < 0.35) itemType = "health";
      else if (rand < 0.6) itemType = "slowdown";
      else if (rand < 0.85) itemType = "shield";
      else itemType = "comet";

      items.push({
        x,
        y,
        type: itemType,
        collected: false,
      });
    }

    return items;
  };

  // Update power-ups
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActivePowerUps((prev) => prev.filter((p) => p.endTime > now));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Countdown logic
  // biome-ignore lint/correctness/useExhaustiveDependencies: playBeep is an inline fn; including it would cause infinite re-runs
  useEffect(
    () => {
      if (!isCountdown) return;

      const countdown = [3, 2, 1, "Fly!"];
      let currentIndex = 0;

      const runCountdown = () => {
        if (currentIndex < countdown.length) {
          const value = countdown[currentIndex];
          setCountdownValue(value);

          if (typeof value === "number") {
            playBeep(400 + value * 100);
          } else {
            playBeep(800);
          }

          currentIndex++;
          countdownTimerRef.current = setTimeout(runCountdown, 1000);
        } else {
          setShowCountdown(false);
          if (onCountdownComplete) {
            onCountdownComplete();
          }
        }
      };

      runCountdown();

      return () => {
        if (countdownTimerRef.current) {
          clearTimeout(countdownTimerRef.current);
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isCountdown, onCountdownComplete],
  );

  useEffect(() => {
    const bird = new Image();
    bird.src =
      "/assets/generated/bitty-character-sprite-transparent.dim_128x128.png";
    imagesRef.current.bird = bird;

    const background = new Image();
    background.src = "/assets/generated/space-background.dim_1024x768.png";
    imagesRef.current.background = background;

    const healthItem = new Image();
    healthItem.src = "/assets/generated/health-item-transparent.dim_48x48.png";
    imagesRef.current.healthItem = healthItem;

    const slowdownItem = new Image();
    slowdownItem.src =
      "/assets/generated/slowdown-item-transparent.dim_48x48.png";
    imagesRef.current.slowdownItem = slowdownItem;

    const shieldItem = new Image();
    shieldItem.src = "/assets/generated/shield-item-transparent.dim_48x48.png";
    imagesRef.current.shieldItem = shieldItem;

    const cometItem = new Image();
    cometItem.src = "/assets/generated/comet-item-transparent.dim_48x48.png";
    imagesRef.current.cometItem = cometItem;

    const bitcoin = new Image();
    bitcoin.src = `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#F7931A" stroke="#fff" stroke-width="2"/>
        <text x="50" y="70" font-size="60" font-weight="bold" fill="#fff" text-anchor="middle" font-family="Arial">₿</text>
      </svg>
    `)}`;
    imagesRef.current.bitcoin = bitcoin;

    const ethereum = new Image();
    ethereum.src = `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="#627EEA" stroke="#fff" stroke-width="2"/>
        <path d="M50 20 L50 45 L70 52 Z" fill="#fff" opacity="0.6"/>
        <path d="M50 20 L30 52 L50 45 Z" fill="#fff"/>
        <path d="M50 58 L50 80 L70 56 Z" fill="#fff" opacity="0.6"/>
        <path d="M50 58 L30 56 L50 80 Z" fill="#fff"/>
      </svg>
    `)}`;
    imagesRef.current.ethereum = ethereum;
  }, []);

  const handleJump = () => {
    if (!gameStateRef.current.gameOver && !showCountdown) {
      gameStateRef.current.birdVelocity = JUMP_STRENGTH;
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: generateStationaryItems and handleJump are inline fns; empty array is intentional for one-time setup
  useEffect(
    () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      gameStateRef.current.birdY = canvas.height / 2;
      gameStateRef.current.birdVelocity = 0;
      gameStateRef.current.obstacles = [];
      gameStateRef.current.stationaryItems = generateStationaryItems(canvas);
      gameStateRef.current.gameOver = false;
      gameStateRef.current.frameCount = 0;
      gameStateRef.current.currentSpeed = BASE_SPEED;
      gameStateRef.current.baseSpeed = BASE_SPEED;
      // Start negative so first obstacle appears after ~canvas.width pixels of travel
      gameStateRef.current.lastObstacleX = -canvas.width * 0.8;
      gameStateRef.current.cameraX = 0;
      gameStateRef.current.lastGeneratedItemX = 10000;
      invulnerableRef.current = false;
      bouncingRef.current = false;

      const handleClick = () => handleJump();
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.code === "Space" || e.code === "ArrowUp") {
          e.preventDefault();
          handleJump();
        }
      };

      canvas.addEventListener("click", handleClick);
      window.addEventListener("keydown", handleKeyPress);

      return () => {
        canvas.removeEventListener("click", handleClick);
        window.removeEventListener("keydown", handleKeyPress);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const gameLoop = (_deltaTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || gameStateRef.current.gameOver) return;

    const state = gameStateRef.current;

    const speedMultiplier = hasSlowdown ? 0.5 : 1.0;
    state.baseSpeed = BASE_SPEED + score * SPEED_INCREMENT;
    state.currentSpeed = state.baseSpeed * speedMultiplier;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (imagesRef.current.background?.complete) {
      ctx.drawImage(
        imagesRef.current.background,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    } else {
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, "#0a0e27");
      gradient.addColorStop(0.5, "#1a1f3a");
      gradient.addColorStop(1, "#0f1419");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < 50; i++) {
        const x = (i * 137.5) % canvas.width;
        const y = (i * 197.3) % canvas.height;
        const size = Math.random() * 2;
        ctx.fillRect(x, y, size, size);
      }
    }

    if (!showCountdown) {
      state.birdVelocity += GRAVITY;
      state.birdY += state.birdVelocity;

      state.cameraX += state.currentSpeed;

      // Check if bird touched the bottom
      if (state.birdY + BIRD_SIZE >= canvas.height) {
        handleBottomBounce();
        // Clamp position to prevent going through floor
        state.birdY = canvas.height - BIRD_SIZE;
      }

      const birdX = canvas.width * 0.2;
      const birdCenterX = birdX + BIRD_SIZE / 2;
      const birdCenterY = state.birdY + BIRD_SIZE / 2;

      // Dynamically generate more items as the player advances
      if (state.cameraX + canvas.width * 3 > state.lastGeneratedItemX) {
        const batchStart = state.lastGeneratedItemX;
        const batchEnd = batchStart + 8000;
        for (
          let x = batchStart + 400 + Math.random() * 200;
          x < batchEnd;
          x += 400 + Math.random() * 200
        ) {
          const y = 100 + Math.random() * (canvas.height - 200);
          const rand = Math.random();
          let itemType: ItemType;
          if (rand < 0.35) itemType = "health";
          else if (rand < 0.6) itemType = "slowdown";
          else if (rand < 0.85) itemType = "shield";
          else itemType = "comet";
          state.stationaryItems.push({
            x,
            y,
            type: itemType,
            collected: false,
          });
        }
        state.lastGeneratedItemX = batchEnd;
      }

      // Clean up old off-screen items to prevent memory bloat
      state.stationaryItems = state.stationaryItems.filter(
        (item) => item.x >= state.cameraX - 200,
      );

      for (let i = state.stationaryItems.length - 1; i >= 0; i--) {
        const item = state.stationaryItems[i];

        if (item.collected) continue;

        const itemScreenX = item.x - state.cameraX;

        if (itemScreenX > -100 && itemScreenX < canvas.width + 100) {
          const floatOffset = Math.sin(Date.now() / 200 + i) * 3;
          const itemImg = imagesRef.current[
            `${item.type}Item` as keyof typeof imagesRef.current
          ] as HTMLImageElement | null;

          if (itemImg?.complete) {
            ctx.save();
            ctx.translate(
              itemScreenX + ITEM_SIZE / 2,
              item.y + ITEM_SIZE / 2 + floatOffset,
            );
            ctx.rotate(Math.sin(Date.now() / 500 + i) * 0.2);
            ctx.drawImage(
              itemImg,
              -ITEM_SIZE / 2,
              -ITEM_SIZE / 2,
              ITEM_SIZE,
              ITEM_SIZE,
            );
            ctx.restore();
          } else {
            ctx.font = "44px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            const emojis: Record<ItemType, string> = {
              health: "❤️",
              slowdown: "⏰",
              shield: "🛡️",
              comet: "🔥",
            };
            ctx.fillText(
              emojis[item.type],
              itemScreenX + ITEM_SIZE / 2,
              item.y + ITEM_SIZE / 2 + floatOffset,
            );
          }

          const itemCenterX = itemScreenX + ITEM_SIZE / 2;
          const itemCenterY = item.y + ITEM_SIZE / 2;

          const distance = Math.sqrt(
            (birdCenterX - itemCenterX) ** 2 + (birdCenterY - itemCenterY) ** 2,
          );

          if (distance < ITEM_COLLISION_RADIUS) {
            item.collected = true;
            collectItem(item);
          }
        }
      }

      state.frameCount++;
      // Spawn obstacles based on fixed pixel distance traveled (cameraX),
      // so physical gap between obstacles stays constant regardless of speed.
      // lastObstacleX stores the cameraX value when the last obstacle was spawned.
      if (state.cameraX - state.lastObstacleX >= OBSTACLE_PIXEL_SPACING) {
        const gapY = Math.random() * (canvas.height - GAP_SIZE - 100) + 50;
        const type = Math.random() > 0.5 ? "bitcoin" : "ethereum";

        state.obstacles.push({
          x: canvas.width,
          y: 0,
          width: OBSTACLE_WIDTH,
          height: gapY,
          type,
          passed: false,
        });

        state.obstacles.push({
          x: canvas.width,
          y: gapY + GAP_SIZE,
          width: OBSTACLE_WIDTH,
          height: canvas.height - (gapY + GAP_SIZE),
          type,
          passed: false,
        });

        state.lastObstacleX = state.cameraX;
      }

      for (let i = state.obstacles.length - 1; i >= 0; i--) {
        const obstacle = state.obstacles[i];
        obstacle.x -= state.currentSpeed;

        const img =
          obstacle.type === "bitcoin"
            ? imagesRef.current.bitcoin
            : imagesRef.current.ethereum;

        if (img?.complete) {
          const logoSize = 60;
          for (
            let y = obstacle.y;
            y < obstacle.y + obstacle.height;
            y += logoSize
          ) {
            const drawHeight = Math.min(
              logoSize,
              obstacle.y + obstacle.height - y,
            );
            ctx.drawImage(img, obstacle.x, y, obstacle.width, drawHeight);
          }
        } else {
          ctx.fillStyle = obstacle.type === "bitcoin" ? "#F7931A" : "#627EEA";
          ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }

        if (!obstacle.passed && obstacle.x + obstacle.width < birdX) {
          obstacle.passed = true;
          if (i % 2 === 0) {
            setScore((s) => s + 1);
          }
        }

        if (obstacle.x + obstacle.width < 0) {
          state.obstacles.splice(i, 1);
        }

        if (
          !invulnerableRef.current &&
          !hasShield &&
          birdX < obstacle.x + obstacle.width &&
          birdX + BIRD_SIZE > obstacle.x &&
          state.birdY < obstacle.y + obstacle.height &&
          state.birdY + BIRD_SIZE > obstacle.y
        ) {
          loseLife();
        }
      }

      if (state.birdY < 0 && !invulnerableRef.current && !hasShield) {
        loseLife();
      }
    }

    const birdX = canvas.width * 0.2;
    const shouldDrawBird =
      !invulnerableRef.current || Math.floor(Date.now() / 100) % 2 === 0;

    if (shouldDrawBird) {
      if (hasShield) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.2;
        ctx.fillStyle = "#00ffff";
        ctx.beginPath();
        ctx.arc(
          birdX + BIRD_SIZE / 2,
          state.birdY + BIRD_SIZE / 2,
          BIRD_SIZE * 0.8,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        ctx.restore();
      }

      if (imagesRef.current.bird?.complete) {
        ctx.save();
        ctx.translate(birdX + BIRD_SIZE / 2, state.birdY + BIRD_SIZE / 2);
        const rotation = showCountdown
          ? 0
          : Math.min(Math.max(state.birdVelocity * 0.05, -0.5), 0.5);
        ctx.rotate(rotation);
        ctx.drawImage(
          imagesRef.current.bird,
          -BIRD_SIZE / 2,
          -BIRD_SIZE / 2,
          BIRD_SIZE,
          BIRD_SIZE,
        );
        ctx.restore();
      } else {
        ctx.fillStyle = "#ff8800";
        ctx.beginPath();
        ctx.arc(
          birdX + BIRD_SIZE / 2,
          state.birdY + BIRD_SIZE / 2,
          BIRD_SIZE / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }

    if (!showCountdown) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 4;
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      ctx.strokeText(score.toString(), canvas.width / 2, 60);
      ctx.fillText(score.toString(), canvas.width / 2, 60);

      ctx.font = "bold 16px Arial";
      ctx.textAlign = "left";
      const speedText = `Speed: ${state.currentSpeed.toFixed(1)}x`;
      ctx.strokeText(speedText, 20, canvas.height - 20);
      ctx.fillText(speedText, 20, canvas.height - 20);
    }
  };

  useGameLoop(gameLoop);

  const getTimeRemaining = (type: "shield" | "slowdown") => {
    const powerUp = activePowerUps.find((p) => p.type === type);
    if (!powerUp) return 0;
    return Math.max(0, Math.ceil((powerUp.endTime - Date.now()) / 1000));
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center bg-black">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="max-w-full max-h-full border-4 border-yellow-400 rounded-lg shadow-2xl cursor-pointer"
        tabIndex={0}
      />

      {damageFlash && (
        <div className="absolute inset-0 bg-red-500 opacity-40 pointer-events-none animate-pulse" />
      )}

      {showCountdown && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center animate-countdown-pop">
            <div className="text-9xl font-black text-yellow-400 drop-shadow-[0_0_40px_rgba(250,204,21,1)] animate-pulse">
              {countdownValue}
            </div>
          </div>
        </div>
      )}

      {!showCountdown && (
        <div className="absolute top-4 left-4 flex gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Heart
              // biome-ignore lint/suspicious/noArrayIndexKey: static decorative array
              key={`heart-${index}`}
              className={`w-8 h-8 transition-all duration-200 ${
                index < lives
                  ? "fill-red-500 text-red-500"
                  : "fill-gray-600 text-gray-600"
              } ${damageFlash && index === lives ? "animate-ping" : ""}`}
            />
          ))}
        </div>
      )}

      {!showCountdown && activePowerUps.length > 0 && (
        <div className="absolute top-4 left-4 mt-12 flex flex-col gap-2">
          {hasShield && (
            <div className="flex items-center gap-2 bg-cyan-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-semibold animate-pulse">
              <Shield className="w-4 h-4" />
              <span>Shield: {getTimeRemaining("shield")}s</span>
            </div>
          )}
          {hasSlowdown && (
            <div className="flex items-center gap-2 bg-blue-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-sm font-semibold animate-pulse">
              <Clock className="w-4 h-4" />
              <span>Slow: {getTimeRemaining("slowdown")}s</span>
            </div>
          )}
        </div>
      )}

      {!showCountdown && (
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm">
          <p className="font-semibold">Controls:</p>
          <p>Click or Space to fly</p>
        </div>
      )}
    </div>
  );
}
