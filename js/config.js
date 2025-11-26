// Game Configuration
export const GAME_CONFIG = {
  STREAK_TARGET: 10, // Correct answers needed to unlock mini-game
  MAX_LIVES: 5, // Maximum hearts player can have
  LEVEL_SCORE_BASE: 100, // Each level requires 100 more points than the last increment
  // Level 1: 0-99, Level 2: 100-299, Level 3: 300-599, Level 4: 600-999, etc.

  // Challenge mode difficulty settings by level
  // Allows for future expansion with additional difficulty parameters
  CHALLENGE_DIFFICULTY: {
    VISUAL_FEEDBACK_UNTIL_LEVEL: 5, // Show ghost marbles and allow adjustments until this level
  },

  MARBLE_MILESTONES: [100, 200, 300], // When to show "Start Challenge?" prompt
};
