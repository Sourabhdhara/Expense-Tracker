// ========================================================
// STEP 1: GRAB HTML ELEMENTS BY THEIR ID
// ========================================================
const balanceDisplay = document.getElementById("balance-display");
const incomeDisplay = document.getElementById("income-display");
const expenseDisplay = document.getElementById("expense-display");

const form = document.getElementById("transaction-form");
const textInput = document.getElementById("text-input");
const amountInput = document.getElementById("amount-input");
const typeSelect = document.getElementById("type-select");
const transactionList = document.getElementById("transaction-list");

// ========================================================
// STEP 2: LOAD EXISTING DATA FROM BROWSER (localStorage)
// ========================================================
// We check if data exists in localStorage.
// If data exists, convert it from string back to array using JSON.parse.
// If no data exists, start with an empty array [].
let savedData = localStorage.getItem("myTransactions");
let transactions = [];

if (savedData !== null) {
  transactions = JSON.parse(savedData);
}

// ========================================================
// STEP 3: FUNCTION TO SAVE DATA TO LOCAL STORAGE
// ========================================================
function saveToLocalStorage() {
  // Convert our array into a text string and store it
  let stringData = JSON.stringify(transactions);
  localStorage.setItem("myTransactions", stringData);
}

// ========================================================
// STEP 4: FUNCTION TO CALCULATE TOTALS (Balance, Income, Expense)
// ========================================================
function calculateTotals() {
  let totalIncome = 0;
  let totalExpense = 0;

  // Simple for-loop to iterate through all items
  for (let i = 0; i < transactions.length; i++) {
    let currentItem = transactions[i];

    if (currentItem.type === "income") {
      totalIncome = totalIncome + currentItem.amount;
    } else {
      totalExpense = totalExpense + currentItem.amount;
    }
  }

  // Balance is simply income minus expense
  let balance = totalIncome - totalExpense;

  // Print the calculated values to the screen with 2 decimals
  balanceDisplay.textContent = "₹" + balance.toFixed(2);
  incomeDisplay.textContent = "₹" + totalIncome.toFixed(2);
  expenseDisplay.textContent = "₹" + totalExpense.toFixed(2);
}

// ========================================================
// STEP 5: FUNCTION TO DISPLAY THE LIST ON SCREEN
// ========================================================
function showTransactionsOnScreen() {
  // Clear the existing HTML list so we don't duplicate items
  transactionList.innerHTML = "";

  // If there are no items, show a simple text message
  if (transactions.length === 0) {
    transactionList.innerHTML = "<li style='text-align:center; color:#888;'>No transactions yet</li>";
    return;
  }

  // Loop through every item in our array
  for (let i = 0; i < transactions.length; i++) {
    let item = transactions[i];

    // Create a new <li> tag
    let li = document.createElement("li");

    // Add CSS classes for styling borders
    if (item.type === "income") {
      li.className = "item income-border";
    } else {
      li.className = "item expense-border";
    }

    // Determine whether to show + or - sign
    let sign = "-";
    if (item.type === "income") {
      sign = "+";
    }

    // Set the inner HTML of the list item
    li.innerHTML = `
      <span>${item.text}</span>
      <span>
        <strong>${sign}₹${item.amount.toFixed(2)}</strong>
        <button class="delete-btn" onclick="deleteTransaction(${i})">X</button>
      </span>
    `;

    // Append the <li> to our <ul> list
    transactionList.appendChild(li);
  }
}

// ========================================================
// STEP 6: FUNCTION TO ADD A NEW TRANSACTION
// ========================================================
form.addEventListener("submit", function (event) {
  // Stop the page from reloading on form submit
  event.preventDefault();

  // Read values entered by the user
  let descriptionText = textInput.value;
  let enteredAmount = Number(amountInput.value); // Convert string to number
  let selectedType = typeSelect.value;

  // Create an object for this transaction
  let newTransaction = {
    text: descriptionText,
    amount: enteredAmount,
    type: selectedType
  };

  // Add the new object to the start of our array
  transactions.unshift(newTransaction);

  // Update storage, recalculate totals, and refresh screen
  saveToLocalStorage();
  calculateTotals();
  showTransactionsOnScreen();

  // Clear input fields for next entry
  textInput.value = "";
  amountInput.value = "";
});

// ========================================================
// STEP 7: FUNCTION TO DELETE A TRANSACTION
// ========================================================
function deleteTransaction(indexToDelete) {
  // .splice(index, 1) removes 1 item at the specified index from the array
  transactions.splice(indexToDelete, 1);

  // Save the updated list and refresh the screen
  saveToLocalStorage();
  calculateTotals();
  showTransactionsOnScreen();
}

// ========================================================
// STEP 8: RUN EVERYTHING ON INITIAL PAGE LOAD
// ========================================================
calculateTotals();
showTransactionsOnScreen();