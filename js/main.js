import { addRow } from "./grid.js";
import {
  createMarblesInGroup,
  setupDragHandlers,
  setupDrawModeHandlers,
  startChallenge,
  updateModeUI,
} from "./modes.js";

// Game state
const gameState = {
  rows: [],
  totalMarbles: 0,
  currentRowIndex: 0,
  gameMode: "drag", // 'drag' or 'draw'
  currentTargetNumber: 0,
  gamePhase: "practice", // 'practice' or 'active'
  currentStreak: 0,
  miniGamesUnlocked: 0, // Track how many mini-games have been unlocked
  milestonesShown: [], // Track which milestone prompts have been shown (100, 200, etc.)
  currentLevel: 1, // Track player level based on score
  score: 0, // Score earned in active mode (marbles × streak multiplier)
  // Calculate next streak requirement (10, 15, 20, 25, ...)
  get nextStreakRequirement() {
    return 10 + (this.miniGamesUnlocked * 5);
  },
  // Calculate level based on score (scaling: 250, 500, 750, 1000, ...)
  get level() {
    // Each level requires 250 more points than the last
    // Level 1: 0-249, Level 2: 250-749, Level 3: 750-1499, etc.
    // Formula: level = floor((sqrt(1 + 8*score/250) - 1) / 2) + 1
    return Math.floor((Math.sqrt(1 + 8 * this.score / 250) - 1) / 2) + 1;
  },
  // Calculate total score needed for a given level
  getScoreForLevel(level) {
    // Sum of arithmetic sequence: n * (n - 1) / 2 * 250
    return (level - 1) * level / 2 * 250;
  },
  // Calculate score needed for next level
  get scoreForNextLevel() {
    return this.getScoreForLevel(this.level + 1);
  },
  // Calculate score needed for current level
  get scoreForCurrentLevel() {
    return this.getScoreForLevel(this.level);
  },
};

// Base colors for each tens group (0-9, 10-19, 20-29, etc.)
// Harmonious palette that coordinates with UI colors (blues, purples, yellows)
const baseColors = [
  { label: "hsl(210, 65%, 55%)", marbleLight: "hsl(210, 65%, 65%)", marbleDark: "hsl(210, 65%, 40%)", name: "soft-blue" }, // 0-9
  { label: "hsl(175, 55%, 50%)", marbleLight: "hsl(175, 55%, 60%)", marbleDark: "hsl(175, 55%, 35%)", name: "teal" }, // 10-19
  { label: "hsl(140, 50%, 52%)", marbleLight: "hsl(140, 50%, 62%)", marbleDark: "hsl(140, 50%, 37%)", name: "mint" }, // 20-29
  { label: "hsl(90, 50%, 55%)", marbleLight: "hsl(90, 50%, 65%)", marbleDark: "hsl(90, 50%, 40%)", name: "lime" }, // 30-39
  { label: "hsl(45, 70%, 55%)", marbleLight: "hsl(45, 70%, 65%)", marbleDark: "hsl(45, 70%, 40%)", name: "gold" }, // 40-49
  { label: "hsl(25, 70%, 58%)", marbleLight: "hsl(25, 70%, 68%)", marbleDark: "hsl(25, 70%, 43%)", name: "orange" }, // 50-59
  { label: "hsl(15, 65%, 60%)", marbleLight: "hsl(15, 65%, 70%)", marbleDark: "hsl(15, 65%, 45%)", name: "coral" }, // 60-69
  { label: "hsl(340, 55%, 60%)", marbleLight: "hsl(340, 55%, 70%)", marbleDark: "hsl(340, 55%, 45%)", name: "rose" }, // 70-79
  { label: "hsl(300, 45%, 60%)", marbleLight: "hsl(300, 45%, 70%)", marbleDark: "hsl(300, 45%, 45%)", name: "magenta" }, // 80-89
  { label: "hsl(270, 50%, 65%)", marbleLight: "hsl(270, 50%, 70%)", marbleDark: "hsl(270, 50%, 50%)", name: "lavender" }, // 90-99
];

// ============================================
// Counter State Mutations
// ============================================
const counters = {
  // Marble counter operations
  incrementMarbles(amount = 1) {
    gameState.totalMarbles += amount;
  },

  resetMarbles() {
    gameState.totalMarbles = 0;
  },

  // Streak counter operations
  incrementStreak() {
    gameState.currentStreak++;
  },

  resetStreak() {
    gameState.currentStreak = 0;
  },

  // Score/Level operations
  addScore(points) {
    gameState.score += points;
  },

  resetScore() {
    gameState.score = 0;
    gameState.currentLevel = 1;
  },

  // Mini-game unlock operations
  incrementMiniGames() {
    gameState.miniGamesUnlocked++;
  },

  resetMiniGames() {
    gameState.miniGamesUnlocked = 0;
  }
};

// ============================================
// Display Update Functions
// ============================================
const display = {
  updateMarbles() {
    const marbleCountNumber = document.getElementById("marble-count-number");
    const marbleCountProgressFill = document.getElementById("marble-count-progress-fill");
    const marbleCountBadge = document.getElementById("marble-count-badge");

    if (marbleCountNumber) {
      marbleCountNumber.textContent = gameState.totalMarbles;
    }

    if (marbleCountProgressFill) {
      // Show progress to next hundred (0-100)
      const marblesInCurrentHundred = gameState.totalMarbles % 100;
      const progress = (marblesInCurrentHundred / 100) * 100;
      marbleCountProgressFill.style.width = `${progress}%`;
    }

    // Update tooltip values
    const tooltipMarbleCount = document.getElementById("tooltip-marble-count");
    const tooltipNextCollapse = document.getElementById("tooltip-next-collapse");
    const tooltipNextCollapse2 = document.getElementById("tooltip-next-collapse-2");
    const tooltipMarbleProgress = document.getElementById("tooltip-marble-progress");

    if (tooltipMarbleCount) {
      const marblesInCurrentHundred = gameState.totalMarbles % 100;
      tooltipMarbleCount.textContent = marblesInCurrentHundred;
    }

    if (tooltipNextCollapse || tooltipNextCollapse2) {
      const nextCollapse = Math.ceil((gameState.totalMarbles + 1) / 100) * 100;
      if (tooltipNextCollapse) tooltipNextCollapse.textContent = nextCollapse;
      if (tooltipNextCollapse2) tooltipNextCollapse2.textContent = 100;
    }

    if (tooltipMarbleProgress) {
      const marblesInCurrentHundred = gameState.totalMarbles % 100;
      const progress = (marblesInCurrentHundred / 100) * 100;
      tooltipMarbleProgress.style.width = `${progress}%`;
    }

    // Always show marble count badge (tracks total marbles in both practice and active modes)
    if (marbleCountBadge) {
      marbleCountBadge.classList.remove("hidden");
    }
  },

  updateLevel(animate = false) {
    const levelNumber = document.getElementById("level-number");
    const levelScoreProgress = document.getElementById("level-score-progress");
    const levelProgressFill = document.getElementById("level-progress-bar-fill");
    const levelDisplay = document.getElementById("level-display");

    if (levelNumber) {
      levelNumber.textContent = gameState.level;
    }

    // Calculate score progress for current level
    const scoreForCurrentLevel = gameState.scoreForCurrentLevel;
    const scoreForNextLevel = gameState.scoreForNextLevel;
    const pointsInCurrentLevel = gameState.score - scoreForCurrentLevel;
    const pointsNeededForNextLevel = scoreForNextLevel - scoreForCurrentLevel;

    if (levelScoreProgress) {
      levelScoreProgress.textContent = `${pointsInCurrentLevel}/${pointsNeededForNextLevel}`;
    }

    if (levelProgressFill) {
      const progress = (pointsInCurrentLevel / pointsNeededForNextLevel) * 100;
      levelProgressFill.style.width = `${progress}%`;
    }

    // Update tooltip values
    const tooltipLevel = document.getElementById("tooltip-level");
    const tooltipScore = document.getElementById("tooltip-score");
    const tooltipScoreNeeded = document.getElementById("tooltip-score-needed");
    const tooltipScoreNeeded2 = document.getElementById("tooltip-score-needed-2");
    const tooltipLevelProgress = document.getElementById("tooltip-level-progress");

    if (tooltipLevel) tooltipLevel.textContent = gameState.level;
    if (tooltipScore) tooltipScore.textContent = pointsInCurrentLevel;
    if (tooltipScoreNeeded) tooltipScoreNeeded.textContent = pointsNeededForNextLevel;
    if (tooltipScoreNeeded2) tooltipScoreNeeded2.textContent = pointsNeededForNextLevel;
    if (tooltipLevelProgress) {
      const progress = (pointsInCurrentLevel / pointsNeededForNextLevel) * 100;
      tooltipLevelProgress.style.width = `${progress}%`;
    }

    // Add bump animation when level increases
    if (animate && levelDisplay) {
      levelDisplay.classList.add("bump");
      setTimeout(() => {
        levelDisplay.classList.remove("bump");
      }, 300);
    }

    // Always show level display in active mode
    if (levelDisplay) {
      if (gameState.gamePhase === "active") {
        levelDisplay.classList.remove("hidden");
      } else {
        levelDisplay.classList.add("hidden");
      }
    }
  },

  updateStreak(animate = false) {
    const streakNumber = document.getElementById("streak-number");
    const streakTarget = document.getElementById("streak-target");
    const streakProgressFill = document.getElementById("streak-progress-bar-fill");
    const streakCounter = document.getElementById("streak-counter");

    const nextRequirement = gameState.nextStreakRequirement;

    if (streakNumber) {
      streakNumber.textContent = gameState.currentStreak;
    }

    if (streakTarget) {
      streakTarget.textContent = `/${nextRequirement}`;
    }

    if (streakProgressFill) {
      const progress = Math.min((gameState.currentStreak / nextRequirement) * 100, 100);
      streakProgressFill.style.width = `${progress}%`;
    }

    // Update tooltip values
    const tooltipStreak = document.getElementById("tooltip-streak");
    const tooltipStreakGoal = document.getElementById("tooltip-streak-goal");
    const tooltipStreakGoal2 = document.getElementById("tooltip-streak-goal-2");
    const tooltipStreakProgress = document.getElementById("tooltip-streak-progress");

    if (tooltipStreak) tooltipStreak.textContent = gameState.currentStreak;
    if (tooltipStreakGoal) tooltipStreakGoal.textContent = nextRequirement;
    if (tooltipStreakGoal2) tooltipStreakGoal2.textContent = nextRequirement;
    if (tooltipStreakProgress) {
      const progress = Math.min((gameState.currentStreak / nextRequirement) * 100, 100);
      tooltipStreakProgress.style.width = `${progress}%`;
    }

    // Add bump animation when streak increases
    if (animate && streakCounter && gameState.currentStreak > 0) {
      streakCounter.classList.add("bump");
      setTimeout(() => {
        streakCounter.classList.remove("bump");
      }, 500);
    }

    // Always show streak counter in active mode
    if (streakCounter) {
      if (gameState.gamePhase === "active") {
        streakCounter.classList.remove("hidden");
      } else {
        streakCounter.classList.add("hidden");
      }
    }
  },

  // Update all displays at once
  updateAll() {
    this.updateMarbles();
    this.updateStreak();
    this.updateLevel();
  }
};

// Grid no longer scrolls - rows naturally disappear at top when overflow occurs

// Initialize the game with one row
function initGame() {
  const gridContainer = document.getElementById("grid-container");
  gridContainer.innerHTML = ""; // Clear existing rows

  // Clear marble group
  const marbleGroup = document.getElementById("marble-group");
  if (marbleGroup) {
    marbleGroup.innerHTML = "";
  }

  gameState.rows = [];
  gameState.currentRowIndex = 0;
  gameState.gameMode = "drag";
  gameState.gamePhase = "practice";
  gameState.currentTargetNumber = 0;
  gameState.milestonesShown = [];

  // Reset all counters
  counters.resetMarbles();
  counters.resetStreak();
  counters.resetScore();
  counters.resetMiniGames();

  // Initialize "Start Challenge" button
  const modeToggleBtn = document.getElementById("mode-toggle-btn");
  if (modeToggleBtn) {
    modeToggleBtn.disabled = false;
    modeToggleBtn.textContent = "🎯 Start Challenge!";
  }

  // Update displays
  updateModeUI();
  display.updateAll();

  addRow();
  createMarblesInGroup();
}

// Start the game when page loads
document.addEventListener("DOMContentLoaded", () => {
  initGame();
  setupDragHandlers();
  setupDrawModeHandlers();

  // Setup reset button
  const resetBtn = document.getElementById("reset-btn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      initGame();
    });
  }

  // Setup start challenge button
  const modeToggleBtn = document.getElementById("mode-toggle-btn");
  if (modeToggleBtn) {
    modeToggleBtn.addEventListener("click", startChallenge);
  }

  // Setup instructions toggle button
  const instructionsBtn = document.getElementById("instructions-btn");
  const instructionsSection = document.getElementById("instructions-section");
  if (instructionsBtn && instructionsSection) {
    instructionsBtn.addEventListener("click", () => {
      if (instructionsSection.style.display === "none") {
        instructionsSection.style.display = "block";
        instructionsBtn.textContent = "Hide Instructions";
      } else {
        instructionsSection.style.display = "none";
        instructionsBtn.textContent = "How to Play";
      }
    });
  }
});

export {
  gameState,
  baseColors,
  counters,
  display,
};
