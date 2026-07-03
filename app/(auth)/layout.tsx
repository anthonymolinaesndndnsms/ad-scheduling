export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-background p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_40%_at_50%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent)]"
      />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  )
}
