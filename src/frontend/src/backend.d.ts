import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface LeaderboardEntry {
    nickname: string;
    score: bigint;
}
export type Time = bigint;
export interface UserProfile {
    displayName: string;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    changeNickname(newNickname: string): Promise<void>;
    getCallerNickname(): Promise<string | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getLastWeeklyReset(): Promise<Time | null>;
    getLeaderboard(): Promise<Array<LeaderboardEntry>>;
    getTopScores(): Promise<Array<LeaderboardEntry>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getWeeklyLeaderboard(): Promise<Array<LeaderboardEntry>>;
    getWeeklyTopScores(): Promise<Array<LeaderboardEntry>>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    resetWeeklyScores(): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    saveNickname(nickname: string): Promise<void>;
    submitScore(finalScore: bigint): Promise<void>;
    submitWeeklyScore(finalScore: bigint): Promise<void>;
    validateNickname(nickname: string): Promise<void>;
}
