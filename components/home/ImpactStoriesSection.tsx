import Image from "next/image";
import { impactStories } from "@/lib/constants/home";

export function ImpactStoriesSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-bold reveal-up">Real Impact Stories</h2>
        <p className="mx-auto mt-4 max-w-2xl text-[var(--muted)] reveal-up delay-100">
          Every successful campaign represents people coming together to make
          real change possible.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {impactStories.map((story, index) => (
          <article
            key={story.title}
            className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] reveal-zoom lift-hover"
            style={{ animationDelay: `${index * 110}ms` }}
          >
            <Image
              src={story.imageUrl}
              alt={story.imageAlt}
              width={1200}
              height={800}
              className="h-48 w-full object-cover"
            />
            <div className="space-y-2 p-5">
              <h3 className="text-xl font-semibold">{story.title}</h3>
              <p className="text-sm text-[var(--muted)]">{story.excerpt}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
