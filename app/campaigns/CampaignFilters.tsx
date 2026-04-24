"use client";

interface Props {
  search: string;
  category: string;
  sort: string;
  categories: string[];
}

export default function CampaignFilters({ search, category, sort, categories }: Props) {
  function submitForm(e: React.ChangeEvent<HTMLSelectElement>) {
    e.currentTarget.form?.submit();
  }

  return (
    <section className="mb-8 space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
      <div className="grid gap-4 md:grid-cols-3">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium mb-2">Search campaigns</label>
          <form method="get" className="flex gap-2">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search by title..."
              className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              className="rounded-xl bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-strong)]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <form method="get">
            <select
              name="category"
              defaultValue={category}
              onChange={submitForm}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </form>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-sm font-medium mb-2">Sort by</label>
          <form method="get">
            <select
              name="sort"
              defaultValue={sort}
              onChange={submitForm}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="ending-soon">Ending soon</option>
              <option value="most-funded">Most funded</option>
            </select>
          </form>
        </div>
      </div>
    </section>
  );
}
