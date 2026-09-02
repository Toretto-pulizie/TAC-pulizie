export function Tooltip({
  text,
  children,
}: {
  text: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative inline-block w-fit cursor-help underline decoration-dotted">
      {children}
      <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 hidden w-max max-w-64 rounded-md bg-zinc-900 px-2 py-1 text-xs font-normal normal-case text-white group-hover:block">
        {text}
      </span>
    </span>
  );
}
