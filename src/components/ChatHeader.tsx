export default function ChatHeader() {
  return (
    <section className="flex w-full items-center justify-between gap-3">
      <div className="flex flex-col items-start">
        <p className="text-xs">Chat with</p>
        <div className="flex items-center gap-2">
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
          <p className="text-sm font-medium">Vansh Support</p>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground">Powered by gpt-5-nano</span>
    </section>
  );
}
