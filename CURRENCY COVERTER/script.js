const form = document.querySelector("#converterForm");
const amountInput = document.querySelector("#usdAmount");
const rateInput = document.querySelector("#exchangeRate");
const resultOutput = document.querySelector("#convertedAmount");
const errorMessage = document.querySelector("#errorMessage");
const clearButton = document.querySelector("#clearBtn");

const ugxFormatter = new Intl.NumberFormat("en-UG", {
  maximumFractionDigits: 2,
});

function convertCurrency(event) {
  event.preventDefault();
  errorMessage.textContent = "";
  resultOutput.textContent = "—";

  const amount = Number(amountInput.value);
  const rate = Number(rateInput.value);

  if (amountInput.value.trim() === "" || !Number.isFinite(amount) || amount <= 0) {
    errorMessage.textContent = "Enter an amount greater than zero.";
    amountInput.focus();
    return;
  }

  if (rateInput.value.trim() === "" || !Number.isFinite(rate) || rate <= 0) {
    errorMessage.textContent = "Enter a valid exchange rate greater than zero.";
    rateInput.focus();
    return;
  }

  resultOutput.textContent = ugxFormatter.format(amount * rate) + " UGX";
}

function clearConverter() {
  form.reset();
  errorMessage.textContent = "";
  resultOutput.textContent = "—";
  amountInput.focus();
}

form.addEventListener("submit", convertCurrency);
clearButton.addEventListener("click", clearConverter);

[amountInput, rateInput].forEach((input) => {
  input.addEventListener("input", () => {
    errorMessage.textContent = "";
    resultOutput.textContent = "—";
  });
});