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
import List "mo:core/List";
import Int "mo:core/Int";
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

    switch (principalMap.get(caller)) {
      case (?oldNickname) {
        nicknameMap.remove(oldNickname);
      };
      case (null) {};
    };

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

  // ===================== Chat System (NEW) =====================

  type ChatMessage = {
    id : Nat;
    authorPrincipal : Principal;
    authorNickname : Text;
    text : Text;
    timestamp : Time.Time;
    reactions : Map.Map<Text, List.List<Principal>>;
  };

  let chatMessages = Map.empty<Nat, ChatMessage>();
  var nextMessageId : Nat = 0;

  // Post a new chat message (authenticated users only)
  public shared ({ caller }) func postChatMessage(text : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to post messages");
    };

    let trimmedText = text.trim(#char(' '));
    if (trimmedText.size() == 0 or trimmedText.size() > 500) {
      Runtime.trap("Message cannot be empty or exceed 500 characters");
    };

    let authorNickname = switch (principalMap.get(caller)) {
      case (?nickname) { nickname };
      case (null) {
        Runtime.trap("You must set a nickname before posting messages");
      };
    };

    let reactions = Map.empty<Text, List.List<Principal>>();

    let message : ChatMessage = {
      id = nextMessageId;
      authorPrincipal = caller;
      authorNickname;
      text = trimmedText;
      timestamp = Time.now();
      reactions;
    };

    chatMessages.add(nextMessageId, message);
    nextMessageId += 1;
  };

  // Get the 50 most recent messages
  public query func getChatMessages() : async [ {
    id : Nat;
    authorNickname : Text;
    text : Text;
    timestamp : Time.Time;
    reactions : [(Text, Nat)];
  } ] {
    let messageArray = chatMessages.values().toArray();
    let sortedMessages = messageArray.sort(
      func(a, b) {
        Int.compare(b.timestamp, a.timestamp);
      }
    );

    let limitedMessages = if (sortedMessages.size() <= 50) {
      sortedMessages;
    } else {
      sortedMessages.sliceToArray(0, 50);
    };

    limitedMessages.map(
      func(msg) {
        let reactionsArray = msg.reactions.toArray().map(
          func((emoji, principals)) {
            (emoji, principals.size());
          }
        );
        {
          id = msg.id;
          authorNickname = msg.authorNickname;
          text = msg.text;
          timestamp = msg.timestamp;
          reactions = reactionsArray;
        };
      }
    );
  };

  // Delete own message (authenticated users only)
  public shared ({ caller }) func deleteChatMessage(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to delete messages");
    };

    switch (chatMessages.get(id)) {
      case (?message) {
        if (message.authorPrincipal != caller) {
          Runtime.trap("Unauthorized: You can only delete your own messages");
        };
        chatMessages.remove(id);
      };
      case (null) {
        Runtime.trap("Message not found");
      };
    };
  };

  // Moderator delete (password-protected)
  public shared ({ caller }) func moderatorDeleteMessage(id : Nat, password : Text) : async () {
    if (password != "bittybittywhatwhat") {
      Runtime.trap("Unauthorized: Invalid moderator password");
    };

    if (not chatMessages.containsKey(id)) {
      Runtime.trap("Message not found");
    };

    chatMessages.remove(id);
  };

  // Add reaction
  public shared ({ caller }) func addReaction(messageId : Nat, emoji : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to add reactions");
    };

    switch (chatMessages.get(messageId)) {
      case (?message) {
        if (message.reactions.size() >= 10 and not message.reactions.containsKey(emoji)) {
          Runtime.trap("Maximum of 10 different emojis per message");
        };

        let updatedReactions = message.reactions.map<Text, List.List<Principal>, List.List<Principal>>(
          func(emojiKey, principals) {
            if (emojiKey == emoji) {
              if (principals.any(func(p) { p == caller })) {
                return principals;
              };
              let newPrincipals = List.empty<Principal>();
              for (principal in principals.values()) {
                newPrincipals.add(principal);
              };
              newPrincipals.add(caller);
              newPrincipals;
            } else {
              principals;
            };
          }
        );

        if (not message.reactions.containsKey(emoji)) {
          let newList = List.empty<Principal>();
          newList.add(caller);
          updatedReactions.add(emoji, newList);
        };

        let updatedMessage = {
          message with
          reactions = updatedReactions
        };

        chatMessages.add(messageId, updatedMessage);
      };
      case (null) {
        Runtime.trap("Message not found");
      };
    };
  };

  // Remove reaction
  public shared ({ caller }) func removeReaction(messageId : Nat, emoji : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Must be authenticated to remove reactions");
    };

    switch (chatMessages.get(messageId)) {
      case (?message) {
        switch (message.reactions.get(emoji)) {
          case (?principals) {
            let updatedPrincipals = List.empty<Principal>();
            for (principal in principals.values()) {
              if (principal != caller) {
                updatedPrincipals.add(principal);
              };
            };

            let updatedReactions = message.reactions.map<Text, List.List<Principal>, List.List<Principal>>(
              func(k, v) {
                if (k == emoji) { return updatedPrincipals };
                v;
              }
            );

            let updatedMessage = {
              message with
              reactions = updatedReactions
            };
            chatMessages.add(messageId, updatedMessage);
          };
          case (null) {
            Runtime.trap("No reactions for this emoji");
          };
        };
      };
      case (null) {
        Runtime.trap("Message not found");
      };
    };
  };
};
