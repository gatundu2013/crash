export function toFixedDecimals(num: number, decimal = 2): string {
  if (num === undefined || num === null) {
    throw new Error("Empty input was passed in. Expected a number");
  }

  if (typeof num !== "number" || isNaN(num)) {
    throw new Error("Invalid input. Expected a valid number");
  }

  return num.toFixed(decimal);
}
