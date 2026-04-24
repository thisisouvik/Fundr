import Image from "next/image";

const feedbacks = [
  {
    name: "Sarah Jenkins",
    role: "Community Organizer",
    quote: "Fundr made it incredibly simple to raise the XLM we needed for our local library repair. The transparency of the smart contracts gave our donors total peace of mind.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    name: "David Chen",
    role: "Open Source Contributor",
    quote: "I love the option for anonymous donations. I've funded three privacy tech projects already, and the platform experience is seamlessly beautiful.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150",
  },
  {
    name: "Elena Rodriguez",
    role: "Non-Profit Director",
    quote: "Managing payouts used to be a nightmare of fees and delays. With Fundr, the funds are released instantly once our milestones are verified on-chain.",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150&h=150",
  },
];

export function FeedbacksSection() {
  return (
    <section className="border-t border-[var(--line)] bg-[var(--surface-soft)] py-16 md:py-24">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl reveal-up">
            What our community says
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[var(--muted)] reveal-up delay-100">
            Hear from the campaigners and funders who are using Fundr to build a more transparent world.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {feedbacks.map((feedback, index) => (
            <div
              key={index}
              className="relative flex flex-col rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm transition hover:shadow-md reveal-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Quote marks */}
              <div className="mb-4 text-4xl text-[var(--brand-soft)] font-serif leading-none">
                &ldquo;
              </div>
              
              <p className="mb-6 flex-1 text-sm leading-relaxed text-[var(--foreground)]">
                {feedback.quote}
              </p>

              <div className="flex items-center gap-3">
                <Image
                  src={feedback.avatar}
                  alt={feedback.name}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
                <div>
                  <p className="text-sm font-semibold">{feedback.name}</p>
                  <p className="text-xs text-[var(--muted)]">{feedback.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
