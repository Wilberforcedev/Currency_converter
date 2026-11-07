const API_ROOT = "https://api.frankfurter.dev/v2";
const form = document.querySelector("#converterForm");
const amountInput = document.querySelector("#amount");
const fromSelect = document.querySelector("#fromCurrency");
const toSelect = document.querySelector("#toCurrency");
const resultOutput = document.querySelector("#convertedAmount");
const resultPair = document.querySelector("#resultPair");
const rateDetails = document.querySelector("#rateDetails");
const errorMessage = document.querySelector("#errorMessage");
const clearButton = document.querySelector("#clearBtn");
const swapButton = document.querySelector("#swapBtn");
const convertButton = document.querySelector("#convertBtn");
const convertButtonText = document.querySelector("#convertButtonText");
const serviceStatus = document.querySelector("#serviceStatus");
const serviceStatusText = document.querySelector("#serviceStatusText");

const preferredCurrencies = [
  "USD", "EUR", "GBP", "UGX", "KES", "TZS", "RWF", "ZAR", "NGN", "GHS",
  "JPY", "CNY", "INR", "CAD", "AUD", "CHF", "AED", "SAR", "EGP", "ETB",
  "SSP", "XOF", "XAF", "TRY", "BRL", "NZD"
];
const fallbackCurrencies = [
  ["AED", "United Arab Emirates Dirham"], ["AUD", "Australian Dollar"],
  ["BRL", "Brazilian Real"], ["CAD", "Canadian Dollar"], ["CHF", "Swiss Franc"],
  ["CNY", "Chinese Yuan"], ["EGP", "Egyptian Pound"], ["EUR", "Euro"],
  ["GBP", "Pound Sterling"], ["GHS", "Ghanaian Cedi"], ["INR", "Indian Rupee"],
  ["JPY", "Japanese Yen"], ["KES", "Kenyan Shilling"], ["NGN", "Nigerian Naira"],
  ["NZD", "New Zealand Dollar"], ["RWF", "Rwandan Franc"], ["SAR", "Saudi Riyal"],
  ["SSP", "South Sudanese Pound"], ["TZS", "Tanzanian Shilling"],
  ["UGX", "Ugandan Shilling"], ["USD", "United States Dollar"],
  ["XAF", "Central African CFA Franc"], ["XOF", "West African CFA Franc"],
  ["ZAR", "South African Rand"]
];
const rateCache = new Map();

function setServiceStatus(message, state = "") {
  serviceStatusText.textContent = message;
  serviceStatus.classList.remove("is-ready", "is-error");
  if (state) serviceStatus.classList.add(`is-${state}`);
}

function sortCurrencies(currencies) {
  const preferredOrder = new Map(preferredCurrencies.map((code, index) => [code, index]));
  return currencies.sort((a, b) => {
    const aRank = preferredOrder.has(a.code) ? preferredOrder.get(a.code) : Infinity;
    const bRank = preferredOrder.has(b.code) ? preferredOrder.get(b.code) : Infinity;
    if (aRank !== bRank) return aRank - bRank;
    return a.name.localeCompare(b.name);
  });
}

function fillSelect(select, currencies, selectedCode) {
  select.replaceChildren();
  for (const currency of currencies) {
    const option = document.createElement("option");
    option.value = currency.code;
    option.textContent = `${currency.code} — ${currency.name}`;
    select.append(option);
  }
  select.value = selectedCode;
}

function setPairCaption() {
  const from = fromSelect.value;
  const to = toSelect.value;
  const fromName = fromSelect.selectedOptions[0]?.textContent ?? from;
  const toName = toSelect.selectedOptions[0]?.textContent ?? to;
  resultPair.textContent = `${fromName} → ${toName}`;
}

async function loadCurrencies() {
  try {
    const response = await fetch(`${API_ROOT}/currencies`);
    if (!response.ok) throw new Error("The currency list could not be loaded.");
    const data = await response.json();
    const currencies = data
      .filter((item) => item.type === "currency")
      .map((item) => ({ code: item.iso_code, name: item.name }))
      .filter((item) => item.code && item.name);
    if (!currencies.some((item) => item.code === "USD") ||
        !currencies.some((item) => item.code === "UGX")) {
      throw new Error("The currency list is incomplete.");
    }
    enableConverter(sortCurrencies(currencies), `${currencies.length} currencies available`);
  } catch {
    const currencies = fallbackCurrencies.map(([code, name]) => ({ code, name }));
    enableConverter(sortCurrencies(currencies), "Using basic currency list", "error");
    setServiceStatus("Rate service unavailable", "error");
  }
}

function enableConverter(currencies, statusMessage, statusState = "ready") {
  fillSelect(fromSelect, currencies, "USD");
  fillSelect(toSelect, currencies, "UGX");
  fromSelect.disabled = false;
  toSelect.disabled = false;
  swapButton.disabled = false;
  convertButton.disabled = false;
  convertButtonText.textContent = "Convert currency";
  if (statusState !== "error") setServiceStatus(statusMessage, statusState);
  setPairCaption();
}

function formatAmount(amount, currency) {
  try {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      maximumSignificantDigits: 12
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
  }
}

async function getRate(from, to) {
  if (from === to) return { rate: 1, date: "Same currency" };
  const cacheKey = `${from}:${to}`;
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < 30 * 60 * 1000) return cached.data;

  const response = await fetch(`${API_ROOT}/rate/${encodeURIComponent(from.toLowerCase())}/${encodeURIComponent(to.toLowerCase())}`);
  if (!response.ok) {
    if (response.status === 404 || response.status === 422) {
      throw new Error(`A current reference rate is not available for ${from} to ${to}.`);
    }
    throw new Error("The rate service is temporarily unavailable. Please try again.");
  }

  const data = await response.json();
  if (!Number.isFinite(data.rate) || data.rate <= 0) {
    throw new Error("The rate service returned an invalid exchange rate.");
  }
  const rate = { rate: data.rate, date: data.date };
  rateCache.set(cacheKey, { data: rate, fetchedAt: Date.now() });
  return rate;
}

async function convertCurrency(event) {
  event.preventDefault();
  errorMessage.textContent = "";
  rateDetails.textContent = "";
  resultOutput.textContent = "—";

  const amount = Number(amountInput.value);
  const from = fromSelect.value;
  const to = toSelect.value;

  if (amountInput.value.trim() === "" || !Number.isFinite(amount) || amount < 0) {
    errorMessage.textContent = "Enter a valid amount of zero or more.";
    amountInput.focus();
    return;
  }

  convertButton.disabled = true;
  convertButtonText.textContent = "Getting latest rate…";
  setServiceStatus("Fetching reference rate…");

  try {
    const { rate, date } = await getRate(from, to);
    resultOutput.textContent = formatAmount(amount * rate, to);
    resultPair.textContent = `1 ${from} = ${new Intl.NumberFormat("en-UG", { maximumSignificantDigits: 8 }).format(rate)} ${to}`;
    rateDetails.replaceChildren();
    if (date === "Same currency") {
      rateDetails.textContent = "No conversion needed · Both selections use the same currency.";
    } else {
      rateDetails.append("Reference rate date: ");
      const dateLabel = document.createElement("strong");
      dateLabel.textContent = date;
      rateDetails.append(dateLabel);
    }
    setServiceStatus("Reference rate ready", "ready");
  } catch (error) {
    errorMessage.textContent = error.message || "Unable to get a rate right now. Please try again.";
    setServiceStatus("Could not fetch rate", "error");
  } finally {
    convertButton.disabled = false;
    convertButtonText.textContent = "Convert currency";
  }
}

function clearConverter() {
  amountInput.value = "";
  errorMessage.textContent = "";
  rateDetails.textContent = "";
  resultOutput.textContent = "—";
  setPairCaption();
  amountInput.focus();
}

function swapCurrencies() {
  const oldFrom = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = oldFrom;
  errorMessage.textContent = "";
  rateDetails.textContent = "";
  resultOutput.textContent = "—";
  setPairCaption();
  if (amountInput.value.trim() !== "") form.requestSubmit();
}

form.addEventListener("submit", convertCurrency);
clearButton.addEventListener("click", clearConverter);
swapButton.addEventListener("click", swapCurrencies);
[fromSelect, toSelect].forEach((select) => {
  select.addEventListener("change", () => {
    errorMessage.textContent = "";
    rateDetails.textContent = "";
    resultOutput.textContent = "—";
    setPairCaption();
  });
});
amountInput.addEventListener("input", () => {
  errorMessage.textContent = "";
  resultOutput.textContent = "—";
});

loadCurrencies();