export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5 animate-pulse">
        <div className="md:col-span-3">
          <div className="h-80 w-full rounded-lg bg-gray-200" />
        </div>
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="h-7 w-3/4 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
          <div className="flex gap-3">
            <div className="h-6 w-20 rounded-full bg-gray-200" />
            <div className="h-6 w-20 rounded-full bg-gray-200" />
            <div className="h-6 w-24 rounded-full bg-gray-200" />
          </div>
          <div className="h-9 w-36 rounded-md bg-gray-200" />
        </div>
      </div>
    </main>
  );
}
