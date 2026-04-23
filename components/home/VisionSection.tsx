import Image from "next/image";
import { visionGallery } from "@/lib/constants/home";

export function VisionSection() {
  return (
    <section className="border-t border-[var(--line)] bg-[var(--surface-soft)] py-16">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
        <h2 className="text-center text-4xl font-bold reveal-up">Support our vision for what future can be</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-[var(--muted)] reveal-up delay-100">
          Join communities around the world funding social good with speed,
          trust, and blockchain transparency.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {visionGallery.map((item, index) => (
            <article
              key={`${item.imageAlt}-${index}`}
              className="overflow-hidden rounded-xl border border-[var(--line)] reveal-zoom lift-hover"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <Image
                src={item.imageUrl}
                alt={item.imageAlt}
                width={600}
                height={600}
                className="h-44 w-full object-cover"
              />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
