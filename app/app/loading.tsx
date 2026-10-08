export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl safe-x sm:px-8" aria-busy="true">
      <div className="clear-tabbar py-6 sm:py-10">
        <div className="animate-pulse">
          <div className="border-b border-ink pb-3">
            <div className="h-8 w-2/5 rounded-[2px] bg-card-2" />
            <div className="mt-2 h-4 w-3/5 rounded-[2px] bg-card-2" />
          </div>
          <div className="mt-6 space-y-4">
            <div className="h-28 rounded-base bg-card-2" />
            <div className="h-28 rounded-base bg-card-2" />
          </div>
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    </main>
  );
}
