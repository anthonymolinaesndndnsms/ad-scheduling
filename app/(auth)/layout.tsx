export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background p-4">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_-10%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(50%_100%_at_50%_100%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent)]"
      />
      <div className="relative w-full max-w-md">{children}</div>
      <p className="relative mt-6 text-center text-xs text-muted-foreground">
        Kids Next Door · Neighborhood service team management
      </p>
    </div>
  )
}
