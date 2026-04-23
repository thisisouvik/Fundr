export function BalanceDisplay() {
  return (
    <div className="hidden rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 text-sm font-medium text-[var(--muted)] md:block">
      <span className="mr-1 text-[var(--brand)]">⬡</span>
      0.00 XLM
    </div>
  );
}