export default function ConfidenceBadge({ score }: { score: number }) {
  const tone =
    score >= 75
      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
      : score >= 50
        ? "bg-amber-100 text-amber-800 border-amber-300"
        : score >= 25
          ? "bg-orange-100 text-orange-800 border-orange-300"
          : "bg-red-100 text-red-800 border-red-300";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${tone}`}
      title="Confidence score (0–100)"
    >
      {score}
    </span>
  );
}
