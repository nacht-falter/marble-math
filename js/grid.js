import {
  gameState,
  baseColors,
  generateRandomShade
} from "./main.js";

// Create a row of 10 boxes
function createRow(startValue) {
  const rowWrapper = document.createElement("div");
  rowWrapper.className = "row-wrapper";

  // Get base color for this tens group based on the tens place
  const tensPlace = Math.floor(startValue / 10);
  const baseColorIndex = tensPlace % baseColors.length;
  const baseColor = baseColors[baseColorIndex];

  // Generate random shade of this base color
  const rowColor = generateRandomShade(baseColor.hue);

  // Create label for the tenths value
  const label = document.createElement("div");
  label.className = "row-label";
  label.textContent = startValue;
  label.style.color = rowColor.label;

  // Create the row with boxes
  const row = document.createElement("div");
  row.className = "row";

  const boxes = [];
  for (let i = 0; i < 10; i++) {
    const box = document.createElement("div");
    box.className = "box";
    boxes.push(box);
    row.appendChild(box);
  }

  rowWrapper.appendChild(label);
  rowWrapper.appendChild(row);

  return {
    element: rowWrapper,
    boxes: boxes,
    marbleCount: 0,
    color: rowColor,
    startValue: startValue, // Store the starting value for this row
  };
}

// Add a row to the grid
function addRow() {
  const gridContainer = document.getElementById("grid-container");

  // Calculate the starting value based on the last regular row
  // Find the last non-collapsed row and add 10 to its startValue
  const regularRows = gameState.rows.filter((row) => !row.isCollapsed);
  const lastRegularRow = regularRows[regularRows.length - 1];
  const startValue = lastRegularRow ? lastRegularRow.startValue + 10 : 0;

  const rowData = createRow(startValue);

  gameState.rows.push(rowData);
  gridContainer.appendChild(rowData.element);

  // Add fade-in animation for new rows
  rowData.element.classList.add("fading-in");

  return rowData;
}

// Get the first empty box across ALL rows (not just current row)
function getFirstEmptyBox() {
  // Search ALL rows starting from row 0 to find the truly first empty box
  for (let i = 0; i < gameState.rows.length; i++) {
    const row = gameState.rows[i];

    // Skip collapsed rows
    if (row.isCollapsed) {
      continue;
    }

    const emptyBoxIndex = row.boxes.findIndex((box) => !box.hasChildNodes());

    if (emptyBoxIndex !== -1) {
      return {
        box: row.boxes[emptyBoxIndex],
        rowIndex: i,
        boxIndex: emptyBoxIndex,
      };
    }
  }

  return null;
}

// Collapse 10 hundred-boxes into a single thousand row
function collapseToThousand(thousandValue) {
  const gridContainer = document.getElementById("grid-container");

  // Collect hundred-boxes to remove (rows with collapsedType === 'hundred')
  const rowsToRemove = [];
  let removedCount = 0;
  let i = 0;

  // Find the first 10 hundred-boxes to remove
  while (removedCount < 10 && i < gameState.rows.length) {
    const row = gameState.rows[i];
    if (row.isCollapsed && row.collapsedType === "hundred") {
      rowsToRemove.push(row);
      removedCount++;
    }
    i++;
  }

  // Remove rows from gameState immediately (for game logic)
  rowsToRemove.forEach((row) => {
    const index = gameState.rows.indexOf(row);
    if (index > -1) {
      gameState.rows.splice(index, 1);
    }
  });

  // Animate rows out and remove from DOM after animation
  rowsToRemove.forEach((row) => {
    row.element.classList.add("collapsing-out");
  });

  // Wait for animation to complete, then remove from DOM
  setTimeout(() => {
    rowsToRemove.forEach((row) => {
      if (row.element.parentNode) {
        gridContainer.removeChild(row.element);
      }
    });
  }, 500);

  // Create a thousand row
  const thousandRow = createThousandRow(thousandValue);

  // Add animation class
  thousandRow.element.classList.add("collapsing-in");

  // Find the position to insert: after existing thousand rows, before hundred rows and regular rows
  // Thousand rows should come first, then hundred rows, then regular rows
  let insertIndex = 0;
  for (let i = 0; i < gameState.rows.length; i++) {
    if (gameState.rows[i].collapsedType === "thousand") {
      insertIndex = i + 1;
    } else {
      break;
    }
  }

  gameState.rows.splice(insertIndex, 0, thousandRow);

  // Insert in DOM at the same position
  const insertBeforeElement =
    insertIndex < gameState.rows.length - 1
      ? gameState.rows[insertIndex + 1].element
      : null;
  if (insertBeforeElement) {
    gridContainer.insertBefore(thousandRow.element, insertBeforeElement);
  } else {
    gridContainer.appendChild(thousandRow.element);
  }
}

// Collapse 10 rows into a single hundred row
function collapseToHundred(hundredValue) {
  const gridContainer = document.getElementById("grid-container");

  // Collect rows to remove
  const rowsToRemove = [];
  let removedCount = 0;
  let i = 0;

  // Find the first 10 regular rows to remove
  while (removedCount < 10 && i < gameState.rows.length) {
    const row = gameState.rows[i];
    if (!row.isCollapsed) {
      rowsToRemove.push(row);
      removedCount++;
    }
    i++;
  }

  // Also find any extra row that was created for the hundredth marble
  i = 0;
  while (i < gameState.rows.length) {
    const row = gameState.rows[i];
    if (
      !row.isCollapsed &&
      row.startValue >= hundredValue &&
      !rowsToRemove.includes(row)
    ) {
      rowsToRemove.push(row);
    }
    i++;
  }

  // Remove rows from gameState immediately (for game logic)
  rowsToRemove.forEach((row) => {
    const index = gameState.rows.indexOf(row);
    if (index > -1) {
      gameState.rows.splice(index, 1);
    }
  });

  // Animate rows out and remove from DOM after animation
  rowsToRemove.forEach((row) => {
    row.element.classList.add("collapsing-out");
  });

  // Wait for animation to complete, then remove from DOM
  setTimeout(() => {
    rowsToRemove.forEach((row) => {
      if (row.element.parentNode) {
        gridContainer.removeChild(row.element);
      }
    });
  }, 500);

  // Create a collapsed row
  const collapsedRow = createCollapsedRow(hundredValue);

  // Add animation class
  collapsedRow.element.classList.add("collapsing-in");

  // Find the position to insert: after existing collapsed rows, before regular rows
  const firstRegularRowIndex = gameState.rows.findIndex(
    (row) => !row.isCollapsed,
  );
  const insertIndex =
    firstRegularRowIndex === -1 ? gameState.rows.length : firstRegularRowIndex;

  gameState.rows.splice(insertIndex, 0, collapsedRow);

  // Insert in DOM at the same position
  const insertBeforeElement =
    insertIndex < gameState.rows.length - 1
      ? gameState.rows[insertIndex + 1].element
      : null;
  if (insertBeforeElement) {
    gridContainer.insertBefore(collapsedRow.element, insertBeforeElement);
  } else {
    gridContainer.appendChild(collapsedRow.element);
  }
}

// Create a collapsed row representing 100
function createCollapsedRow(hundredValue) {
  const rowWrapper = document.createElement("div");
  rowWrapper.className = "row-wrapper collapsed-row";

  // Create an empty spacer to align with regular rows that have labels
  const spacer = document.createElement("div");
  spacer.className = "row-label"; // Use same class for consistent spacing
  spacer.style.minWidth = "40px"; // Match the label width

  // Create a single large box representing 100
  const hundredBox = document.createElement("div");
  hundredBox.className = "hundred-box";
  hundredBox.textContent = hundredValue;

  rowWrapper.appendChild(spacer);
  rowWrapper.appendChild(hundredBox);

  return {
    element: rowWrapper,
    boxes: [],
    marbleCount: 100,
    isCollapsed: true,
    collapsedType: "hundred",
  };
}

// Create a collapsed row representing 1000
function createThousandRow(thousandValue) {
  const rowWrapper = document.createElement("div");
  rowWrapper.className = "row-wrapper collapsed-row";

  // Create an empty spacer to align with regular rows that have labels
  const spacer = document.createElement("div");
  spacer.className = "row-label"; // Use same class for consistent spacing
  spacer.style.minWidth = "40px"; // Match the label width

  // Create a single large box representing 1000
  const thousandBox = document.createElement("div");
  thousandBox.className = "thousand-box";
  thousandBox.textContent = thousandValue;

  rowWrapper.appendChild(spacer);
  rowWrapper.appendChild(thousandBox);

  return {
    element: rowWrapper,
    boxes: [],
    marbleCount: 1000,
    isCollapsed: true,
    collapsedType: "thousand",
  };
}

export {
  createRow,
  addRow,
  collapseToHundred,
  collapseToThousand,
  getFirstEmptyBox,
};
