import {
  gameState,
  updateCountDisplay,
  showMilestoneFeedback,
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
      // Show milestone feedback
      showMilestoneFeedback(gameState.totalMarbles);

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
      // Show milestone feedback
      showMilestoneFeedback(gameState.totalMarbles);

      // Unlock draw mode on first collapse (at 100)
      if (gameState.totalMarbles === 100) {
        unlockDrawMode();
      }

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

  // Generate new marbles for the next round
  addMarbles();
}

// Setup custom drag handlers for marble group using mouse events
function setupDragHandlers() {
  const marbleGroupWrapper = document.getElementById("marble-group-wrapper");
  const marbleGroup = document.getElementById("marble-group");
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let temporaryNextRow = null; // Track if we created a temporary next row

  // Use capture phase to ensure we catch all mousedown events
  marbleGroupWrapper.addEventListener(
    "mousedown",
    (e) => {
      isDragging = true;
      const rect = marbleGroupWrapper.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;

      marbleGroupWrapper.classList.add("dragging");
      marbleGroupWrapper.style.position = "fixed";
      marbleGroupWrapper.style.zIndex = "1000";
      marbleGroupWrapper.style.pointerEvents = "none"; // Allow detecting elements underneath

      // Position the marble group wrapper at cursor
      marbleGroupWrapper.style.left = e.clientX - offsetX + "px";
      marbleGroupWrapper.style.top = e.clientY - offsetY + "px";

      // Highlight the first empty box
      const firstEmptyBox = getFirstEmptyBox();
      if (firstEmptyBox) {
        firstEmptyBox.box.classList.add("drop-target");
      }

      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    // Move the marble group wrapper with the cursor
    marbleGroupWrapper.style.left = e.clientX - offsetX + "px";
    marbleGroupWrapper.style.top = e.clientY - offsetY + "px";

    // Check if we're over the drop target and need to show split
    updateSplitVisualization();
  });

  document.addEventListener("mouseup", (e) => {
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
    marbleGroupWrapper.classList.remove("dragging");
    marbleGroupWrapper.style.position = "";
    marbleGroupWrapper.style.zIndex = "";
    marbleGroupWrapper.style.pointerEvents = "";
    marbleGroupWrapper.style.left = "";
    marbleGroupWrapper.style.top = "";
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

    // Only show split if we're over the correct box
    if (!firstEmptyBox || elementUnder !== firstEmptyBox.box) {
      clearSplitVisualization();
      return;
    }

    // Calculate how many marbles fit in current row
    const currentRow = gameState.rows[gameState.currentRowIndex];
    const emptyBoxesInRow = currentRow.boxes.filter(
      (box) => !box.hasChildNodes(),
    ).length;
    const totalMarbles = marbleGroup.querySelectorAll(".marble").length;

    if (totalMarbles <= emptyBoxesInRow) {
      // All marbles fit, no split needed
      clearSplitVisualization();
      return;
    }

    // Split needed - show visual feedback
    const marblesInFirstRow = emptyBoxesInRow;
    const marblesInSecondRow = totalMarbles - emptyBoxesInRow;

    showSplitVisualization(marblesInFirstRow, marblesInSecondRow);
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

    // Get current row boxes for width calculation
    const currentRow = gameState.rows[gameState.currentRowIndex];
    const firstBox = currentRow.boxes[0];
    const firstBoxRect = firstBox.getBoundingClientRect();
    const boxWidth = firstBoxRect.width;
    const boxGap = 5; // From CSS .row gap

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

// Unlock draw mode with celebration
function unlockDrawMode() {
  if (gameState.drawModeUnlocked) return;

  gameState.drawModeUnlocked = true;

  // Enable the mode toggle button
  const modeToggleBtn = document.getElementById("mode-toggle-btn");
  if (modeToggleBtn) {
    modeToggleBtn.disabled = false;
    modeToggleBtn.textContent = "✍️ Switch to Draw Mode";
  }

  // Show unlock celebration
  const feedback = document.getElementById("feedback");
  if (feedback) {
    feedback.textContent =
      "✍️ Draw Mode Unlocked! Click the button to try a new challenge!";
    feedback.style.display = "block";
    feedback.classList.add("celebration");

    setTimeout(() => {
      feedback.style.display = "none";
      feedback.classList.remove("celebration");
    }, 5000);
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

  gridContainer.addEventListener("mousedown", (e) => {
    if (gameState.gameMode !== "draw") return;

    const box = e.target.closest(".box");
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

    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDrawing || gameState.gameMode !== "draw") return;

    const box = e.target.closest(".box");
    if (!box) return;

    // Get all empty boxes from start to current hover
    const boxesToFill = getBoxesFromStartToHover(drawStartBox, box);

    // Clear all existing ghost marbles
    clearAllGhostMarbles();

    // Add ghost marbles to all boxes in range
    boxesToFill.forEach((b) => addGhostMarble(b));

    // Ensure there's an empty row below if the last row has content
    ensureEmptyRowBelowLastRow();
  });

  document.addEventListener("mouseup", () => {
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
    // Show milestone feedback
    showMilestoneFeedback(gameState.totalMarbles);

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
    // Show milestone feedback
    showMilestoneFeedback(gameState.totalMarbles);

    // Unlock draw mode on first collapse (at 100)
    if (gameState.totalMarbles === 100) {
      unlockDrawMode();
    }

    // Collapse rows
    collapseToHundred(gameState.totalMarbles);

    // Reset row index
    gameState.currentRowIndex = gameState.rows.length;
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
    }, 300);
  } else {
    // Show error feedback
    boxes.forEach((box) => box.classList.add("draw-incorrect"));

    setTimeout(() => {
      boxes.forEach((box) => box.classList.remove("draw-incorrect"));
    }, 500);

    // Show error message
    const feedback = document.getElementById("feedback");
    if (feedback) {
      feedback.textContent = `❌ Oops! You drew ${boxes.length} but needed ${gameState.currentTargetNumber}. Try again!`;
      feedback.style.display = "block";
      feedback.style.backgroundColor = "#ffe8e8";
      feedback.style.border = "2px solid #e74c3c";
      feedback.style.color = "#c0392b";

      setTimeout(() => {
        feedback.style.display = "none";
      }, 2000);
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

// Toggle between drag and draw modes
function toggleMode() {
  if (gameState.gameMode === "drag") {
    gameState.gameMode = "draw";
    updateModeUI();
    generateTargetNumber();
  } else {
    gameState.gameMode = "drag";
    updateModeUI();
  }
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
  const modeToggleBtn = document.getElementById("mode-toggle-btn");

  if (gameState.gameMode === "draw") {
    // Hide marble group container
    if (marbleGroupContainer) marbleGroupContainer.style.display = "none";

    // Show target number container
    if (targetNumberContainer) targetNumberContainer.style.display = "flex";

    // Show target display
    if (targetDisplay) targetDisplay.style.display = "block";

    // Update button text
    if (modeToggleBtn) modeToggleBtn.textContent = "Switch to Drag Mode";
  } else {
    // Show marble group container
    if (marbleGroupContainer) marbleGroupContainer.style.display = "flex";

    // Hide target number container
    if (targetNumberContainer) targetNumberContainer.style.display = "none";

    // Hide target display
    if (targetDisplay) targetDisplay.style.display = "none";

    // Update button text
    if (modeToggleBtn) modeToggleBtn.textContent = "Switch to Draw Mode";
  }
}

export {
  addMarbles,
  setupDragHandlers,
  setupDrawModeHandlers,
  updateModeUI,
  toggleMode,
};
