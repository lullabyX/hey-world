export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center gap-16 p-8 pb-20 font-[family-name:var(--font-geist-sans)]">
      <main className="row-start-2 flex flex-col items-center gap-8 sm:items-start">
        <div className="max-w-2xl rounded-lg bg-card p-6 text-center shadow-md sm:text-left">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Welcome to Minecraft World! ⛏️
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Dive into the blocky universe of creativity and adventure! Build
            magnificent structures, explore vast landscapes, and survive the
            night. Whether you&apos;re a seasoned crafter or just starting your
            journey, there&apos;s always something new to discover.
          </p>
          <p className="mt-4 text-lg text-muted-foreground">
            From redstone contraptions to pixel art masterpieces, from peaceful
            farming to thrilling adventures in the Nether - your imagination is
            the only limit in this sandbox world.
          </p>
        </div>
      </main>
      <footer className="row-start-3 flex flex-wrap items-center justify-center gap-6"></footer>
    </div>
  );
}
