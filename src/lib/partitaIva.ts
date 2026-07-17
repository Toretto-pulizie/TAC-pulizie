export function isValidPartitaIva(piva: string): boolean {
  const p = piva.trim();
  if (!/^\d{11}$/.test(p)) return false;

  let x = 0;
  let y = 0;
  for (let i = 0; i < 10; i++) {
    const digit = p.charCodeAt(i) - 48;
    if (i % 2 === 0) {
      x += digit;
    } else {
      const doubled = digit * 2;
      y += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  const check = (10 - ((x + y) % 10)) % 10;
  return check === p.charCodeAt(10) - 48;
}
