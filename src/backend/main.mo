import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import AccessControl "authorization/access-control";
import Nat "mo:core/Nat";
import MixinStorage "blob-storage/Mixin";
import Text "mo:core/Text";
import Order "mo:core/Order";

actor {
  // Access control state
  let accessControlState = AccessControl.initState();

  // Storage for high scores and weekly scores
  let allTimeHighScore = Map.empty<Principal, Nat>();
  let weeklyScore = Map.empty<Principal, Nat>();
  let lastWeeklyReset = Map.empty<Principal, Time.Time>();

  // Nickname system
  let nicknameMap = Map.empty<Text, Principal>();
  let principalMap = Map.empty<Principal, Text>();

  type UserProfile = {
    name : Text;
    displayName : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  func natCompare(a : Nat, b : Nat) : Order.Order {
    Nat.compare(b, a);
  };

  // Storage system access
  include MixinStorage();

  // ===================== Access Control Functions (Required) =====================

  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  // ===================== User Profile Functions (Required) =====================

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access user profile");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profile");
    };
    userProfiles.add(caller, profile);
  };

  // ===================== Nickname System =====================

  // Validate that a nickname is unique (not already in use)
  public shared ({ caller }) func validateNickname(nickname : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to validate nickname");
    };

    let trimmedNickname = nickname.trim(#char(' '));
    if (trimmedNickname.size() == 0) {
      Runtime.trap("Nickname cannot be empty");
    };

    if (nicknameMap.containsKey(trimmedNickname)) {
      Runtime.trap("Nickname already exists");
    };
  };

  // Save nickname mapping for a principal
  public shared ({ caller }) func saveNickname(nickname : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to save nickname");
    };

    let trimmedNickname = nickname.trim(#char(' '));
    if (trimmedNickname.size() == 0) {
      Runtime.trap("Nickname cannot be empty");
    };

    if (nicknameMap.containsKey(trimmedNickname)) {
      Runtime.trap("Nickname already exists");
    };

    nicknameMap.add(trimmedNickname, caller);
    principalMap.add(caller, trimmedNickname);
  };

  // Changing a nickname (NEW function)
  public shared ({ caller }) func changeNickname(newNickname : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to change nickname");
    };

    let trimmedNickname = newNickname.trim(#char(' '));
    if (trimmedNickname.size() == 0) {
      Runtime.trap("Nickname cannot be empty");
    };

    if (nicknameMap.containsKey(trimmedNickname)) {
      Runtime.trap("Nickname already exists, choose a new one");
    };

    // Remove old nickname from nicknameMap if it exists
    switch (principalMap.get(caller)) {
      case (?oldNickname) {
        nicknameMap.remove(oldNickname);
      };
      case (null) {};
    };

    // Add new nickname to both maps
    nicknameMap.add(trimmedNickname, caller);
    principalMap.add(caller, trimmedNickname);
  };

  public query ({ caller }) func getCallerNickname() : async ?Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to get nickname");
    };
    principalMap.get(caller);
  };

  public type LeaderboardEntry = {
    nickname : Text;
    score : Nat;
  };

  // ===================== Score Submission (User Access Required) =====================

  // Only authenticated users can submit new high scores if they beat their previous best
  public shared ({ caller }) func submitScore(finalScore : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to submit score");
    };

    switch (allTimeHighScore.get(caller)) {
      case (null) {
        allTimeHighScore.add(caller, finalScore);
      };
      case (?currentBest) {
        if (finalScore > currentBest) {
          allTimeHighScore.add(caller, finalScore);
        };
      };
    };
  };

  // Only authenticated users can submit new weekly high scores if they beat their previous best
  public shared ({ caller }) func submitWeeklyScore(finalScore : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to submit weekly score");
    };

    switch (weeklyScore.get(caller)) {
      case (null) {
        weeklyScore.add(caller, finalScore);
      };
      case (?currentBest) {
        if (finalScore > currentBest) {
          weeklyScore.add(caller, finalScore);
        };
      };
    };
  };

  // ===================== Leaderboard Queries (Public Access) =====================

  // Anyone can view top 10 scores (including guests)
  public query func getTopScores() : async [LeaderboardEntry] {
    let sortedEntries = allTimeHighScore.toArray().sort(func(a, b) { natCompare(a.1, b.1) });

    let entries : [LeaderboardEntry] = sortedEntries.map<((Principal, Nat)), LeaderboardEntry>(func((principal, score)) {
      let nickname = switch (principalMap.get(principal)) {
        case (null) { "" };
        case (?name) { name };
      };
      { nickname; score };
    });

    if (entries.size() <= 10) {
      return entries;
    };

    entries.sliceToArray(0, 10);
  };

  // Anyone can view weekly top 10 scores (including guests)
  public query func getWeeklyTopScores() : async [LeaderboardEntry] {
    let sortedEntries = weeklyScore.toArray().sort(func(a, b) { natCompare(a.1, b.1) });

    let entries : [LeaderboardEntry] = sortedEntries.map<((Principal, Nat)), LeaderboardEntry>(func((principal, score)) {
      let nickname = switch (principalMap.get(principal)) {
        case (null) { "" };
        case (?name) { name };
      };
      { nickname; score };
    });

    if (entries.size() <= 10) {
      return entries;
    };

    entries.sliceToArray(0, 10);
  };

  // Anyone can view all-time leaderboard (including guests)
  public query func getLeaderboard() : async [LeaderboardEntry] {
    let sortedEntries = allTimeHighScore.toArray().sort(func(a, b) { natCompare(a.1, b.1) });

    sortedEntries.map<((Principal, Nat)), LeaderboardEntry>(
      func((principal, score)) {
        let nickname = switch (principalMap.get(principal)) {
          case (null) { "" };
          case (?name) { name };
        };
        { nickname; score };
      }
    );
  };

  // Anyone can view weekly leaderboard (including guests)
  public query func getWeeklyLeaderboard() : async [LeaderboardEntry] {
    let sortedEntries = weeklyScore.toArray().sort(func(a, b) { natCompare(a.1, b.1) });

    sortedEntries.map<((Principal, Nat)), LeaderboardEntry>(
      func((principal, score)) {
        let nickname = switch (principalMap.get(principal)) {
          case (null) { "" };
          case (?name) { name };
        };
        { nickname; score };
      }
    );
  };

  // ===================== Admin Functions (Admin Access Required) =====================

  // Only admins can reset weekly scores
  public shared ({ caller }) func resetWeeklyScores() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can reset weekly scores");
    };

    weeklyScore.clear();
    lastWeeklyReset.add(caller, Time.now());
  };

  // Only admins can get the last reset timestamp
  public query ({ caller }) func getLastWeeklyReset() : async ?Time.Time {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view reset timestamp");
    };

    // Return the most recent reset time from any admin
    let resetTimes = lastWeeklyReset.toArray();
    if (resetTimes.size() == 0) {
      return null;
    };

    var mostRecent : Time.Time = 0;
    for ((_, timestamp) in resetTimes.vals()) {
      if (timestamp > mostRecent) {
        mostRecent := timestamp;
      };
    };
    ?mostRecent;
  };
};
