import {
  gameState,
  updateCountDisplay,
  resetStreak,
  updateStreakDisplay,
  scrollToBottom,
} from "./main.js";

import {
  addRow,
  collapseToHundred,
  collapseToThousand,
  getFirstEmptyBox,
} from "./grid.js";

function addMarbles() {
  const marbleGroup = document.getElementById("marble-group");
  const marbleCountIndicator = document.getElementById(
    "marble-count-indicator",
  );
  const marbleCount = Math.floor(Math.random() * 10) + 1;

  // Update the count indicator
  marbleCountIndicator.textContent = marbleCount;

  for (let i = 0; i < marbleCount; i++) {
    const marble = document.createElement("div");
    marble.className = "marble";
    marbleGroup.appendChild(marble);
  }
}

// Add marbles from marble-group to boxes
function addMarblesToBoxes() {
  const marbleGroup = document.getElementById("marble-group");
  const marbles = Array.from(marbleGroup.querySelectorAll(".marble"));

  if (marbles.length === 0) {
    return;
  }

  let currentRow = gameState.rows[gameState.currentRowIndex];

  for (const marble of marbles) {
    // If currentRow is null (e.g., after collapse), get the row at currentRowIndex
    if (!currentRow) {
      if (gameState.currentRowIndex >= gameState.rows.length) {
        addRow();
      }
      currentRow = gameState.rows[gameState.currentRowIndex];
    }

    // Find first empty box in current row
    let emptyBoxIndex = currentRow.boxes.findIndex(
      (box) => !box.hasChildNodes(),
    );

    if (emptyBoxIndex === -1) {
      // Current row is full, move to next row
      gameState.currentRowIndex++;

      if (gameState.currentRowIndex >= gameState.rows.length) {
        addRow();
      }

      currentRow = gameState.rows[gameState.currentRowIndex];
      emptyBoxIndex = 0;
    }

    // Move marble from group to box
    const newMarble = document.createElement("div");
    newMarble.className = "marble";

    // Add the number to the marble
    gameState.totalMarbles++;
    newMarble.textContent = gameState.totalMarbles;

    // Apply row color to marble
    newMarble.style.background = `radial-gradient(circle at 30% 30%, ${currentRow.color.marbleLight}, ${currentRow.color.marbleDark})`;

    currentRow.boxes[emptyBoxIndex].appendChild(newMarble);
    currentRow.marbleCount++;

    // Check if we just reached a multiple of 1000 or 100
    if (gameState.totalMarbles % 1000 === 0) {
      // Remove any regular rows that might exist
      const gridContainer = document.getElementById("grid-container");
      const regularRowsToRemove = gameState.rows.filter(
        (row) => !row.isCollapsed,
      );
      regularRowsToRemove.forEach((row) => {
        const index = gameState.rows.indexOf(row);
        if (index > -1) {
          gameState.rows.splice(index, 1);
        }
        row.element.classList.add("collapsing-out");
        setTimeout(() => {
          if (row.element.parentNode) {
            gridContainer.removeChild(row.element);
          }
        }, 500);
      });

      // Collapse hundred-boxes into thousand row (animation happens in background)
      collapseToThousand(gameState.totalMarbles);

      // After collapse, reset row index and ensure a new row is created
      gameState.currentRowIndex = gameState.rows.length;
      currentRow = null;

      // Create a fresh new row for the next set of marbles
      addRow();
      gameState.currentRowIndex = gameState.rows.length - 1;
    } else if (gameState.totalMarbles % 100 === 0) {
      // Show milestone prompt (suggest starting challenge)
      showMilestonePrompt(gameState.totalMarbles);

      // Collapse rows (animation happens in background)
      collapseToHundred(gameState.totalMarbles % 1000);

      // After collapse, only the collapsed hundred row exists
      // Set currentRowIndex beyond the array so next marble triggers row creation
      gameState.currentRowIndex = gameState.rows.length;
      currentRow = null;
    }
  }

  // Ensure there's always at least one regular (non-collapsed) row available
  const hasRegularRow = gameState.rows.some((row) => !row.isCollapsed);
  if (!hasRegularRow) {
    addRow();
    gameState.currentRowIndex = gameState.rows.length - 1;
  } else {
    // Check if current row is now full and we need to prepare the next row
    if (currentRow && currentRow.boxes.length > 0) {
      const currentRowFull = currentRow.boxes.every((box) =>
        box.hasChildNodes(),
      );
      if (
        currentRowFull &&
        gameState.currentRowIndex === gameState.rows.length - 1
      ) {
        // Current row is full and it's the last row, so add a new empty row
        addRow();
        // Move to the new row
        gameState.currentRowIndex++;
      }
    }
  }

  // Clear the marble group
  marbleGroup.innerHTML = "";

  // Update the count display
  updateCountDisplay();

  // Scroll to bottom to show newly added marbles
  setTimeout(() => scrollToBottom(), 100);

  // Generate new marbles for the next round
  addMarbles();
}

// Setup custom drag handlers for marble group using mouse events
function setupDragHandlers() {
  const marbleGroupWrapper = document.getElementById("marble-group-wrapper");
  const marbleGroup = document.getElementById("marble-group");
  const marbleGroupContainer = document.querySelector(".marble-group-container");
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let temporaryNextRow = null; // Track if we created a temporary next row
  let currentSplitState = null; // Track current split state to avoid unnecessary updates

  // Helper function to start dragging
  function startDragging(clientX, clientY) {
    isDragging = true;
    const rect = marbleGroupWrapper.getBoundingClientRect();
    offsetX = clientX - rect.left;
    offsetY = clientY - rect.top;

    marbleGroupWrapper.classList.add("dragging");

    // Preserve parent container height to prevent layout shift
    if (marbleGroupContainer) {
      const containerHeight = marbleGroupContainer.offsetHeight;
      marbleGroupContainer.style.height = containerHeight + "px";
    }

    marbleGroupWrapper.style.position = "fixed";
    marbleGroupWrapper.style.zIndex = "1000";
    marbleGroupWrapper.style.pointerEvents = "none"; // Allow detecting elements underneath

    // Position the marble group wrapper at cursor
    marbleGroupWrapper.style.left = clientX - offsetX + "px";
    marbleGroupWrapper.style.top = clientY - offsetY + "px";

    // Highlight the first empty box
    const firstEmptyBox = getFirstEmptyBox();
    if (firstEmptyBox) {
      firstEmptyBox.box.classList.add("drop-target");
    }
  }

  // Mouse down handler
  marbleGroupWrapper.addEventListener(
    "mousedown",
    (e) => {
      startDragging(e.clientX, e.clientY);
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  // Touch start handler
  marbleGroupWrapper.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        startDragging(touch.clientX, touch.clientY);
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { passive: false, capture: true },
  );

  // Helper function for dragging movement
  function handleDragMove(clientX, clientY) {
    if (!isDragging) return;

    // Move the marble group wrapper with the cursor
    marbleGroupWrapper.style.left = clientX - offsetX + "px";
    marbleGroupWrapper.style.top = clientY - offsetY + "px";

    // Check if we're over the drop target and need to show split
    updateSplitVisualization();
  }

  // Mouse move handler
  document.addEventListener("mousemove", (e) => {
    handleDragMove(e.clientX, e.clientY);
  });

  // Touch move handler
  document.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      handleDragMove(touch.clientX, touch.clientY);
      e.preventDefault(); // Prevent scrolling while dragging
    }
  }, { passive: false });

  // Helper function for ending drag
  function endDragging() {
    if (!isDragging) return;

    // Get the first marble in the group
    const firstMarble = marbleGroup.querySelector(".marble");

    // Check what element is under the first marble
    let checkX, checkY;
    if (firstMarble) {
      const firstMarbleRect = firstMarble.getBoundingClientRect();
      checkX = firstMarbleRect.left + firstMarbleRect.width / 2;
      checkY = firstMarbleRect.top + firstMarbleRect.height / 2;
    } else {
      const marbleGroupRect = marbleGroup.getBoundingClientRect();
      checkX = marbleGroupRect.left + marbleGroupRect.width / 2;
      checkY = marbleGroupRect.top + marbleGroupRect.height / 2;
    }

    const elementUnder = document.elementFromPoint(checkX, checkY);
    const firstEmptyBox = getFirstEmptyBox();

    // Remove highlight from all boxes
    document.querySelectorAll(".box.drop-target").forEach((box) => {
      box.classList.remove("drop-target");
    });

    const isValidDrop = firstEmptyBox && elementUnder === firstEmptyBox.box;

    // Clear split visualization (keep temporary row if valid drop)
    clearSplitVisualization(!isValidDrop);

    if (isValidDrop) {
      // Valid drop - add marbles to boxes
      addMarblesToBoxes();
    }

    // Reset marble group wrapper position
    isDragging = false;
    currentSplitState = null; // Reset split state tracking
    marbleGroupWrapper.classList.remove("dragging");
    marbleGroupWrapper.style.position = "";
    marbleGroupWrapper.style.zIndex = "";
    marbleGroupWrapper.style.pointerEvents = "";
    marbleGroupWrapper.style.left = "";
    marbleGroupWrapper.style.top = "";

    // Reset parent container height
    if (marbleGroupContainer) {
      marbleGroupContainer.style.height = "";
    }
  }

  // Mouse up handler
  document.addEventListener("mouseup", (e) => {
    endDragging();
  });

  // Touch end handler
  document.addEventListener("touchend", (e) => {
    endDragging();
  });

  function updateSplitVisualization() {
    if (!isDragging) return;

    // Get the first marble in the group
    const firstMarble = marbleGroup.querySelector(".marble");
    if (!firstMarble) return;

    const firstMarbleRect = firstMarble.getBoundingClientRect();
    const checkX = firstMarbleRect.left + firstMarbleRect.width / 2;
    const checkY = firstMarbleRect.top + firstMarbleRect.height / 2;
    const elementUnder = document.elementFromPoint(checkX, checkY);
    const firstEmptyBox = getFirstEmptyBox();

    // Determine the new split state
    let newSplitState = null;

    // Only show split if we're over the correct box
    if (firstEmptyBox && elementUnder === firstEmptyBox.box) {
      // Calculate how many marbles fit in current row
      const currentRow = gameState.rows[gameState.currentRowIndex];
      const emptyBoxesInRow = currentRow.boxes.filter(
        (box) => !box.hasChildNodes(),
      ).length;
      const totalMarbles = marbleGroup.querySelectorAll(".marble").length;

      if (totalMarbles > emptyBoxesInRow) {
        // Split needed
        const marblesInFirstRow = emptyBoxesInRow;
        const marblesInSecondRow = totalMarbles - emptyBoxesInRow;
        newSplitState = `${marblesInFirstRow}-${marblesInSecondRow}`;
      } else {
        // All marbles fit, no split needed
        newSplitState = "no-split";
      }
    } else {
      // Not over drop target
      newSplitState = "no-split";
    }

    // Only update if state changed
    if (newSplitState === currentSplitState) {
      return;
    }

    currentSplitState = newSplitState;

    if (newSplitState === "no-split" || newSplitState === null) {
      clearSplitVisualization(false); // Don't remove temporary row during drag
    } else {
      // Parse the split state and show visualization
      const [firstCount, secondCount] = newSplitState.split("-").map(Number);
      showSplitVisualization(firstCount, secondCount);
    }
  }

  function showSplitVisualization(firstCount, secondCount) {
    // Get or create split indicators container
    let indicatorsContainer = document.getElementById(
      "split-indicators-container",
    );
    const marbleCountIndicator = document.getElementById(
      "marble-count-indicator",
    );
    const marbles = Array.from(marbleGroup.querySelectorAll(".marble"));

    if (!indicatorsContainer) {
      indicatorsContainer = document.createElement("div");
      indicatorsContainer.id = "split-indicators-container";
      indicatorsContainer.className = "split-indicators-container";
      marbleGroupWrapper.appendChild(indicatorsContainer);

      const firstIndicator = document.createElement("div");
      firstIndicator.id = "split-indicator-1";
      firstIndicator.className = "marble-count-indicator split-indicator";

      const secondIndicator = document.createElement("div");
      secondIndicator.id = "split-indicator-2";
      secondIndicator.className =
        "marble-count-indicator split-indicator split-indicator-second";

      indicatorsContainer.appendChild(firstIndicator);
      indicatorsContainer.appendChild(secondIndicator);
    }

    const firstIndicator = document.getElementById("split-indicator-1");
    const secondIndicator = document.getElementById("split-indicator-2");

    // Hide main indicator and show split indicators
    marbleCountIndicator.style.display = "none";
    indicatorsContainer.style.display = "flex";

    firstIndicator.textContent = firstCount;
    secondIndicator.textContent = secondCount;

    // Add visual split marker to the first marble of the second group
    marbles.forEach((marble, index) => {
      if (index === firstCount) {
        marble.classList.add("split-marker");
      } else {
        marble.classList.remove("split-marker");
      }
    });

    // Get or create next row for positioning
    const nextRowIndex = gameState.currentRowIndex + 1;
    let nextRow;
    let isNewTemporaryRow = false;

    // Check if next row exists, if not create it temporarily
    if (nextRowIndex >= gameState.rows.length) {
      nextRow = addRow();
      temporaryNextRow = nextRow;
      isNewTemporaryRow = true;
    } else {
      nextRow = gameState.rows[nextRowIndex];
    }

    // Track marble positions for both groups
    let firstGroupFirstMarble = null;
    let firstGroupLastMarble = null;
    let secondGroupFirstMarble = null;
    let secondGroupLastMarble = null;

    marbles.forEach((marble, index) => {
      const marbleRect = marble.getBoundingClientRect();

      if (index < firstCount) {
        // First group
        if (index === 0) {
          firstGroupFirstMarble = marbleRect;
        }
        if (index === firstCount - 1) {
          firstGroupLastMarble = marbleRect;
        }
      } else {
        // Second group - position at next row boxes
        const boxIndex = index - firstCount;
        const targetBox = nextRow.boxes?.[boxIndex];
        const boxRect = targetBox.getBoundingClientRect();

        // Store original position if not already stored
        if (!marble.dataset.originalPosition) {
          marble.dataset.originalPosition = "true";
        }

        // Position this marble at the target box location
        marble.style.position = "fixed";
        marble.style.left =
          boxRect.left + (boxRect.width - marble.offsetWidth) / 2 + "px";
        marble.style.top =
          boxRect.top + (boxRect.height - marble.offsetHeight) / 2 + "px";
        marble.style.zIndex = "999";

        // Track the first and last marbles in the second group for positioning the indicator
        if (index === firstCount) {
          secondGroupFirstMarble = boxRect;
        }
        if (index === marbles.length - 1) {
          secondGroupLastMarble = boxRect;
        }
      }
    });

    // Get box dimensions for width calculation (to match marble-count-indicator)
    const currentRow = gameState.rows[gameState.currentRowIndex];
    const firstBox = currentRow.boxes[0];
    const firstBoxRect = firstBox.getBoundingClientRect();
    const boxWidth = firstBoxRect.width;

    // Get the computed gap from row
    const rowElement = currentRow.element.querySelector('.row');
    const rowStyles = window.getComputedStyle(rowElement);
    const boxGap = parseFloat(rowStyles.gap);

    // Position the first indicator below the first group
    if (firstGroupFirstMarble && firstGroupLastMarble) {
      // Calculate fixed width based on number of marbles and box dimensions
      const indicatorWidth = firstCount * boxWidth + (firstCount - 1) * boxGap;

      firstIndicator.style.position = "fixed";
      firstIndicator.style.left = firstGroupFirstMarble.left + "px";
      firstIndicator.style.top = firstGroupLastMarble.bottom + 10 + "px";
      firstIndicator.style.width = indicatorWidth + "px";
      firstIndicator.style.zIndex = "1000";
      firstIndicator.style.textAlign = "center";
    }

    // Position the second indicator below the second group in the next row
    if (secondGroupFirstMarble && secondGroupLastMarble) {
      // Calculate fixed width based on number of marbles and box dimensions
      const indicatorWidth =
        secondCount * boxWidth + (secondCount - 1) * boxGap;

      secondIndicator.style.position = "fixed";
      secondIndicator.style.left = secondGroupFirstMarble.left + "px";
      secondIndicator.style.top = secondGroupLastMarble.bottom + 10 + "px";
      secondIndicator.style.width = indicatorWidth + "px";
      secondIndicator.style.zIndex = "1000";
      secondIndicator.style.textAlign = "center";
    }
  }

  function clearSplitVisualization(shouldRemoveTemporaryRow = true) {
    const indicatorsContainer = document.getElementById(
      "split-indicators-container",
    );
    const marbleCountIndicator = document.getElementById(
      "marble-count-indicator",
    );
    const firstIndicator = document.getElementById("split-indicator-1");
    const secondIndicator = document.getElementById("split-indicator-2");

    if (indicatorsContainer) indicatorsContainer.style.display = "none";
    if (marbleCountIndicator) marbleCountIndicator.style.display = "block";

    // Reset first indicator positioning
    if (firstIndicator) {
      firstIndicator.style.position = "";
      firstIndicator.style.left = "";
      firstIndicator.style.top = "";
      firstIndicator.style.width = "";
      firstIndicator.style.zIndex = "";
      firstIndicator.style.textAlign = "";
    }

    // Reset second indicator positioning
    if (secondIndicator) {
      secondIndicator.style.position = "";
      secondIndicator.style.left = "";
      secondIndicator.style.top = "";
      secondIndicator.style.width = "";
      secondIndicator.style.zIndex = "";
      secondIndicator.style.textAlign = "";
    }

    // Reset marble positions and remove split markers
    const marbles = marbleGroup.querySelectorAll(".marble");
    marbles.forEach((marble) => {
      marble.classList.remove("split-marker");

      // Reset positioning for marbles that were moved to next row
      if (marble.dataset.originalPosition) {
        marble.style.position = "";
        marble.style.left = "";
        marble.style.top = "";
        marble.style.zIndex = "";
        delete marble.dataset.originalPosition;
      }
    });

    // Remove temporary next row if it was created (and we should remove it)
    if (temporaryNextRow && shouldRemoveTemporaryRow) {
      const gridContainer = document.getElementById("grid-container");
      gridContainer.removeChild(temporaryNextRow.element);
      gameState.rows.pop(); // Remove from gameState
      temporaryNextRow = null;
    } else if (temporaryNextRow && !shouldRemoveTemporaryRow) {
      // Keep the row but it's no longer temporary
      temporaryNextRow = null;
    }
  }
}


// Generate a new target number for draw mode
function generateTargetNumber() {
  gameState.currentTargetNumber = Math.floor(Math.random() * 10) + 1;
  updateTargetDisplay();
}

// Update the target number display
function updateTargetDisplay() {
  const targetNumber = document.getElementById("target-number");
  if (targetNumber) {
    targetNumber.textContent = gameState.currentTargetNumber;
  }
}

// Setup draw mode drag handlers
function setupDrawModeHandlers() {
  const gridContainer = document.getElementById("grid-container");
  let isDrawing = false;
  let drawStartBox = null;

  // Helper function to start drawing
  function startDrawing(box) {
    if (gameState.gameMode !== "draw") return;
    if (!box) return;

    // Check if this is an empty box
    const hasChildren = box.hasChildNodes();
    if (hasChildren) return;

    // Check if this is the first empty box
    const firstEmptyBox = getFirstEmptyBox();

    if (!firstEmptyBox || box !== firstEmptyBox.box) {
      return;
    }

    isDrawing = true;
    drawStartBox = box;

    // Add preview to start box
    addGhostMarble(box);
  }

  // Mouse down handler
  gridContainer.addEventListener("mousedown", (e) => {
    const box = e.target.closest(".box");
    startDrawing(box);
    e.preventDefault();
  });

  // Touch start handler
  gridContainer.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const box = element?.closest(".box");
      startDrawing(box);
      e.preventDefault();
    }
  }, { passive: false });

  // Helper function for draw move
  function handleDrawMove(box) {
    if (!isDrawing || gameState.gameMode !== "draw") return;
    if (!box) return;

    // Get all empty boxes from start to current hover
    const boxesToFill = getBoxesFromStartToHover(drawStartBox, box);

    // Clear all existing ghost marbles
    clearAllGhostMarbles();

    // Add ghost marbles to all boxes in range
    boxesToFill.forEach((b) => addGhostMarble(b));

    // Ensure there's an empty row below if the last row has content
    ensureEmptyRowBelowLastRow();
  }

  // Mouse move handler
  document.addEventListener("mousemove", (e) => {
    const box = e.target.closest(".box");
    handleDrawMove(box);
  });

  // Touch move handler
  document.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const box = element?.closest(".box");
      handleDrawMove(box);
      e.preventDefault(); // Prevent scrolling while drawing
    }
  }, { passive: false });

  // Helper function to end drawing
  function endDrawing() {
    if (!isDrawing || gameState.gameMode !== "draw") return;

    isDrawing = false;

    // Count ghost marbles
    const ghostMarbles = document.querySelectorAll(".ghost-marble");
    const drawnCount = ghostMarbles.length;

    // Get the boxes with ghost marbles
    const drawnBoxes = Array.from(ghostMarbles).map(
      (marble) => marble.parentElement,
    );

    // Check if count matches target
    const isCorrect = drawnCount === gameState.currentTargetNumber;

    if (isCorrect) {
      // Correct! Convert ghost marbles to real marbles
      fillDrawnBoxes(drawnBoxes, true);
    } else {
      // Incorrect! Show error and clear
      fillDrawnBoxes(drawnBoxes, false);
    }

    // Clear all ghost marbles
    clearAllGhostMarbles();

    // For ERROR case only: remove unnecessary empty rows after clearing ghosts
    // For success case, fillDrawnBoxes will handle cleanup after placing marbles
    if (!isCorrect) {
      removeUnnecessaryEmptyRows();
    }

    drawStartBox = null;
  }

  // Mouse up handler
  document.addEventListener("mouseup", () => {
    endDrawing();
  });

  // Touch end handler
  document.addEventListener("touchend", () => {
    endDrawing();
  });
}

// Add a ghost marble to a box
function addGhostMarble(box) {
  if (!box || box.querySelector(".ghost-marble")) return;

  const ghost = document.createElement("div");
  ghost.className = "marble ghost-marble";
  ghost.textContent = "?";

  box.appendChild(ghost);
}

// Clear all ghost marbles
function clearAllGhostMarbles() {
  document.querySelectorAll(".ghost-marble").forEach((ghost) => ghost.remove());
}

// Get all empty boxes from start to hover position
function getBoxesFromStartToHover(startBox, hoverBox) {
  const boxes = [];
  if (!startBox || !hoverBox) return boxes;

  // Get all boxes in order
  const allBoxes = [];
  gameState.rows.forEach((row) => {
    if (!row.isCollapsed && row.boxes) {
      row.boxes.forEach((box) => allBoxes.push(box));
    }
  });

  const startIndex = allBoxes.indexOf(startBox);
  const hoverIndex = allBoxes.indexOf(hoverBox);

  if (startIndex === -1 || hoverIndex === -1) return boxes;

  // Get all boxes from start to hover (inclusive)
  const minIndex = Math.min(startIndex, hoverIndex);
  const maxIndex = Math.max(startIndex, hoverIndex);

  for (let i = minIndex; i <= maxIndex; i++) {
    const box = allBoxes[i];
    // Only include empty boxes
    if (!box.hasChildNodes() || box.querySelector(".ghost-marble")) {
      boxes.push(box);
    }
  }

  return boxes;
}

// Check for collapses at milestones
function checkForCollapses() {
  if (gameState.totalMarbles % 1000 === 0 && gameState.totalMarbles > 0) {
    // Remove any regular rows that might exist
    const gridContainer = document.getElementById("grid-container");
    const regularRowsToRemove = gameState.rows.filter(
      (row) => !row.isCollapsed,
    );
    regularRowsToRemove.forEach((row) => {
      const index = gameState.rows.indexOf(row);
      if (index > -1) {
        gameState.rows.splice(index, 1);
      }
      row.element.classList.add("collapsing-out");
      setTimeout(() => {
        if (row.element.parentNode) {
          gridContainer.removeChild(row.element);
        }
      }, 500);
    });

    // Collapse hundred-boxes into thousand row
    collapseToThousand(gameState.totalMarbles);

    // Reset row index and create new row
    gameState.currentRowIndex = gameState.rows.length;
    addRow();
    gameState.currentRowIndex = gameState.rows.length - 1;
  } else if (gameState.totalMarbles % 100 === 0 && gameState.totalMarbles > 0) {
    // Show milestone prompt (suggest starting challenge)
    showMilestonePrompt(gameState.totalMarbles);

    // Collapse rows
    collapseToHundred(gameState.totalMarbles);

    // Reset row index
    gameState.currentRowIndex = gameState.rows.length;
  }
}

// Show milestone prompt when player reaches 100, 200, 300, etc. marbles
function showMilestonePrompt(marbleCount) {
  // Only show at multiples of 100, and only in drag mode (practice phase)
  if (marbleCount % 100 !== 0 || gameState.gameMode !== "drag") {
    return;
  }

  // Check if we've already shown this milestone
  if (gameState.milestonesShown.includes(marbleCount)) {
    return;
  }

  // Mark this milestone as shown
  gameState.milestonesShown.push(marbleCount);

  const modal = document.getElementById("milestone-modal");
  if (!modal) return;

  // Update message with marble count
  const message = document.getElementById("milestone-message");
  if (message) {
    message.textContent = `You've placed ${marbleCount} marbles! Ready to start the challenge?`;
  }

  modal.style.display = "flex";

  // Setup button handlers
  const continueBtn = document.getElementById("milestone-continue-btn");
  const startBtn = document.getElementById("milestone-start-btn");

  if (continueBtn) {
    continueBtn.onclick = () => {
      modal.style.display = "none";
    };
  }

  if (startBtn) {
    startBtn.onclick = () => {
      modal.style.display = "none";
      startChallenge();
    };
  }
}

// Show mini-game placeholder when streak requirement is reached
function showMiniGamePlaceholder() {
  const modal = document.getElementById("mini-game-modal");
  if (!modal) return;

  const streakAchieved = gameState.currentStreak;
  const unlockedCount = gameState.miniGamesUnlocked + 1; // +1 because we're about to unlock one
  const nextRequirement = 10 + (unlockedCount * 5);

  // Update modal content
  const modalMessage = document.getElementById("modal-message");
  const modalStreakCount = document.getElementById("modal-streak-count");
  const modalUnlockedCount = document.getElementById("modal-unlocked-count");
  const modalNextGoal = document.getElementById("modal-next-goal");

  if (modalMessage) {
    modalMessage.textContent = `Congratulations! You've reached a ${streakAchieved}-streak and unlocked a mini-game!`;
  }

  if (modalStreakCount) {
    modalStreakCount.textContent = streakAchieved;
  }

  if (modalUnlockedCount) {
    modalUnlockedCount.textContent = unlockedCount;
  }

  if (modalNextGoal) {
    modalNextGoal.textContent = nextRequirement;
  }

  modal.style.display = "flex";

  // Close button handler
  const closeBtn = modal.querySelector(".modal-close-btn");
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = "none";
    };
  }
}

// Fill drawn boxes with marbles and validate
function fillDrawnBoxes(boxes, isCorrect) {
  if (isCorrect) {
    // Show success feedback
    boxes.forEach((box) => box.classList.add("draw-correct"));

    // Add marbles after brief delay
    setTimeout(() => {
      boxes.forEach((box) => {
        box.classList.remove("draw-correct");

        // Create marble
        const newMarble = document.createElement("div");
        newMarble.className = "marble";

        gameState.totalMarbles++;
        newMarble.textContent = gameState.totalMarbles;

        // Get current row for color
        const rowElement = box.parentElement;
        const rowData = gameState.rows.find(
          (r) => r.element.querySelector(".row") === rowElement,
        );

        if (rowData && rowData.color) {
          newMarble.style.background = `radial-gradient(circle at 30% 30%, ${rowData.color.marbleLight}, ${rowData.color.marbleDark})`;
        }

        box.appendChild(newMarble);

        if (rowData) {
          rowData.marbleCount++;
        }

        // Check for collapses after adding each marble
        checkForCollapses();
      });

      // Update count display
      updateCountDisplay();

      // Check if we need to add a new row FIRST
      ensureEmptyRowAvailable();

      // Also ensure there's an empty row below the last row
      ensureEmptyRowBelowLastRow();

      // Remove unnecessary empty rows
      removeUnnecessaryEmptyRows();

      // Then update currentRowIndex to the first row with empty boxes
      for (let i = 0; i < gameState.rows.length; i++) {
        const row = gameState.rows[i];
        const hasEmptyBoxes =
          !row.isCollapsed && row.boxes.some((box) => !box.hasChildNodes());

        // Debug: show what's in the boxes
        if (!row.isCollapsed && row.boxes) {
          const boxStates = row.boxes.map((box) => {
            if (!box.hasChildNodes()) return "EMPTY";
            const children = Array.from(box.childNodes);
            return children.map((c) => c.className || c.nodeName).join(",");
          });
        }

        if (hasEmptyBoxes) {
          gameState.currentRowIndex = i;
          break;
        }
      }

      // Generate new target number
      generateTargetNumber();

      // Scroll to bottom to show newly added marbles
      setTimeout(() => scrollToBottom(), 100);

      // Update streak (only in active game phase)
      if (gameState.gamePhase === "active") {
        gameState.currentStreak++;
        updateStreakDisplay(true); // Animate on increase

        // Check if we've reached the next streak requirement
        if (gameState.currentStreak >= gameState.nextStreakRequirement) {
          setTimeout(() => {
            showMiniGamePlaceholder();
            gameState.miniGamesUnlocked++;
            resetStreak();
          }, 500);
        }
      }
    }, 300);
  } else {
    // Show error feedback
    boxes.forEach((box) => box.classList.add("draw-incorrect"));

    setTimeout(() => {
      boxes.forEach((box) => box.classList.remove("draw-incorrect"));
    }, 500);

    // Reset streak on wrong answer (only in active game phase)
    if (gameState.gamePhase === "active" && gameState.currentStreak > 0) {
      resetStreak();
    }
  }
}

// Ensure there's always an empty row available
function ensureEmptyRowAvailable() {
  const hasRegularRow = gameState.rows.some((row) => !row.isCollapsed);

  if (!hasRegularRow) {
    addRow();
    gameState.currentRowIndex = gameState.rows.length - 1;
    return;
  }

  // Check if current row is full
  const currentRow = gameState.rows[gameState.currentRowIndex];

  if (currentRow && currentRow.boxes.length > 0) {
    const currentRowFull = currentRow.boxes.every((box) => box.hasChildNodes());

    if (
      currentRowFull &&
      gameState.currentRowIndex === gameState.rows.length - 1
    ) {
      addRow();
      gameState.currentRowIndex++;
    }
  }
}

// Remove unnecessary empty rows (keep only one empty row after the last row with content)
function removeUnnecessaryEmptyRows() {
  // Get all regular (non-collapsed) rows
  const regularRows = gameState.rows.filter((row) => !row.isCollapsed);

  // Debug: show all rows and their content status
  regularRows.forEach((row, i) => {
    const hasContent = row.boxes.some((box) => box.hasChildNodes());
    const contentTypes = row.boxes
      .map((box) => {
        if (!box.hasChildNodes()) return "E";
        const child = box.firstChild;
        if (child.classList.contains("ghost-marble")) return "G";
        if (child.classList.contains("marble")) return "M";
        return "?";
      })
      .join("");
  });

  if (regularRows.length <= 1) {
    return;
  }

  // Find the last row that has ANY content
  let lastRowWithContent = null;
  let lastRowWithContentIndex = -1;

  for (let i = regularRows.length - 1; i >= 0; i--) {
    const row = regularRows[i];
    if (row.boxes.some((box) => box.hasChildNodes())) {
      lastRowWithContent = row;
      lastRowWithContentIndex = i;
      break;
    }
  }

  if (lastRowWithContentIndex === -1) {
    // Keep only the first row, remove all others
    const rowsToRemove = regularRows.slice(1);
    if (rowsToRemove.length > 0) {
      const gridContainer = document.getElementById("grid-container");

      // Remove from gameState immediately (for game logic)
      rowsToRemove.forEach((row) => {
        const index = gameState.rows.indexOf(row);
        if (index > -1) {
          gameState.rows.splice(index, 1);
        }
      });

      // Animate rows out with fade
      rowsToRemove.forEach((row) => {
        row.element.classList.add("fading-out");
      });

      // Wait for animation to complete, then remove from DOM
      setTimeout(() => {
        rowsToRemove.forEach((row) => {
          if (row.element.parentNode) {
            gridContainer.removeChild(row.element);
          }
        });
      }, 500);
    }
    return;
  }

  // All rows after the last row with content that are empty should be removed, except the first one
  const rowsToRemove = [];
  for (let i = lastRowWithContentIndex + 1; i < regularRows.length; i++) {
    const row = regularRows[i];
    const isEmpty = row.boxes.every((box) => !box.hasChildNodes());

    if (isEmpty && i > lastRowWithContentIndex + 1) {
      // This is an empty row after the first empty row - remove it
      rowsToRemove.push(row);
    }
  }

  if (rowsToRemove.length === 0) {
    return;
  }

  const gridContainer = document.getElementById("grid-container");

  // Remove from gameState immediately (for game logic)
  rowsToRemove.forEach((row) => {
    const index = gameState.rows.indexOf(row);
    if (index > -1) {
      gameState.rows.splice(index, 1);
    }
  });

  // Animate rows out with fade
  rowsToRemove.forEach((row) => {
    row.element.classList.add("fading-out");
  });

  // Wait for animation to complete, then remove from DOM
  setTimeout(() => {
    rowsToRemove.forEach((row) => {
      if (row.element.parentNode) {
        gridContainer.removeChild(row.element);
      }
    });
  }, 500);
}

// Ensure there's an empty row below the last row if the last row has any content
function ensureEmptyRowBelowLastRow() {
  // Get all regular (non-collapsed) rows
  const regularRows = gameState.rows.filter((row) => !row.isCollapsed);

  if (regularRows.length === 0) {
    return;
  }

  // Get the last regular row
  const lastRegularRow = regularRows[regularRows.length - 1];
  const lastRowIndex = gameState.rows.indexOf(lastRegularRow);

  // Check if the last row has ANY content (ghost marbles or real marbles)
  const hasAnyContent = lastRegularRow.boxes.some((box) => box.hasChildNodes());

  if (!hasAnyContent) {
    return;
  }

  // Check if there's already a row after the last row
  const nextRowIndex = lastRowIndex + 1;
  const hasNextRow = nextRowIndex < gameState.rows.length;

  if (!hasNextRow) {
    addRow();
  }
}

// Start the challenge - one-way transition from drag to draw mode
function startChallenge() {
  // Can only start challenge from drag mode
  if (gameState.gameMode !== "drag") {
    return;
  }

  // Switch to draw mode and start active game phase
  gameState.gameMode = "draw";
  gameState.gamePhase = "active";
  updateModeUI();
  generateTargetNumber();
}

// Update UI based on current mode
function updateModeUI() {
  const marbleGroupContainer = document.querySelector(
    ".marble-group-container",
  );
  const targetNumberContainer = document.querySelector(
    ".target-number-container",
  );
  const targetDisplay = document.getElementById("target-number-display");
  const targetNumber = document.getElementById("target-number");
  const modeControls = document.querySelector(".mode-controls");

  if (gameState.gameMode === "draw") {
    // Draw mode (active phase)
    // Hide marble group container
    if (marbleGroupContainer) marbleGroupContainer.style.display = "none";

    // Show target number container
    if (targetNumberContainer) targetNumberContainer.style.display = "flex";

    // Show target display
    if (targetDisplay) targetDisplay.style.display = "flex";

    // Hide challenge button (can't go back to drag mode)
    if (modeControls) modeControls.style.display = "none";
  } else {
    // Drag mode (practice phase)
    // Show marble group container
    if (marbleGroupContainer) marbleGroupContainer.style.display = "flex";

    // Hide target number container
    if (targetNumberContainer) targetNumberContainer.style.display = "none";

    // Clear target number display
    if (targetNumber) targetNumber.textContent = "0";

    // Show "Start Challenge!" button
    if (modeControls) modeControls.style.display = "flex";
  }
}

export {
  addMarbles,
  setupDragHandlers,
  setupDrawModeHandlers,
  updateModeUI,
  startChallenge,
};
