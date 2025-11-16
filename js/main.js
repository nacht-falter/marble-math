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
  streakBestRun: 0,
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
const baseColors = [
  { hue: 250, name: "indigo" }, // 0-9
  { hue: 0, name: "red" }, // 10-19
  { hue: 140, name: "green" }, // 20-29
  { hue: 35, name: "orange" }, // 30-39
  { hue: 280, name: "purple" }, // 40-49
  { hue: 190, name: "cyan" }, // 50-59
  { hue: 330, name: "pink" }, // 60-69
  { hue: 60, name: "yellow" }, // 70-79
  { hue: 25, name: "brown" }, // 80-89
  { hue: 160, name: "teal" }, // 90-99
];

// Generate a random shade of a base color
function generateRandomShade(baseHue) {
  // Vary saturation between 50-80%
  const saturation = 50 + Math.random() * 30;
  // Vary lightness between 40-60%
  const lightness = 40 + Math.random() * 20;

  return {
    label: `hsl(${baseHue}, ${saturation}%, ${lightness}%)`,
    marbleLight: `hsl(${baseHue}, ${saturation}%, ${Math.min(lightness + 10, 70)}%)`,
    marbleDark: `hsl(${baseHue}, ${saturation}%, ${Math.max(lightness - 15, 20)}%)`,
  };
}

// Update marble count badge
function updateMarbleCountDisplay() {
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

  // Always show marble count badge (tracks total marbles in both practice and active modes)
  if (marbleCountBadge) {
    marbleCountBadge.classList.remove("hidden");
  }
}

// Update count display
function updateCountDisplay() {
  // Track previous level to detect level-ups
  const previousLevel = gameState.currentLevel;
  const newLevel = gameState.level;

  // Update stored level
  gameState.currentLevel = newLevel;

  // Animate if level increased
  const shouldAnimate = newLevel > previousLevel;
  updateLevelDisplay(shouldAnimate);
  updateMarbleCountDisplay();
}

// Reset streak and update best run if necessary
function resetStreak() {
  if (gameState.currentStreak > gameState.streakBestRun) {
    gameState.streakBestRun = gameState.currentStreak;
  }
  gameState.currentStreak = 0;
  updateStreakDisplay();
}

// Update level display
function updateLevelDisplay(shouldAnimate = false) {
  const levelNumber = document.getElementById("level-number");
  const levelScoreProgress = document.getElementById("level-score-progress");
  const levelProgressFill = document.getElementById("level-progress-bar-fill");
  const levelDisplay = document.getElementById("level-display");

  if (levelNumber) {
    levelNumber.textContent = gameState.level;
  }

  if (levelScoreProgress) {
    // Show current score progress within this level
    const scoreForCurrentLevel = gameState.scoreForCurrentLevel;
    const scoreForNextLevel = gameState.scoreForNextLevel;
    const pointsInCurrentLevel = gameState.score - scoreForCurrentLevel;
    const pointsNeededForNextLevel = scoreForNextLevel - scoreForCurrentLevel;
    levelScoreProgress.textContent = `${pointsInCurrentLevel}/${pointsNeededForNextLevel}`;
  }

  if (levelProgressFill) {
    // Calculate progress within current level
    const scoreForCurrentLevel = gameState.scoreForCurrentLevel;
    const scoreForNextLevel = gameState.scoreForNextLevel;
    const pointsInCurrentLevel = gameState.score - scoreForCurrentLevel;
    const pointsNeededForNextLevel = scoreForNextLevel - scoreForCurrentLevel;
    const progress = (pointsInCurrentLevel / pointsNeededForNextLevel) * 100;
    levelProgressFill.style.width = `${progress}%`;
  }

  // Add bump animation when level increases
  if (shouldAnimate && levelDisplay) {
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
}

// Update streak display
function updateStreakDisplay(shouldAnimate = false) {
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

  // Add bump animation when streak increases
  if (shouldAnimate && streakCounter && gameState.currentStreak > 0) {
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
}

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
  gameState.totalMarbles = 0;
  gameState.currentRowIndex = 0;
  gameState.gameMode = "drag";
  gameState.gamePhase = "practice";
  gameState.currentTargetNumber = 0;
  gameState.currentStreak = 0;
  gameState.streakBestRun = 0;
  gameState.miniGamesUnlocked = 0;
  gameState.milestonesShown = [];
  gameState.score = 0;

  // Initialize "Start Challenge" button
  const modeToggleBtn = document.getElementById("mode-toggle-btn");
  if (modeToggleBtn) {
    modeToggleBtn.disabled = false;
    modeToggleBtn.textContent = "🎯 Start Challenge!";
  }

  // Update displays
  updateModeUI();
  updateStreakDisplay();
  updateLevelDisplay();

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
  generateRandomShade,
  updateCountDisplay,
  resetStreak,
  updateStreakDisplay,
  updateLevelDisplay,
  updateMarbleCountDisplay,
};
