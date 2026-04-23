const footerLinks = [
  {
    title: "Fundraise",
    links: ["How it works", "Legacy & Memorial", "Emergency", "Resources"],
  },
  {
    title: "Ways to Give",
    links: ["Discover", "Emergency Relief", "Zakat", "Friday Giving"],
  },
  {
    title: "About Fundr",
    links: ["About us", "Careers", "Contact", "Safety & Compliance"],
  },
  {
    title: "Campaigns",
    links: ["Browse campaigns", "FAQ", "Support"],
  },
];

export function Footer() {
  return (
    <footer className="bg-[var(--brand-strong)] text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 md:grid-cols-[2fr_1fr] md:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerLinks.map((column) => (
            <div key={column.title}>
              <h4 className="mb-3 text-sm font-semibold text-white/90">
                {column.title}
              </h4>
              <ul className="space-y-2 text-sm text-white/75">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#" className="transition hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-white/25 bg-white/10 p-5">
          <h4 className="text-lg font-semibold">Stay connected</h4>
          <p className="mt-2 text-sm text-white/80">
            Receive campaign updates and platform news in your inbox.
          </p>
          <form className="mt-4 flex gap-2">
            <input
              type="email"
              placeholder="Email address"
              className="w-full rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm text-white placeholder:text-white/70 outline-none"
            />
            <button
              type="submit"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--brand-strong)] transition hover:bg-white/90"
            >
              Join
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-white/20 px-4 py-5 text-sm text-white/80 md:px-8">
        <p className="text-lg font-bold">Fundr</p>
        <p>Copyright 2026 Fundr. All rights reserved.</p>
      </div>
    </footer>
  );
}