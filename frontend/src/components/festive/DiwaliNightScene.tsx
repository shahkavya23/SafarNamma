/* A drawn Diwali night (stars, a hill and a row of lit diyas) that fills its frame.
   Stands in for a festive photo inside a hero tile. */
export const DiwaliNightScene = () => (
  <span aria-hidden className="diwali-night absolute inset-0 block">
    <span className="diwali-night-stars" />
    <span className="diwali-night-hill" />
    <span className="absolute inset-x-0 bottom-[16%] flex justify-center gap-4 sm:gap-6">
      {[0, 0.5, 0.2, 0.8, 0.35].map((delay, i) => (
        <span key={i} className="diya" style={{ ['--flicker-delay' as string]: `${delay}s` }} />
      ))}
    </span>
  </span>
);
