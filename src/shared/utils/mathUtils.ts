export const roundTo = (num: number, decimals: number = 2) => Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
export const safeDivide = (a: number, b: number) => b === 0 ? 0 : a / b;
