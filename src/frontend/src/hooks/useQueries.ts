import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeaderboardEntry, UserProfile } from "../backend";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// Nickname Queries
export function useGetCallerNickname() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<string | null>({
    queryKey: ["currentUserNickname"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerNickname();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });
}

export function useValidateNickname() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (nickname: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.validateNickname(nickname);
    },
  });
}

export function useSaveNickname() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nickname: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveNickname(nickname);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserNickname"] });
    },
  });
}

// Score Submission Mutations
export function useSubmitScore() {
  const { actor } = useActor();
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (score: number) => {
      if (!actor) throw new Error("Actor not available");
      if (!identity) throw new Error("Must be authenticated to submit score");

      // Submit both all-time and weekly scores
      // Backend will only update if the new score is higher
      await actor.submitScore(BigInt(score));
      await actor.submitWeeklyScore(BigInt(score));
    },
    onSuccess: () => {
      // Invalidate all leaderboard queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["topScores"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyTopScores"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyLeaderboard"] });
    },
  });
}

// Leaderboard Queries (Top 10)
export function useGetTopScores() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LeaderboardEntry[]>({
    queryKey: ["topScores"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTopScores();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetWeeklyTopScores() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LeaderboardEntry[]>({
    queryKey: ["weeklyTopScores"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWeeklyTopScores();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useChangeNickname() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newNickname: string) => {
      if (!actor) throw new Error("Actor not available");
      return actor.changeNickname(newNickname);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserNickname"] });
      queryClient.invalidateQueries({ queryKey: ["topScores"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyTopScores"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["weeklyLeaderboard"] });
    },
  });
}

// Full Leaderboard Queries (All scores)
export function useGetLeaderboard() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLeaderboard();
    },
    enabled: !!actor && !actorFetching,
  });
}

export function useGetWeeklyLeaderboard() {
  const { actor, isFetching: actorFetching } = useActor();

  return useQuery<LeaderboardEntry[]>({
    queryKey: ["weeklyLeaderboard"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getWeeklyLeaderboard();
    },
    enabled: !!actor && !actorFetching,
  });
}
