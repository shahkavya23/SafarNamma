const EASE = [0.22, 1, 0.36, 1] as const;

/** Motion props for a question that rises into view once the previous one is answered. */
export const revealProps = (reduced: boolean | null) =>
  ({
    initial: reduced ? false : { opacity: 0, y: 16, height: 0 },
    animate: { opacity: 1, y: 0, height: 'auto' },
    exit: { opacity: 0, height: 0 },
    transition: { duration: 0.6, ease: EASE },
  }) as const;
