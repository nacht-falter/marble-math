import {
  gameState,
  updateCountDisplay,
  resetStreak,
  updateStreakDisplay,
  updateLevelDisplay,
  updateMarbleCountDisplay,
} from "./main.js";

import {
  addRow,
  collapseToHundred,
  collapseToThousand,
  getFirstEmptyBox,
} from "./grid.js";

function createMarblesInGroup() {
  const marbleGroup = document.getElementById("marble-group");
  const marbleCountIndicator = document.getElementById(
    "marble-count-indicator",
  );
  const marbleCount = Math.floor(Math.random() * 10) + 1;

  marbleCountIndicator.textContent = marbleCount;

  for (let i = 0; i < marbleCount; i++) {
    const marble = document.createElement("div");
    marble.className = "marble";
    if (i === 0) {
      marble.classList.add("first-marble");
    }
    marbleGroup.appendChild(marble);
  }
}

// Add marbles to grid - either from marble-group or directly (mini-game)
function placeMarbleGroupInGrid(directCount = null) {
  let marbleCount;

  if (directCount !== null) {
    // Direct placement (mini-game): create marbles directly in grid
    marbleCount = directCount;
  } else {
    // Normal placement: get marbles from marble group
    const marbleGroup = document.getElementById("marble-group");
    const marbles = Array.from(marbleGroup.querySelectorAll(".marble"));
    marbleCount = marbles.length;

    if (marbleCount === 0) {
      return;
    }
  }

  let currentRow = gameState.rows[gameState.currentRowIndex];

  for (let i = 0; i < marbleCount; i++) {
    if (!currentRow) {
      if (gameState.currentRowIndex >= gameState.rows.length) {
        addRow(false);
      }
      currentRow = gameState.rows[gameState.currentRowIndex];
    }

    let emptyBoxIndex = currentRow.boxes.findIndex(
      (box) => !box.hasChildNodes(),
    );

    if (emptyBoxIndex === -1) {
      gameState.currentRowIndex++;

      if (gameState.currentRowIndex >= gameState.rows.length) {
        addRow(false);
      }

      currentRow = gameState.rows[gameState.currentRowIndex];
      emptyBoxIndex = 0;
    }

    const newMarble = document.createElement("div");
    newMarble.className = "marble";

    gameState.totalMarbles++;
    // Track marbles placed in active mode for level calculation
    // Multiply by current streak (minimum 1x)
    if (gameState.gamePhase === "active") {
      const streakMultiplier = Math.max(1, gameState.currentStreak);
      gameState.score += streakMultiplier;
    }
    newMarble.textContent = gameState.totalMarbles;

    newMarble.style.background = `radial-gradient(circle at 30% 30%, ${currentRow.color.marbleLight}, ${currentRow.color.marbleDark})`;

    currentRow.boxes[emptyBoxIndex].appendChild(newMarble);
    currentRow.marbleCount++;

    if (gameState.totalMarbles % 1000 === 0) {
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

      // After collapse, only collapsed hundred-boxes remain
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

  // Clear the marble group (only if we were using it)
  if (directCount === null) {
    const marbleGroup = document.getElementById("marble-group");
    marbleGroup.innerHTML = "";

    // Generate new marbles for the next round
    createMarblesInGroup();
  }

  // Update the count display
  updateCountDisplay();

  // Ensure there's always an empty row at the bottom
  ensureEmptyRowBelowLastRow();
}

// Setup custom drag handlers for marble group using mouse events
function setupDragHandlers() {
  const marbleGroupWrapper = document.getElementById("marble-group-wrapper");
  const marbleGroup = document.getElementById("marble-group");
  const marbleGroupContainer = document.querySelector(".marble-group-container");
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
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

    // Set grabbing cursor on body while dragging
    document.body.style.cursor = "grabbing";

    // Position the marble group wrapper at cursor
    marbleGroupWrapper.style.left = clientX - offsetX + "px";
    marbleGroupWrapper.style.top = clientY - offsetY + "px";

    // Highlight the first empty box
    const firstEmptyBox = getFirstEmptyBox();
    if (firstEmptyBox) {
      firstEmptyBox.box.classList.add("target-box");
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
    document.querySelectorAll(".box.target-box").forEach((box) => {
      box.classList.remove("target-box");
    });

    const isValidDrop = firstEmptyBox && elementUnder === firstEmptyBox.box;

    // Clear split visualization
    clearSplitVisualization();

    if (isValidDrop) {
      // Valid drop - add marbles to boxes
      placeMarbleGroupInGrid();
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

    // Reset cursor on body
    document.body.style.cursor = "";

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
      // Calculate how many marbles fit in the row containing the first empty box
      const targetRow = gameState.rows[firstEmptyBox.rowIndex];
      const emptyBoxesInRow = targetRow.boxes.filter(
        (box) => !box.hasChildNodes(),
      ).length;
      const totalMarbles = marbleGroup.querySelectorAll(".marble").length;

      // Only show split if marbles need to be split AND at least 1 marble goes in the first row
      if (totalMarbles > emptyBoxesInRow && emptyBoxesInRow > 0) {
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

    // Update visualization based on state
    if (newSplitState === "no-split" || newSplitState === null) {
      // Only clear if we were previously showing split visualization
      if (currentSplitState !== "no-split" && currentSplitState !== null) {
        clearSplitVisualization();
        currentSplitState = newSplitState;
      }
    } else {
      // Always update split visualization to track moving marbles
      const [firstCount, secondCount] = newSplitState.split("-").map(Number);
      showSplitVisualization(firstCount, secondCount);
      currentSplitState = newSplitState;
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

    // Get next row (should always exist since we maintain an empty row)
    if (nextRowIndex >= gameState.rows.length) {
      return; // No next row available, can't show split visualization
    }
    const nextRow = gameState.rows[nextRowIndex];

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
    // Recalculate positions on every call to track moving marbles
    if (firstGroupFirstMarble && firstGroupLastMarble) {
      // Get current positions of the marbles (they may have moved)
      const currentFirstMarble = marbles[0].getBoundingClientRect();
      const currentLastMarbleOfFirstGroup = marbles[firstCount - 1].getBoundingClientRect();

      // Calculate fixed width based on number of marbles and box dimensions
      const indicatorWidth = firstCount * boxWidth + (firstCount - 1) * boxGap;

      firstIndicator.style.position = "fixed";
      firstIndicator.style.left = currentFirstMarble.left + "px";
      firstIndicator.style.top = currentLastMarbleOfFirstGroup.bottom + 10 + "px";
      firstIndicator.style.width = indicatorWidth + "px";
      firstIndicator.style.zIndex = "1000";
      firstIndicator.style.textAlign = "center";
    }

    // Position the second indicator below the second group in the next row
    // Recalculate positions on every call to track repositioned marbles
    if (secondGroupFirstMarble && secondGroupLastMarble) {
      // Get current positions of the second group marbles
      const currentFirstMarbleOfSecondGroup = marbles[firstCount].getBoundingClientRect();
      const currentLastMarble = marbles[marbles.length - 1].getBoundingClientRect();

      // Calculate fixed width based on number of marbles and box dimensions
      const indicatorWidth =
        secondCount * boxWidth + (secondCount - 1) * boxGap;

      secondIndicator.style.position = "fixed";
      secondIndicator.style.left = currentFirstMarbleOfSecondGroup.left + "px";
      secondIndicator.style.top = currentLastMarble.bottom + 10 + "px";
      secondIndicator.style.width = indicatorWidth + "px";
      secondIndicator.style.zIndex = "1000";
      secondIndicator.style.textAlign = "center";
    }
  }

  function clearSplitVisualization() {
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

    // No need to remove temporary rows - we always maintain an empty row at the bottom
  }
}


// Generate a new target number for draw mode
function generateTargetNumber() {
  const level = gameState.level;

  // Progressive difficulty: both min and max increase by 1 per level
  // Level 1: 1-10, Level 2: 2-11, Level 3: 3-12, etc.
  // Cap at reasonable maximum (30)
  const min = level;
  const max = Math.min(9 + level, 30);

  gameState.currentTargetNumber = Math.floor(Math.random() * (max - min + 1)) + min;
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
  let lastRowAddY = -Infinity; // Track Y position where we last added a row

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
    lastRowAddY = -Infinity; // Reset Y position tracking

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
  function handleDrawMove(box, clientY) {
    if (!isDrawing || gameState.gameMode !== "draw") return;

    if (!box) return;

    // Get all empty boxes from start to current hover
    const boxesToFill = getBoxesFromStartToHover(drawStartBox, box);

    // Clear all existing ghost marbles
    clearAllGhostMarbles();

    // Add ghost marbles to all boxes in range
    boxesToFill.forEach((b) => addGhostMarble(b));
  }

  // Mouse move handler
  document.addEventListener("mousemove", (e) => {
    const box = e.target?.closest ? e.target.closest(".box") : null;
    handleDrawMove(box, e.clientY);
  });

  // Touch move handler
  document.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const box = element?.closest(".box");
      handleDrawMove(box, touch.clientY);
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

function generateMathProblem(level) {
  let num1, num2, answer, text, currentCap;

  // Define allowed operations based on level
  const operations = [];
  if (level >= 1) operations.push(0); // Addition
  if (level >= 2) operations.push(1); // Subtraction
  if (level >= 3) operations.push(2); // Multiplication
  if (level >= 4) operations.push(3); // Division

  const operation = operations[Math.floor(Math.random() * operations.length)];

  // Define a small offset per level to scale difficulty
  const offset = level - 1;

  // Level-specific settings
  if (level <= 2) {
    currentCap = 15;

    switch (operation) {
      case 0: // Addition
        do {
          num1 = Math.floor(Math.random() * (8 + offset)) + 2;
          num2 = Math.floor(Math.random() * (8 + offset)) + 2;
          answer = num1 + num2;
        } while (answer > currentCap);
        text = `${num1} + ${num2}`;
        break;

      case 1: // Subtraction
        num1 = Math.floor(Math.random() * (8 + offset)) + 8;
        num2 = Math.floor(Math.random() * (5 + offset)) + 2;
        answer = num1 - num2;
        text = `${num1} − ${num2}`;
        break;
    }

  } else if (level <= 4) {
    currentCap = 30;

    switch (operation) {
      case 0: // Addition
        do {
          num1 = Math.floor(Math.random() * (12 + offset)) + 8;
          num2 = Math.floor(Math.random() * (12 + offset)) + 8;
          answer = num1 + num2;
        } while (answer > currentCap || answer < 15);
        text = `${num1} + ${num2}`;
        break;

      case 1: // Subtraction
        do {
          num1 = Math.floor(Math.random() * (20 + offset)) + 20;
          num2 = Math.floor(Math.random() * (12 + offset)) + 5;
          answer = num1 - num2;
        } while (answer > currentCap || answer < 15);
        text = `${num1} − ${num2}`;
        break;

      case 2: // Multiplication
        do {
          num1 = Math.floor(Math.random() * (5 + offset)) + 3;
          num2 = Math.floor(Math.random() * (5 + offset)) + 3;
          answer = num1 * num2;
        } while (answer > currentCap);
        text = `${num1} × ${num2}`;
        break;

      case 3: // Division
        answer = Math.floor(Math.random() * (13 + offset)) + 15;
        num2 = Math.floor(Math.random() * (4 + offset)) + 2;
        num1 = answer * num2;
        text = `${num1} ÷ ${num2}`;
        break;
    }

  } else {
    currentCap = 50;

    switch (operation) {
      case 0: // Addition
        do {
          num1 = Math.floor(Math.random() * (20 + offset)) + 15;
          num2 = Math.floor(Math.random() * (20 + offset)) + 15;
          answer = num1 + num2;
        } while (answer > currentCap);
        text = `${num1} + ${num2}`;
        break;

      case 1: // Subtraction
        num1 = Math.floor(Math.random() * (30 + offset)) + 40;
        num2 = Math.floor(Math.random() * (20 + offset)) + 10;
        answer = num1 - num2;
        if (answer > currentCap) answer = currentCap;
        text = `${num1} − ${num2}`;
        break;

      case 2: // Multiplication
        do {
          num1 = Math.floor(Math.random() * (8 + offset)) + 2;
          num2 = Math.floor(Math.random() * (8 + offset)) + 2;
          answer = num1 * num2;
        } while (answer > currentCap);
        text = `${num1} × ${num2}`;
        break;

      case 3: // Division
        answer = Math.floor(Math.random() * (25 + offset)) + 20;
        num2 = Math.floor(Math.random() * (5 + offset)) + 2;
        num1 = answer * num2;
        text = `${num1} ÷ ${num2}`;
        break;
    }
  }

  return { text, answer, currentCap };
}

// Show mini-game when streak requirement is reached
function showMiniGame() {
  const modal = document.getElementById("mini-game-modal");
  if (!modal) return;

  // Generate math problem based on difficulty
  const level = gameState.level;
  const problem = generateMathProblem(level);

  // Store the correct answer for validation
  modal.dataset.correctAnswer = problem.answer;

  // Update problem display
  const problemDisplay = document.getElementById("mini-game-problem");
  if (problemDisplay) {
    problemDisplay.textContent = problem.text;
  }

  // Create mini-grid with enough rows for the current level's cap
  createMiniGrid(problem.currentCap);

  // Hide target display container
  const targetContainer = document.querySelector(".target-number-container");
  if (targetContainer) {
    targetContainer.classList.add("hidden-for-minigame");
  }

  // Show modal
  modal.style.display = "flex";
}

// Create the mini-grid with enough rows to fit the current level's cap
function createMiniGrid(currentCap) {
  const container = document.getElementById("mini-grid-container");
  if (!container) return;

  // Clear existing grid
  container.innerHTML = "";

  // Calculate number of rows needed for this level's cap (each row has 10 boxes)
  const rowsNeeded = Math.ceil(currentCap / 10);

  // Create the needed rows
  for (let rowNum = 0; rowNum < rowsNeeded; rowNum++) {
    const row = document.createElement("div");
    row.className = "mini-row";

    for (let boxNum = 0; boxNum < 10; boxNum++) {
      const box = document.createElement("div");
      box.className = "mini-box box"; // Add "box" class for compatibility

      // Add target-box class to the first box
      if (rowNum === 0 && boxNum === 0) {
        box.classList.add("target-box");
      }

      row.appendChild(box);
    }

    container.appendChild(row);
  }

  // Setup drawing handlers for mini-grid
  setupMiniGridDrawing();
}

// Setup drawing mechanism for mini-grid (reusing main grid logic)
function setupMiniGridDrawing() {
  const container = document.getElementById("mini-grid-container");
  if (!container) return;

  let isDrawing = false;
  let drawStartBox = null;

  // Get all mini boxes in order
  function getAllMiniBoxes() {
    const rows = Array.from(container.querySelectorAll(".mini-row"));
    return rows.flatMap(row => Array.from(row.querySelectorAll(".box")));
  }

  // Get boxes from start to hover (same logic as main grid)
  function getMiniBoxesFromStartToHover(startBox, hoverBox) {
    const allBoxes = getAllMiniBoxes();
    const startIndex = allBoxes.indexOf(startBox);
    const hoverIndex = allBoxes.indexOf(hoverBox);

    if (startIndex === -1 || hoverIndex === -1) return [];

    const minIndex = Math.min(startIndex, hoverIndex);
    const maxIndex = Math.max(startIndex, hoverIndex);

    const boxes = [];
    for (let i = minIndex; i <= maxIndex; i++) {
      const box = allBoxes[i];
      // Only include empty boxes
      if (!box.hasChildNodes() || box.querySelector(".ghost-marble")) {
        boxes.push(box);
      }
    }

    return boxes;
  }

  function startDrawing(box) {
    if (!box) return;

    // Check if empty
    if (box.hasChildNodes()) return;

    // Only allow starting from first empty box
    const allBoxes = getAllMiniBoxes();
    const firstEmptyBox = allBoxes.find(b => !b.hasChildNodes());

    if (!firstEmptyBox || box !== firstEmptyBox) {
      return;
    }

    isDrawing = true;
    drawStartBox = box;
    addGhostMarble(box); // Reuse main grid function
  }

  function handleDrawMove(box) {
    if (!isDrawing || !box) return;

    const boxesToFill = getMiniBoxesFromStartToHover(drawStartBox, box);
    clearAllGhostMarbles(); // Reuse main grid function
    boxesToFill.forEach(b => addGhostMarble(b)); // Reuse main grid function
  }

  function endDrawing() {
    if (!isDrawing) return;
    isDrawing = false;

    // Validate answer
    validateMiniGameAnswer();

    drawStartBox = null;
  }

  // Mouse events
  container.addEventListener("mousedown", (e) => {
    const box = e.target.closest(".box");
    if (box) {
      startDrawing(box);
      e.preventDefault();
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDrawing) return;
    const box = e.target?.closest ? e.target.closest(".box") : null;
    handleDrawMove(box);
  });

  document.addEventListener("mouseup", () => {
    endDrawing();
  });

  // Touch events
  container.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const box = element?.closest(".box");
      if (box) {
        startDrawing(box);
        e.preventDefault();
      }
    }
  }, { passive: false });

  document.addEventListener("touchmove", (e) => {
    if (!isDrawing) return;
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);
      const box = element?.closest(".box");
      handleDrawMove(box);
      e.preventDefault();
    }
  }, { passive: false });

  document.addEventListener("touchend", () => {
    endDrawing();
  }, { passive: false });
}

// Validate the mini-game answer
function validateMiniGameAnswer() {
  const modal = document.getElementById("mini-game-modal");
  const container = document.getElementById("mini-grid-container");
  if (!modal || !container) return;

  const correctAnswer = parseInt(modal.dataset.correctAnswer);
  const ghostMarbles = container.querySelectorAll(".ghost-marble");
  const userAnswer = ghostMarbles.length;

  // Get the boxes with ghost marbles
  const drawnBoxes = Array.from(ghostMarbles).map(ghost => ghost.parentElement);

  // Clear ghost marbles
  clearAllGhostMarbles();

  const isCorrect = userAnswer === correctAnswer;

  const modalContent = modal.querySelector(".mini-game-content");

  if (isCorrect) {
    // Show success feedback (green boxes) and place actual marbles
    drawnBoxes.forEach((box) => {
      box.classList.add("draw-correct");

      // Create and add a real marble to this box
      const marble = document.createElement("div");
      marble.className = "marble";
      box.appendChild(marble);
    });

    if (modalContent) {
      modalContent.classList.add("shine");
    }

    setTimeout(() => {
      const firstEmptyBox = getFirstEmptyBox();

      if (firstEmptyBox && modalContent) {
        const modalRect = modalContent.getBoundingClientRect();
        const targetRect = firstEmptyBox.box.getBoundingClientRect();

        const deltaX = targetRect.left + (targetRect.width / 2) - (modalRect.left + modalRect.width / 2);
        const deltaY = targetRect.top + (targetRect.height / 2) - (modalRect.top + modalRect.height / 2);

        modalContent.style.setProperty('--collapse-x', `${deltaX}px`);
        modalContent.style.setProperty('--collapse-y', `${deltaY}px`);
        modalContent.classList.add("collapse-to-target");
      }

      const modalBackground = modal.querySelector(".modal-background");
      if (modalBackground) {
        modalBackground.classList.add("fade-out");
      }

      setTimeout(() => {
        if (modalContent) {
          modalContent.classList.remove("collapse-to-target");
          modalContent.classList.remove("shine");
          modalContent.style.transform = "";
          modalContent.style.opacity = "";
          modalContent.style.removeProperty('--collapse-x');
          modalContent.style.removeProperty('--collapse-y');
        }
        const modalBackground = modal.querySelector(".modal-background");
        if (modalBackground) {
          modalBackground.classList.remove("fade-out");
        }

        modal.style.display = "none";
        container.innerHTML = "";

        // Show target display container again
        const targetContainer = document.querySelector(".target-number-container");
        if (targetContainer) {
          targetContainer.classList.remove("hidden-for-minigame");
        }

        setTimeout(() => {
          placeMarbleGroupInGrid(correctAnswer);
        }, 100);
      }, 600);
    }, 400);
  } else {
    // Show error feedback (red boxes)
    drawnBoxes.forEach((box) => box.classList.add("draw-incorrect"));

    // Add shake animation to modal
    if (modalContent) {
      modalContent.classList.add("shake");
    }

    // Wait for shake, then slide out to side
    setTimeout(() => {
      if (modalContent) {
        modalContent.classList.remove("shake");
        modalContent.classList.add("slide-out-side");
      }

      // Fade out the modal background
      const modalBackground = modal.querySelector(".modal-background");
      if (modalBackground) {
        modalBackground.classList.add("fade-out");
      }

      // Wait for slide animation, then close modal
      setTimeout(() => {
        // Remove animation classes and reset transforms
        if (modalContent) {
          modalContent.classList.remove("slide-out-side");
          modalContent.style.transform = "";
          modalContent.style.opacity = "";
        }
        if (modalBackground) {
          modalBackground.classList.remove("fade-out");
        }

        // Close modal
        modal.style.display = "none";
        container.innerHTML = ""; // Clean up

        // Show target display container again
        const targetContainer = document.querySelector(".target-number-container");
        if (targetContainer) {
          targetContainer.classList.remove("hidden-for-minigame");
        }
      }, 500); // Wait for slide animation
    }, 500); // Show red feedback and shake
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
        // Track marbles placed in active mode for level calculation
        // Multiply by current streak (minimum 1x)
        if (gameState.gamePhase === "active") {
          const streakMultiplier = Math.max(1, gameState.currentStreak);
          gameState.score += streakMultiplier;
        }
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

      // Update target-box highlight for next empty box
      document.querySelectorAll(".box.target-box").forEach((box) => {
        box.classList.remove("target-box");
      });
      const firstEmptyBox = getFirstEmptyBox();
      if (firstEmptyBox) {
        firstEmptyBox.box.classList.add("target-box");
      }

      // Update streak (only in active game phase)
      if (gameState.gamePhase === "active") {
        // Only increment streak if we haven't reached the requirement yet
        // This prevents going from 10/10 to 11/10, 12/10, etc.
        if (gameState.currentStreak < gameState.nextStreakRequirement) {
          gameState.currentStreak++;
          updateStreakDisplay(true); // Animate on increase

          // Check if we've just reached the requirement
          if (gameState.currentStreak >= gameState.nextStreakRequirement) {
            setTimeout(() => {
              showMiniGame();
              gameState.miniGamesUnlocked++;
              resetStreak();
            }, 500);
          }
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

// Remove unnecessary empty rows (but keep enough for the current max target)
function removeUnnecessaryEmptyRows() {
  // Only applies to draw mode
  if (gameState.gameMode !== "draw") {
    return;
  }

  // Get all regular (non-collapsed) rows
  const regularRows = gameState.rows.filter((row) => !row.isCollapsed);

  if (regularRows.length <= 1) {
    return;
  }

  // Calculate max possible target for current level (same logic as ensureEmptyRowBelowLastRow)
  const level = gameState.level;
  const maxTargetForLevel = Math.min(9 + level, 30);

  // Count total empty boxes
  let totalEmptyBoxes = 0;
  regularRows.forEach(row => {
    totalEmptyBoxes += row.boxes.filter(b => !b.hasChildNodes()).length;
  });

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
    // All rows are empty - keep enough for max target, remove the rest
    const rowsToRemove = [];

    for (let i = regularRows.length - 1; i >= 0; i--) {
      // Only remove if we'd still have enough empty boxes after removal
      if (totalEmptyBoxes - 10 >= maxTargetForLevel) {
        rowsToRemove.push(regularRows[i]);
        totalEmptyBoxes -= 10;
      }
    }

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

  // All rows after the last row with content that are empty can be removed
  // BUT only if we still have enough empty boxes for max target
  const rowsToRemove = [];
  for (let i = regularRows.length - 1; i > lastRowWithContentIndex; i--) {
    const row = regularRows[i];
    const isEmpty = row.boxes.every((box) => !box.hasChildNodes());

    if (isEmpty) {
      // Only remove if we'd still have enough empty boxes after removal
      if (totalEmptyBoxes - 10 >= maxTargetForLevel) {
        rowsToRemove.push(row);
        totalEmptyBoxes -= 10;
      }
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

// Ensure there are enough empty rows to accommodate the current max target number
function ensureEmptyRowBelowLastRow() {
  // Only applies to draw mode
  if (gameState.gameMode !== "draw") {
    return;
  }

  // Get all regular (non-collapsed) rows
  const regularRows = gameState.rows.filter((row) => !row.isCollapsed);

  // Count total empty boxes available
  let totalEmptyBoxes = 0;
  regularRows.forEach(row => {
    totalEmptyBoxes += row.boxes.filter(b => !b.hasChildNodes()).length;
  });

  // Calculate max possible target for current level (same logic as generateTargetNumber)
  const level = gameState.level;
  const maxTargetForLevel = Math.min(9 + level, 30);

  // Add rows until we have enough empty boxes for the max target
  while (totalEmptyBoxes < maxTargetForLevel) {
    addRow();
    totalEmptyBoxes += 10; // Each new row adds 10 empty boxes
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

  // Activate all stat badges immediately
  updateLevelDisplay();
  updateMarbleCountDisplay();
  updateStreakDisplay();
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

  // Remove target-box from all boxes first
  document.querySelectorAll(".box.target-box").forEach((box) => {
    box.classList.remove("target-box");
  });

  if (gameState.gameMode === "draw") {
    // Draw mode (active phase)
    // Hide marble group container
    if (marbleGroupContainer) marbleGroupContainer.style.display = "none";

    // Show target number container
    if (targetNumberContainer) targetNumberContainer.style.display = "flex";

    // Show target display
    if (targetDisplay) targetDisplay.style.display = "flex";

    // Hide challenge button with transition (can't go back to drag mode)
    if (modeControls) modeControls.classList.add("hidden");

    // Highlight the first empty box
    const firstEmptyBox = getFirstEmptyBox();
    if (firstEmptyBox) {
      firstEmptyBox.box.classList.add("target-box");
    }
  } else {
    // Drag mode (practice phase)
    // Show marble group container
    if (marbleGroupContainer) marbleGroupContainer.style.display = "flex";

    // Hide target number container
    if (targetNumberContainer) targetNumberContainer.style.display = "none";

    // Clear target number display
    if (targetNumber) targetNumber.textContent = "0";

    // Show "Start Challenge!" button
    if (modeControls) modeControls.classList.remove("hidden");

    // Highlight the first empty box
    const firstEmptyBox = getFirstEmptyBox();
    if (firstEmptyBox) {
      firstEmptyBox.box.classList.add("target-box");
    }
  }
}

export {
  createMarblesInGroup,
  setupDragHandlers,
  setupDrawModeHandlers,
  updateModeUI,
  startChallenge,
  showMiniGame,
};
