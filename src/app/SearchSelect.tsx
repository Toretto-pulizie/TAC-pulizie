"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

// `short`: versione breve (es. un codice) mostrata nel campo quando è chiuso;
// l'elenco aperto mostra codice e testo completo, e la ricerca vale per entrambi.
export type SearchOption = { value: string; label: string; short?: string };

// Sostituisce una <select> con tante voci: si scrive per cercare invece di
// scorrere la tendina. Si comporta come un campo di form normale (invia
// `name` con il valore scelto, rispetta `required`), ma il valore vuoto è una
// scelta valida solo se non è richiesto.
function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function SearchSelect({
  options,
  name,
  value,
  defaultValue = "",
  onChange,
  required,
  disabled,
  placeholder = "Scrivi per cercare...",
  className = "rounded-lg border border-zinc-300 px-3 py-2",
  emptyLabel,
  autoFocus,
  onClose,
  wrapperClassName = "min-w-[14rem]",
}: {
  options: SearchOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  // Voce per "nessuna scelta" (es. "Tutti"): se assente il valore vuoto non
  // compare nell'elenco.
  emptyLabel?: string;
  // Per l'uso "in cella": si apre subito e avvisa quando si esce senza
  // scegliere (focus perso o Esc).
  autoFocus?: boolean;
  onClose?: () => void;
  wrapperClassName?: string;
}) {
  const listId = useId();
  const [internal, setInternal] = useState(defaultValue);
  const current = value !== undefined ? value : internal;
  const closedLabelOf = (v: string) => {
    const o = options.find((x) => x.value === v);
    return o ? (o.short ?? o.label) : "";
  };

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo(
    () => (emptyLabel ? [{ value: "", label: emptyLabel }, ...options] : options),
    [options, emptyLabel]
  );
  const filtered = useMemo(() => {
    if (query == null || query.trim() === "") return all;
    const q = normalize(query.trim());
    return all.filter((o) => normalize(`${o.short ?? ""} ${o.label}`).includes(q));
  }, [all, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Con autoFocus il focus arriva prima che il gestore onFocus sia attivo:
  // l'elenco va aperto esplicitamente.
  useEffect(() => {
    if (autoFocus) setOpen(true);
  }, [autoFocus]);

  function choose(v: string) {
    if (value === undefined) setInternal(v);
    onChange?.(v);
    setQuery(null);
    setOpen(false);
  }

  const shown = query ?? (current ? closedLabelOf(current) : emptyLabel && !current ? emptyLabel : "");

  return (
    <div className={`relative ${wrapperClassName}`}>
      {name && <input type="hidden" name={name} value={current} />}
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={shown}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoFocus={autoFocus}
        onFocus={(e) => {
          setOpen(true);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          // Testo scritto ma nessuna voce scelta: si torna alla scelta
          // attuale; se il campo è stato svuotato del tutto, si azzera.
          if (query != null && query.trim() === "" && !required && current) {
            if (value === undefined) setInternal("");
            onChange?.("");
          }
          setQuery(null);
          setOpen(false);
          onClose?.();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            if (open && filtered[highlight]) {
              e.preventDefault();
              choose(filtered[highlight].value);
            }
          } else if (e.key === "Escape") {
            setQuery(null);
            setOpen(false);
            onClose?.();
          }
        }}
        className={`w-full ${className} disabled:bg-zinc-100`}
      />
      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          // Dentro un <label> un clic sulla lista verrebbe inoltrato al campo
          // di testo e riaprirebbe subito l'elenco appena chiuso.
          onClick={(e) => e.preventDefault()}
          className="absolute left-0 z-30 mt-1 max-h-64 w-full min-w-[12rem] overflow-y-auto rounded-lg border border-zinc-300 bg-white py-1 text-sm shadow-lg"
        >
          {filtered.length === 0 && <li className="px-3 py-2 text-zinc-400">Nessun risultato</li>}
          {filtered.map((o, i) => (
            <li
              key={o.value || "__empty__"}
              role="option"
              aria-selected={o.value === current}
              // onMouseDown (non onClick): scatta prima del blur del campo,
              // che altrimenti chiuderebbe la lista prima della scelta.
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o.value);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={`cursor-pointer px-3 py-2 ${
                i === highlight ? "bg-zinc-100" : ""
              } ${o.value === current ? "font-semibold text-zinc-900" : "text-zinc-700"}`}
            >
              {o.short ? (
                <>
                  <span className="font-semibold text-zinc-900">{o.short}</span>
                  {o.short !== o.label && <span className="text-zinc-500"> — {o.label}</span>}
                </>
              ) : (
                o.label
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
