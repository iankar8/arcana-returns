import Link from 'next/link';

const navigation = [
  {
    title: 'Get Started',
    links: [
      { title: 'Introduction', href: '/docs' },
      { title: 'Quickstart', href: '/docs/quickstart' },
      { title: 'Authentication', href: '/docs/authentication' },
    ],
  },
  {
    title: 'Guides',
    links: [
      { title: 'Idempotency', href: '/docs/guides/idempotency' },
      { title: 'Rate Limiting', href: '/docs/guides/rate-limiting' },
      { title: 'Monitoring', href: '/docs/guides/monitoring' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { title: 'Error Codes', href: '/docs/reference/error-codes' },
      { title: 'API Reference', href: '/docs/api-reference' },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-black/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white hover:text-blue-400 transition">
            Arcana Labs
          </Link>
          <nav className="flex items-center space-x-6 text-sm">
            <Link href="/docs" className="text-gray-400 hover:text-white transition">
              Docs
            </Link>
            <a 
              href="https://github.com/iankar8/arcana-returns" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex gap-12">
          {/* Sidebar Navigation */}
          <aside className="w-64 flex-shrink-0">
            <nav className="sticky top-24 space-y-8">
              {navigation.map((section) => (
                <div key={section.title}>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {section.title}
                  </h3>
                  <ul className="space-y-2">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="block text-gray-300 hover:text-white transition text-sm py-1"
                        >
                          {link.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 max-w-3xl">
            <div className="prose prose-invert prose-blue max-w-none">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
