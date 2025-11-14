import { addRow } from "./grid.js";
import {
  addMarbles,
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
  // Calculate next streak requirement (10, 15, 20, 25, ...)
  get nextStreakRequirement() {
    return 10 + (this.miniGamesUnlocked * 5);
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

// Update count display
function updateCountDisplay() {
  // Function kept for future count-related logic
}

// Reset streak and update best run if necessary
function resetStreak() {
  if (gameState.currentStreak > gameState.streakBestRun) {
    gameState.streakBestRun = gameState.currentStreak;
  }
  gameState.currentStreak = 0;
  updateStreakDisplay();
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

  // Update visibility based on game phase and streak
  if (streakCounter) {
    if (gameState.currentStreak === 0 && gameState.gamePhase === "practice") {
      streakCounter.classList.add("hidden");
    } else {
      streakCounter.classList.remove("hidden");
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

  // Initialize "Start Challenge" button
  const modeToggleBtn = document.getElementById("mode-toggle-btn");
  if (modeToggleBtn) {
    modeToggleBtn.disabled = false;
    modeToggleBtn.textContent = "Start Challenge!";
  }

  // Update displays
  updateModeUI();
  updateStreakDisplay();

  addRow();
  addMarbles();
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
};
