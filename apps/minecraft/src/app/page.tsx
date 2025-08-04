export default function Home() {
  return (
    <div className="flex min-h-screen flex-col font-[family-name:var(--font-geist-sans)]">
      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center bg-gradient-to-b from-background to-muted/20 px-8 py-16">
        <div className="max-w-4xl text-center">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
            Welcome to Minecraft World! ⛏️
          </h1>
          <p className="mt-8 text-xl text-muted-foreground sm:text-2xl">
            Dive into the blocky universe of creativity and adventure!
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <button className="rounded-lg bg-primary px-8 py-3 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Start Building
            </button>
            <button className="rounded-lg border border-border px-8 py-3 text-lg font-semibold transition-colors hover:bg-accent">
              View Gallery
            </button>
          </div>
        </div>
      </section>

      {/* Minecraft Game Section */}
      <section className="flex-1 bg-card px-8 py-16">
        
      </section>

      {/* Footer */}
      <footer className="bg-muted px-8 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h4 className="text-lg font-semibold text-foreground">
                Minecraft World
              </h4>
              <p className="mt-2 text-sm text-muted-foreground">
                Your gateway to endless creativity and adventure in the world of
                Minecraft.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-foreground">
                Quick Links
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>
                  <a href="/builds" className="hover:text-foreground">
                    Builds
                  </a>
                </li>
                <li>
                  <a href="/servers" className="hover:text-foreground">
                    Servers
                  </a>
                </li>
                <li>
                  <a href="/guides" className="hover:text-foreground">
                    Guides
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-foreground">
                Community
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Discord
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Reddit
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    YouTube
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 Minecraft World. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
