import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Rocket, Send, Shield, Trash2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import LoginButton from "../components/LoginButton";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useAddReaction,
  useDeleteChatMessage,
  useGetCallerNickname,
  useGetChatMessages,
  useModeratorDeleteMessage,
  usePostChatMessage,
  useRemoveReaction,
} from "../hooks/useQueries";

interface ChatPageProps {
  onBack: () => void;
}

const EMOJI_PICKER_OPTIONS = ["🔥", "⭐", "💫", "👾", "🚀", "😂", "👏", "❤️"];

function formatRelativeTime(timestampNs: bigint): string {
  const ms = Number(timestampNs / 1_000_000n);
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

type ChatMessage = {
  id: bigint;
  authorNickname: string;
  text: string;
  timestamp: bigint;
  reactions: Array<[string, bigint]>;
};

interface MessageCardProps {
  message: ChatMessage;
  index: number;
  currentNickname: string | null | undefined;
  isAuthenticated: boolean;
  isModerator: boolean;
  userReactions: Record<string, Set<string>>;
  onToggleReaction: (
    messageId: bigint,
    emoji: string,
    hasReacted: boolean,
  ) => void;
  onDelete: (id: bigint) => void;
  onModDelete: (id: bigint) => void;
}

function MessageCard({
  message,
  index,
  currentNickname,
  isAuthenticated,
  isModerator,
  userReactions,
  onToggleReaction,
  onDelete,
  onModDelete,
}: MessageCardProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isOwn = currentNickname && message.authorNickname === currentNickname;
  const messageReactions =
    userReactions[message.id.toString()] ?? new Set<string>();

  // Close picker on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  return (
    <div
      data-ocid={`chat.message.item.${index}`}
      className="group relative bg-gradient-to-r from-slate-800/80 to-purple-900/60 backdrop-blur-sm border border-white/10 hover:border-yellow-400/30 rounded-2xl p-4 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-yellow-400 font-black text-sm truncate">
            {message.authorNickname}
          </span>
          {isOwn && (
            <span className="text-xs text-white/30 font-normal flex-shrink-0">
              (you)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-white/30 text-xs">
            {formatRelativeTime(message.timestamp)}
          </span>
          {/* Owner delete */}
          {isOwn && !isModerator && (
            <button
              type="button"
              data-ocid={`chat.delete_button.${index}`}
              onClick={() => onDelete(message.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-red-400 p-1 rounded"
              aria-label="Delete your message"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {/* Moderator delete */}
          {isModerator && (
            <button
              type="button"
              data-ocid={`chat.delete_button.${index}`}
              onClick={() => onModDelete(message.id)}
              className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
              aria-label="Moderator delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Message text */}
      <p className="text-white/90 text-sm leading-relaxed break-words">
        {message.text}
      </p>

      {/* Reactions row */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {message.reactions
          .filter(([, count]) => count > 0n)
          .map(([emoji, count]) => {
            const hasReacted = messageReactions.has(emoji);
            return (
              <button
                key={emoji}
                type="button"
                data-ocid="chat.reaction_button"
                onClick={() =>
                  isAuthenticated
                    ? onToggleReaction(message.id, emoji, hasReacted)
                    : undefined
                }
                className={`
                  flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all duration-150
                  ${
                    hasReacted
                      ? "bg-yellow-400/25 border border-yellow-400/60 text-yellow-300"
                      : "bg-white/10 border border-white/20 text-white/70 hover:bg-white/15 hover:border-white/30"
                  }
                  ${!isAuthenticated ? "cursor-default" : "cursor-pointer"}
                `}
              >
                <span>{emoji}</span>
                <span className="font-bold">{Number(count)}</span>
              </button>
            );
          })}

        {/* Add reaction picker */}
        {isAuthenticated && (
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              data-ocid="chat.emoji_picker"
              onClick={() => setShowEmojiPicker((prev) => !prev)}
              className="flex items-center justify-center w-7 h-7 rounded-full bg-white/10 border border-white/20 text-white/50 hover:bg-white/20 hover:text-white/80 text-sm transition-all duration-150"
              aria-label="Add reaction"
            >
              +
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-9 left-0 z-30 bg-slate-800 border border-yellow-400/40 rounded-xl p-2 shadow-2xl grid grid-cols-4 gap-1 min-w-[140px]">
                {EMOJI_PICKER_OPTIONS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => {
                      const hasReacted = messageReactions.has(em);
                      onToggleReaction(message.id, em, hasReacted);
                      setShowEmojiPicker(false);
                    }}
                    className={`
                      text-xl p-1.5 rounded-lg hover:bg-white/15 transition-colors
                      ${messageReactions.has(em) ? "bg-yellow-400/20" : ""}
                    `}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage({ onBack }: ChatPageProps) {
  const [messageInput, setMessageInput] = useState("");
  const [modPassword, setModPassword] = useState("");
  const [modPasswordError, setModPasswordError] = useState("");
  const [showModPanel, setShowModPanel] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  // Track which emojis the current user has reacted to per message
  // Format: { [messageId]: Set<emoji> }
  const [userReactions, setUserReactions] = useState<
    Record<string, Set<string>>
  >({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity;

  const { data: currentNickname } = useGetCallerNickname();
  const { data: rawMessages, isLoading } = useGetChatMessages();
  const postMessage = usePostChatMessage();
  const deleteMessage = useDeleteChatMessage();
  const modDeleteMessage = useModeratorDeleteMessage();
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  // Sort messages ascending (oldest first, newest at bottom)
  const messages: ChatMessage[] = rawMessages
    ? [...rawMessages]
        .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1))
        .slice(-50)
    : [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [isLoading, messages.length]);

  const handleSend = async () => {
    const trimmed = messageInput.trim();
    if (!trimmed || postMessage.isPending) return;
    setMessageInput("");
    try {
      await postMessage.mutateAsync(trimmed);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch {
      setMessageInput(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleToggleReaction = useCallback(
    (messageId: bigint, emoji: string, hasReacted: boolean) => {
      const key = messageId.toString();
      setUserReactions((prev) => {
        const current = new Set(prev[key] ?? []);
        if (hasReacted) {
          current.delete(emoji);
        } else {
          current.add(emoji);
        }
        return { ...prev, [key]: current };
      });
      if (hasReacted) {
        removeReaction.mutate({ messageId, emoji });
      } else {
        addReaction.mutate({ messageId, emoji });
      }
    },
    [addReaction, removeReaction],
  );

  const handleDelete = useCallback(
    (id: bigint) => {
      deleteMessage.mutate(id);
    },
    [deleteMessage],
  );

  const handleModDelete = useCallback(
    (id: bigint) => {
      modDeleteMessage.mutate({ id, password: "bittybittywhatwhat" });
    },
    [modDeleteMessage],
  );

  const handleModUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (modPassword === "bittybittywhatwhat") {
      setIsModerator(true);
      setShowModPanel(false);
      setModPassword("");
      setModPasswordError("");
    } else {
      setModPasswordError("Incorrect password.");
    }
  };

  const charCount = messageInput.length;
  const charWarning = charCount > 400;

  return (
    <div
      className="relative w-full min-h-screen flex flex-col"
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
            key={`chatstar-${i}`}
            className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
            style={{
              top: `${(i * 41.3) % 100}%`,
              left: `${(i * 67.7) % 100}%`,
              animationDelay: `${(i * 0.25) % 2}s`,
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
          data-ocid="chat.back_button"
          className="bg-black/60 backdrop-blur-sm border-white/30 hover:bg-black/80 text-white w-12 h-12"
          aria-label="Back to main menu"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      {/* MOD button (top-right) */}
      <div className="fixed top-4 right-4 z-20 flex items-center gap-2">
        {isModerator ? (
          <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/50 rounded-full px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-red-400" />
            <span className="text-red-300 text-xs font-bold">
              Moderator Mode Active
            </span>
          </div>
        ) : (
          <button
            type="button"
            data-ocid="chat.mod_button"
            onClick={() => setShowModPanel((prev) => !prev)}
            className="text-white/30 hover:text-white/60 text-xs font-bold transition-colors px-2 py-1"
            aria-label="Moderator access"
          >
            MOD
          </button>
        )}
      </div>

      {/* Mod password panel */}
      {showModPanel && !isModerator && (
        <div className="fixed top-14 right-4 z-30 bg-slate-800/95 backdrop-blur-md border border-yellow-400/40 rounded-xl p-4 shadow-2xl w-64">
          <p className="text-white/70 text-xs mb-3 font-semibold">
            Enter moderator password:
          </p>
          <form onSubmit={handleModUnlock} className="space-y-2">
            <Input
              type="password"
              data-ocid="chat.mod_input"
              value={modPassword}
              onChange={(e) => setModPassword(e.target.value)}
              placeholder="Password"
              className="bg-slate-700 border-slate-500 text-white placeholder:text-white/40 text-sm h-9"
              autoFocus
            />
            {modPasswordError && (
              <p className="text-red-400 text-xs">{modPasswordError}</p>
            )}
            <Button
              type="submit"
              data-ocid="chat.mod_confirm_button"
              size="sm"
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold text-xs h-8"
            >
              Unlock
            </Button>
          </form>
        </div>
      )}

      {/* Main Content */}
      <div
        className="relative z-10 flex flex-col w-full max-w-2xl mx-auto px-4 pt-20 pb-4"
        style={{ minHeight: "100vh" }}
      >
        {/* Header */}
        <div className="text-center space-y-1 mb-6">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-yellow-400 tracking-wider drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]">
            COSMIC CHAT
          </h1>
          <p className="text-white/60 text-sm sm:text-base">
            Chat with fellow pilots
          </p>
        </div>

        {/* Messages Container */}
        <div
          ref={scrollAreaRef}
          className="w-full bg-gradient-to-br from-slate-900/70 to-purple-900/70 backdrop-blur-lg border-2 border-yellow-400/30 rounded-2xl shadow-2xl overflow-y-auto"
          style={{
            minHeight: "300px",
            maxHeight: "calc(100vh - 300px)",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div className="p-4 space-y-3">
            {isLoading ? (
              <div
                data-ocid="chat.loading_state"
                className="flex flex-col items-center justify-center py-16 gap-3"
              >
                <Loader2 className="h-8 w-8 text-yellow-400 animate-spin" />
                <p className="text-white/50 text-sm">Loading messages…</p>
              </div>
            ) : messages.length === 0 ? (
              <div
                data-ocid="chat.empty_state"
                className="flex flex-col items-center justify-center py-16 gap-3 text-center"
              >
                <Rocket className="h-12 w-12 text-white/20" />
                <p className="text-white/60 text-lg font-bold">
                  No messages yet
                </p>
                <p className="text-white/40 text-sm">
                  Be the first to say hello!
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <MessageCard
                  key={msg.id.toString()}
                  message={msg}
                  index={idx + 1}
                  currentNickname={currentNickname}
                  isAuthenticated={isAuthenticated}
                  isModerator={isModerator}
                  userReactions={userReactions}
                  onToggleReaction={handleToggleReaction}
                  onDelete={handleDelete}
                  onModDelete={handleModDelete}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="mt-4 w-full">
          {!isAuthenticated ? (
            <div
              data-ocid="chat.login_prompt"
              className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-slate-800/70 backdrop-blur-sm border border-white/20 rounded-2xl p-4"
            >
              <p className="text-white/70 text-sm font-medium">
                Sign in to chat with fellow pilots
              </p>
              <LoginButton />
            </div>
          ) : !currentNickname ? (
            <div className="flex items-center justify-center bg-slate-800/70 backdrop-blur-sm border border-yellow-400/30 rounded-2xl p-4">
              <p className="text-yellow-400/80 text-sm font-medium text-center">
                Set a nickname on the Leaderboards page to start chatting
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-sm border-2 border-white/20 focus-within:border-yellow-400/60 rounded-2xl p-2 transition-colors duration-200">
                <Input
                  data-ocid="chat.input"
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Say something, pilot…"
                  maxLength={500}
                  disabled={postMessage.isPending}
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-white placeholder:text-white/30 text-sm"
                />
                <Button
                  data-ocid="chat.send_button"
                  onClick={handleSend}
                  disabled={postMessage.isPending || !messageInput.trim()}
                  size="icon"
                  className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black h-9 w-9 rounded-xl flex-shrink-0 disabled:opacity-50"
                  aria-label="Send message"
                >
                  {postMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {charWarning && (
                <p
                  className={`text-xs text-right pr-1 ${charCount >= 500 ? "text-red-400" : "text-yellow-400/70"}`}
                >
                  {charCount}/500
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-6 text-white/30 text-xs">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white/50 transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </footer>
      </div>
    </div>
  );
}
