type Community = {
  id: number
  title: string
  genre: string
  members: string
  online: string
  poster: string
  accent: string
}

const communities: Community[] = [
  {
    id: 1,
    title: 'Stranger Things',
    genre: 'Sci-Fi · Mystery',
    members: '45.2k',
    online: '12.4k',
    poster:
      'https://image.tmdb.org/t/p/w500/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg',
    accent: '#8f2029',
  },
  {
    id: 2,
    title: 'Wednesday',
    genre: 'Mystery · Fantasy',
    members: '32.8k',
    online: '4.2k',
    poster:
      'https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg',
    accent: '#49365f',
  },
  {
    id: 3,
    title: 'Breaking Bad',
    genre: 'Crime · Drama',
    members: '28.1k',
    online: '3.8k',
    poster:
      'https://image.tmdb.org/t/p/w500/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg',
    accent: '#716b31',
  },
  {
    id: 4,
    title: 'The Last of Us',
    genre: 'Drama · Survival',
    members: '24.6k',
    online: '2.9k',
    poster:
      'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
    accent: '#496344',
  },
]

function TrendingCommunities() {
  return (
    <section className="trending-section" id="trending">
      <div className="trending-section__heading">
        <div>
          <p className="trending-section__eyebrow">
            THE INTERNET IS TALKING
          </p>
          <h2>Trending Communities</h2>
          <p className="trending-section__description">
            Find your people. Join the conversation.
          </p>
        </div>

        <a className="trending-section__view-all" href="#explore">
          View all <span aria-hidden="true">→</span>
        </a>
      </div>

      <div className="community-grid">
        {communities.map((community) => (
          <article
            className="trending-card"
            key={community.id}
            style={{ '--card-accent': community.accent } as React.CSSProperties}
          >
            <div className="trending-card__poster">
              <img
                src={community.poster}
                alt={`${community.title} poster`}
                loading="lazy"
              />

              <div className="trending-card__poster-overlay" />

              <span className="trending-card__genre">
                {community.genre}
              </span>
            </div>

            <div className="trending-card__content">
              <h3>{community.title}</h3>

              <div className="trending-card__stats">
                <span>{community.members} fans</span>
                <span className="trending-card__online">
                  <span className="trending-card__online-dot" />
                  {community.online} online
                </span>
              </div>

              <button
                className="trending-card__button"
                type="button"
                onClick={() =>
                  alert(`Community pages for ${community.title} are coming soon.`)
                }
              >
                Explore community <span aria-hidden="true">↗</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default TrendingCommunities