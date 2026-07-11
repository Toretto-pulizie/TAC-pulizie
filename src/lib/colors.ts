const PALETTE = [
  { bg: "bg-blue-100", border: "border-blue-300", text: "text-blue-900" },
  { bg: "bg-green-100", border: "border-green-300", text: "text-green-900" },
  { bg: "bg-amber-100", border: "border-amber-300", text: "text-amber-900" },
  { bg: "bg-purple-100", border: "border-purple-300", text: "text-purple-900" },
  { bg: "bg-pink-100", border: "border-pink-300", text: "text-pink-900" },
  { bg: "bg-cyan-100", border: "border-cyan-300", text: "text-cyan-900" },
  { bg: "bg-orange-100", border: "border-orange-300", text: "text-orange-900" },
  { bg: "bg-teal-100", border: "border-teal-300", text: "text-teal-900" },
];

export function colorForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}
