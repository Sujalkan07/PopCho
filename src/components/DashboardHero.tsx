type DashboardHeroProps = {
  title?: string
  category?: string
  onlineCount?: string
  rating?: string
  reviewCount?: string
  description?: string
  backgroundImage?: string
}

function DashboardHero({
  title = 'STRANGER THINGS',
  category = 'Season 5 Anticipation Hub',
  onlineCount = '12.4k',
  rating = '4.9',
  reviewCount = '18.4k',
  description = 'Hawkins is fractured, and fans around the globe are dissecting every clue, hidden detail, and theory. Join the conversation and discover what other fans think.',
  backgroundImage = 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=2000&q=85',
}: DashboardHeroProps) {
  return (
    <section
      className="dashboard-hero"
      style={{ backgroundImage: `url("${backgroundImage}")` }}
    >
      <div className="dashboard-hero__overlay" />

      <div className="dashboard-hero__content">
        <div className="dashboard-hero__badges">
          <span className="hero-badge hero-badge--online">
            <span className="hero-badge__dot" />
            {onlineCount} ONLINE IN HUB
          </span>

          <span className="hero-badge hero-badge--featured">
            {category}
          </span>

          <span className="hero-badge hero-badge--rating">
            <span aria-hidden="true">★</span>
            {rating} ({reviewCount} reviews)
          </span>
        </div>

        <p className="dashboard-hero__eyebrow">
          THE COMMUNITY EVERYONE IS TALKING ABOUT
        </p>

        <h1 className="dashboard-hero__title">{title}</h1>

        <div className="dashboard-hero__metadata">
          <span>1983 Hawkins, Indiana</span>
          <span className="metadata-dot" />
          <span>Sci-Fi, Mystery &amp; Horror</span>
          <span className="metadata-dot" />
          <span className="metadata-highlight">45.2k Active Theorists</span>
        </div>

        <p className="dashboard-hero__description">
          {description}
        </p>

        <div className="dashboard-hero__actions">
          <button className="hero-action hero-action--primary" type="button">
            Join Community <span aria-hidden="true">→</span>
          </button>

          <button className="hero-action hero-action--secondary" type="button">
            Explore Discussions
          </button>
        </div>

        <p className="dashboard-hero__footer">
          YOUR FANDOM. YOUR THEORIES. YOUR PEOPLE.
        </p>
      </div>
    </section>
  )
}

export default DashboardHero