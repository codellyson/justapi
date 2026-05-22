"use client";

export const SkeletonBody = () => {
  return (
    <div className="px-4 py-3 space-y-2" aria-label="loading response">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-3 rounded bg-border/40 animate-pulse"
          style={{
            width: `${[85, 70, 92, 60][i]}%`,
            animationDelay: `${i * 80}ms`,
          }}
        />
      ))}
    </div>
  );
};
