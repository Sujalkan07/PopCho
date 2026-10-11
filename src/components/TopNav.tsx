type TopNavProps = {
  activePage?: 'home' | 'explore' | 'communities' | 'reviews'
}

function TopNav({ activePage = 'home' }: TopNavProps) {
  const links = [
    { label: 'Home', id: 'home', href: '#home' },
    { label: 'Explore', id: 'explore', href: '#explore' },
    { label: 'Communities', id: 'communities', href: '#communities' },
    { label: 'Reviews', id: 'reviews', href: '#reviews' },
  ] as const

  return (
    <header className="top-nav">
      <a className="top-nav__brand" href="#home" aria-label="PopCho home">
        Pop<span>Cho</span>
      </a>

      <nav className="top-nav__links" aria-label="Main navigation">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            className={
              activePage === link.id
                ? 'top-nav__link top-nav__link--active'
                : 'top-nav__link'
            }
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="top-nav__actions">
        <button className="top-nav__login" type="button">
          Log in
        </button>

        <button className="top-nav__signup" type="button">
          Join PopCho
        </button>
      </div>
    </header>
  )
}

export default TopNav