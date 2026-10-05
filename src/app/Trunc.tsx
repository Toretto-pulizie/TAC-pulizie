// Nomi e denominazioni nelle tabelle: si mostrano al massimo NAME_MAX
// caratteri (poi "…") e il testo completo resta leggibile passando il mouse.
// Taglia per numero di caratteri, non per larghezza: la colonna ha sempre la
// stessa misura, qualunque sia il nome.
export const NAME_MAX = 25;

export function truncateText(text: string, max = NAME_MAX): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

export function Trunc({
  text,
  max = NAME_MAX,
  className,
}: {
  text: string;
  max?: number;
  className?: string;
}) {
  const short = truncateText(text, max);
  return (
    <span title={short !== text ? text : undefined} className={className}>
      {short}
    </span>
  );
}
