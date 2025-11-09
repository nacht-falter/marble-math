import { addRow } from "./grid.js";
import {
  addMarbles,
  setupDragHandlers,
  setupDrawModeHandlers,
  toggleMode,
  updateModeUI,
} from "./modes.js";

// Game state
const gameState = {
  rows: [],
  totalMarbles: 0,
  currentRowIndex: 0,
  goals: [100, 500, 1000],
  currentGoalIndex: 0,
  gameMode: "drag", // 'drag' or 'draw'
  drawModeUnlocked: true,
  currentTargetNumber: 0,
  get goal() {
    return this.goals[this.currentGoalIndex];
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

// Update the count display and check for goal completion
function updateCountDisplay() {
  const countNumber = document.getElementById("count-number");
  if (countNumber) {
    countNumber.textContent = gameState.totalMarbles;
  }

  // Check if current goal is reached
  if (
    gameState.totalMarbles >= gameState.goal &&
    gameState.currentGoalIndex < gameState.goals.length
  ) {
    showGoalCelebration();

    // Move to next goal if available
    if (gameState.currentGoalIndex < gameState.goals.length - 1) {
      gameState.currentGoalIndex++;
      updateGoalDisplay();
    }
  }
}

// Update the goal display
function updateGoalDisplay() {
  const goalNumber = document.getElementById("goal-number");
  if (goalNumber) {
    goalNumber.textContent = gameState.goal;
  }
}

// Show celebration when goal is reached
function showGoalCelebration() {
  const feedback = document.getElementById("feedback");
  if (feedback) {
    const currentGoal = gameState.goals[gameState.currentGoalIndex];
    let message = `Amazing! You reached ${currentGoal} marbles!`;

    // Check if there's a next goal
    if (gameState.currentGoalIndex < gameState.goals.length - 1) {
      const nextGoal = gameState.goals[gameState.currentGoalIndex + 1];
      message += `\nNext goal: ${nextGoal} marbles!`;
    } else {
      message = `INCREDIBLE! You reached ${currentGoal} marbles! You've mastered place value!`;
    }

    feedback.textContent = message;
    feedback.style.display = "block";
    feedback.classList.add("celebration");

    // Hide after 5 seconds
    setTimeout(() => {
      feedback.style.display = "none";
      feedback.classList.remove("celebration");
    }, 5000);
  }
}

// Show milestone feedback
function showMilestoneFeedback(milestone) {
  const feedback = document.getElementById("feedback");

  // Don't show milestone feedback if this is a goal milestone
  const isGoalMilestone = gameState.goals.includes(milestone);

  if (feedback && !isGoalMilestone) {
    let message = "";
    if (milestone % 1000 === 0) {
      message = `${milestone}! Watch 10 hundreds collapse into one thousand!`;
    } else if (milestone % 100 === 0) {
      message = `${milestone}! Watch 10 rows collapse into one hundred!`;
    }

    if (message) {
      feedback.textContent = message;
      feedback.style.display = "block";
      feedback.classList.add("milestone");

      // Hide after 3 seconds
      setTimeout(() => {
        feedback.style.display = "none";
        feedback.classList.remove("milestone");
      }, 3000);
    }
  }
}

// Initialize the game with one row
function initGame() {
  const gridContainer = document.getElementById("grid-container");
  gridContainer.innerHTML = ""; // Clear existing rows
  gameState.rows = [];
  gameState.totalMarbles = 0;
  gameState.currentRowIndex = 0;
  gameState.currentGoalIndex = 0;
  gameState.gameMode = "drag";
  // Don't reset drawModeUnlocked - keep initial state for testing

  // Reset mode toggle button
  const modeToggleBtn = document.getElementById("mode-toggle-btn");
  if (modeToggleBtn) {
    modeToggleBtn.disabled = !gameState.drawModeUnlocked;
    modeToggleBtn.textContent = gameState.drawModeUnlocked
      ? "Switch to Draw Mode"
      : "Draw Mode (Locked)";
  }

  // Update displays
  updateCountDisplay();
  updateGoalDisplay();
  updateModeUI();

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

  // Setup mode toggle button
  const modeToggleBtn = document.getElementById("mode-toggle-btn");
  if (modeToggleBtn) {
    modeToggleBtn.addEventListener("click", toggleMode);
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
  updateGoalDisplay,
  showGoalCelebration,
  showMilestoneFeedback,
};
