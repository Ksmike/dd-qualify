export function Footer() {
  return (
    <footer className="border-t border-white/8 bg-[#0f0e0d] px-6 py-6 text-sm text-white/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} DD Qualify, Inc.</p>
        <p>Source-of-truth intelligence for private-market deal teams.</p>
      </div>
    </footer>
  );
}
