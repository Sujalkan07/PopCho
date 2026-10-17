export interface AvatarItem {
  id: string;
  name: string;
  title: string;
  origin: string;
  category: 'tv' | 'movies' | 'anime';
  archetype: 'protagonist' | 'anti-hero' | 'legend';
  badge: string;
  tag: string;
  quote: string;
  role: string;
  imageUrl: string;
}

export const CANON_AVATAR_CATALOG: AvatarItem[] = [
  {
    id: 'eleven',
    name: 'Eleven / Jane Hopper',
    title: 'Stranger Things',
    origin: 'Stranger Things (TV)',
    category: 'tv',
    archetype: 'protagonist',
    badge: 'Hawkins AV Club',
    tag: 'Psychokinetic • Hawkins AV Club',
    quote: "Friends don't lie. Ready for the Upside Down.",
    role: 'Theorist Lvl 1',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDI5Y9KBDRpBfb3bntHW3DqoJxdQ8AI1jU2-yqvsP3IijucO3LsK5_6nrEMwjm_sAKVrZ8YZeyF_fe4xgazDWNO42mGjbTOCN5vogokDSVl5tilLHEpYAGQPBr_gjaHS2hXJp1GlqbeyD3Iu1WlfNeQi5HFoGU2Ty-v57mU97UfkM99iaI-zgxbmjffu5dmZH9P0JwV6_nrqgpI88ivkrJ8vfBEavGN0zAaufnQiTrC3YYydXxujT4xoQ',
  },
  {
    id: 'walter-white',
    name: 'Walter White',
    title: 'Breaking Bad',
    origin: 'Breaking Bad (TV)',
    category: 'tv',
    archetype: 'anti-hero',
    badge: 'Los Pollos Mastermind',
    tag: 'Chemist • Albuquerque Empire',
    quote: 'I am the one who knocks.',
    role: 'Cinematic Critic',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAvSTdoSegqYcJE3wEOn-frTfV6qokMAqDgiXAI6dUM6lMoGt6E7PMpOm4zNtSyPFUB3BlUFZbYh0SkOnxw_5KGjPl5XMzRZDWS_TvPGux4cS7NDR3oU33Zh9-W8GlVqaVu24FGXTXfwIRe2YlSfbLYsunc7-ZnDXKtHrCV65NmQqi2L6eUYFQ1CtQ-AVpHO09WFMZOr7hvfjh9Z5TGhm3oxZESXag5_11q2WlRflLA_ECRW-jrgpeEFg',
  },
  {
    id: 'geralt',
    name: 'Geralt of Rivia',
    title: 'The Witcher',
    origin: 'The Witcher (TV)',
    category: 'tv',
    archetype: 'legend',
    badge: 'Kaer Morhen Veteran',
    tag: 'White Wolf • School of the Wolf',
    quote: "Evil is evil. Lesser, greater, middling, it's all the same.",
    role: 'Guild Archivist',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDSiBcpdoWKhRpH7hVR_Tg4Vot6mR24HAcmtMu_3Y7Y8KhpP_hpwGw69B1SryQXIgAS75R9rw0dsfftrKy6Ccd5mCeZmI6oZjEd6D91eoe1o31rBfMOttqzhw1k2j1LZLFgJZpI9RnFWuw8gn1CKO00dCkvEcx5gD3Pwr371h4ytDzrq7IjsIkVrDCwYCz8X5BsX1W8_yjvTzapYsg2Q0xT6bqmCaGtzqkDr05tOwvBCZE6utRzAXc8aA',
  },
  {
    id: 'wednesday',
    name: 'Wednesday Addams',
    title: 'Wednesday',
    origin: 'Wednesday (TV)',
    category: 'tv',
    archetype: 'anti-hero',
    badge: 'Nevermore Raven',
    tag: 'Outcast • Nevermore Academy',
    quote: "I act as if I don't care, but deep down, I secretly enjoy disaster.",
    role: 'Occult Detective',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDFPrqIBQmOzx8XAoXSP-I-8nrg2PI3YX71wBZpYVwsp20oWoBHy5SZyz4YU4YYljrEe5v2hWev_3vONzgYCHiW97V436_zKAYNLbsZtUqhkoZRDCRAXvztRAyOhdbEoHNULHDdMTgvBbSj6vCaPL4mR7TrvFBQh_ERPxKsXk-UK_NH6tkgVmH7LjFgxEqloyEf8h48tk43CCbRg83M-QnGSu0p0D0_AnbIc_R05fEXu3BY61KlBfG35A',
  },
  {
    id: 'thomas-shelby',
    name: 'Thomas Shelby',
    title: 'Peaky Blinders',
    origin: 'Peaky Blinders (TV)',
    category: 'tv',
    archetype: 'anti-hero',
    badge: 'Garrison Syndicate',
    tag: 'Leader • Peaky Blinders',
    quote: "Already broken. Can't be broken twice.",
    role: 'Strategy Lead',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA4Zi5bp-Crz2IvevRLxPlPw3AZY8xqsRfmN-Scq3nfeEtGvC4AMY_atMgnSFD0zFgX0Y-rsjrS3-JRUc7nTzMajUkEwSQ9PxsKsm4Yt9YJzSDoK5LgnMZpLu0uWoONKXE_bLYH9Qu09xCQv_hZWhUpwgZAm2wth9EmL_cxSamljY1xVIA8vIJq5699m-gTlGCh3TOgG4Zm9Ag5uZIommDKzMZfeq9Xn-FCpOMuSLT0XueBLIEGdvSs0g',
  },
  {
    id: 'jinx',
    name: 'Jinx / Powder',
    title: 'Arcane',
    origin: 'Arcane (TV / Animation)',
    category: 'anime',
    archetype: 'anti-hero',
    badge: 'Zaun Anarchist',
    tag: 'Loose Cannon • Zaun Undercity',
    quote: "I'm not crazy, I'm just ahead of the curve.",
    role: 'Chaotic Theorist',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAgU_Mft7SjAbJOG4W38wddERx3xmgACC-isugsGOxLFFPL6hUcVfaCGPxy49_siFEb0rlo44AxdVc76YU99oVB6AhuimMdD7YR8GNyxCQAAuXgCwgZVY4Rf-3kXB7JROGJkZF1MUsk3j5uvEm7JAV9zWVvb-Gv6JQ_V4rKgrWIT2fl1eY9iRJwu6CBBQWBCaCRmFQZ3CVDp6dpnghXwJ5VCk5bdWEbzG87_QJ9aiRb3I0wiEoi7-RiZQ',
  },
  {
    id: 'paul-atreides',
    name: "Paul Muad'Dib Atreides",
    title: 'Dune',
    origin: 'Dune (Movies)',
    category: 'movies',
    archetype: 'protagonist',
    badge: 'Fremen Sietch Leader',
    tag: 'Kwisatz Haderach • Arrakis',
    quote: 'Fear is the mind-killer. The sleeper has awakened.',
    role: 'Prophet of Cinema',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCXlGx1wM8WcUAhrGFS2GjubfMyo8qHLU_Uh_hPhL9orJikUmGJoWQvmIACK-yPR0qNeSERFRieiy8pTcW_HQq1NjRZnYjGRD5r7lcT3ZjFbwAuERS3UKYLpkBuPOMPQawZQwAcO3lEuVilZvzMRNmt5V01VDE-z8gkoFiCa9y4ULj6a3WNrmpZCoIVusclCvjqNLmZcKu9A7CZ6T8Ajo2JdIpCzAPWgDiGtHVTiZdUrGYQP3439a4xlw',
  },
  {
    id: 'batman',
    name: 'The Batman / Bruce Wayne',
    title: 'The Batman',
    origin: 'The Batman (Movies)',
    category: 'movies',
    archetype: 'legend',
    badge: 'Gotham Detective',
    tag: 'Vengeance • Gotham City',
    quote: "I'm vengeance. When that light hits the sky, it's a warning.",
    role: 'Midnight Watcher',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDshq4Hy_FSQjIklv9ebJA32uufSAraCD4O9nvXir273vSmsINN3GqGlbOX_v3c_UI-IC5wI6N8BusjsIQURddS-YRDO9Kg54BtNjOg8BlNTPG9bKsrURwgrdYJDlHBrj_0NNqs70ylYdaLLPphdfq3TdprcSNhK4gslbAOqMrWw8YFLOK5fHUvMFWc74tUoDBEKokur0gcmgZxUcwDVACsy6rl12aocsJPa1eiFIyQ8_jx6AsbJA0wJA',
  },
  {
    id: 'john-wick',
    name: 'John Wick',
    title: 'John Wick',
    origin: 'John Wick (Movies)',
    category: 'movies',
    archetype: 'anti-hero',
    badge: 'High Table Excommunicado',
    tag: 'Baba Yaga • Continental Hotel',
    quote: "Yeah, I'm thinking I'm back.",
    role: 'Action Curator',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCP_akqlASYwbbkHXKn06T8XPgdOB_AEkVWE9YHVahkBrCp33n3C0A6BsCYkR3jRkOZfuG4PHfu123bcGDAtAQGlhW7ItVc-BNnwM_cKQsX-UP3cr90dcik9gk3TvJ2OTWQtdID2qoRlwKZfZosOmuq8L2ohvybFrMO94l6nxdUN4bvZ2Hd9Gv__B-WJ3VzqNb6TXmP4JACKgYw6eVf1tzzC5xERk4IfJKLFgokL66l9GWa0lUF_UbcBA',
  },
  {
    id: 'furiosa',
    name: 'Imperator Furiosa',
    title: 'Mad Max',
    origin: 'Mad Max Saga (Movies)',
    category: 'movies',
    archetype: 'protagonist',
    badge: 'War Rig Commander',
    tag: 'Wasteland Warrior • The Citadel',
    quote: 'Remember me.',
    role: 'Fandom Survivor',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCR5fhq4l07VZ7pfru6VPE-GipkUcqCjgtUtoYGIZnfOLzv2LWYY-4_eXF4mdizOj5UyqlY3dTeyyGvYVIEj2WSo5-Z3eF1X5Vpc5o5Qih88bN1vVJ7fbOqdG5wUNtsr744ox3c3h0Aqe5xD8UGXFsctUUn3sJMsx4L5BEV0QBMJo1FInCg16dbwVlp9Y-tVo6tL1285ltekQXAGcJbA-E1k4SCkvdipMjYHi5TSqecno6vEeRaA67rnQ',
  },
  {
    id: 'neo',
    name: 'Neo / Thomas Anderson',
    title: 'The Matrix',
    origin: 'The Matrix (Movies)',
    category: 'movies',
    archetype: 'legend',
    badge: 'Red Pill Pioneer',
    tag: 'The One • Zion Resistance',
    quote: 'I know kung fu.',
    role: 'Sci-Fi Theorist',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBbezg6BXBVpF8cB7e-lEiY2z53OWCc1RXIisoaSF1YEQerfnVoZMEdioOXC30i8KhFgM7W5SE642cXSOf-eO_NNxkNojHEVioamXdjxTKoGly8roulkbXigXiod9GzTu6-XWTsdIotyXH4ClQBgA-mrEjMfOGM414gmerCeaFznJ2eA9MsIZgbvTG6pLKlmgV37Ms6IpPqRLU7eN8LeJE_QAkuvDPJ8b8C2WH2fb0ZnyvdZ5BhZR0Y9A',
  },
  {
    id: 'daemon',
    name: 'Daemon Targaryen',
    title: 'House of the Dragon',
    origin: 'House of the Dragon (TV)',
    category: 'tv',
    archetype: 'anti-hero',
    badge: 'Blood & Fire Lineage',
    tag: 'Rogue Prince • Dragonstone',
    quote: "Dreams didn't make us kings. Dragons did.",
    role: 'Westeros Chronicler',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDpNk8w2fTOAQWR0NqlWZPYj6VP_HjqFqAo-mJWaZ4Yzp8pSZoWNjfW441abpJXET5qb41QZfdIEHJjws4k70rI2wzP4e2r8ikw5o1gLvzmgfj5VlB7jPpgTl_A1z6Vjipl-0Eupx0QgwkwZUC4CsX6C7C9haxCQP8xOlpo5yj99KoChMuLuNL6PZ6RMMu-csTdWUd40gPJBOqGciT5nWHWH0U4j-sjoDl8BBrCOazEVBmYFWLhGcyAiw',
  },
  {
    id: 'eren-yeager',
    name: 'Eren Yeager',
    title: 'Attack on Titan',
    origin: 'Attack on Titan (Anime)',
    category: 'anime',
    archetype: 'anti-hero',
    badge: 'Paradis Vanguard',
    tag: 'Founding Titan • Survey Corps',
    quote: "If you don't fight, you can't win. Tatakae.",
    role: 'Lore Deconstructor',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDw6XPXlGQhXAg54ud22ZsOvyx-2zU5AaCHpwAC6KeGTo7yGPwgzgJK8dKcB53w9PL45J_n74pcgZx6I4JGA0X1cjBY86-o5jgal5uqqnUppYGYayUanexJ58g832tHhEiS1kika4uTCIMj5dqAS6CVk1Ps1UAIGj-pF24KfDLbJ7UogE1RBc9ogXHvTkwE9puQ47yxzJHrDMgCcnWGLZnpVdEiM4-h5Gf6ZYv3VAUb81d0ul2tCWvvcw',
  },
  {
    id: 'spike',
    name: 'Spike Spiegel',
    title: 'Cowboy Bebop',
    origin: 'Cowboy Bebop (Anime)',
    category: 'anime',
    archetype: 'legend',
    badge: 'Bebop Syndicate',
    tag: 'Space Bounty Hunter • Bebop',
    quote: 'Whatever happens, happens. See you space cowboy.',
    role: 'Retro Cult Host',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAdJLmJLWCTJZzz_qV9kLRx6xurFHENaZrG4Jz_CUEuWgsk4EhiWuevslzJILWZfaomMGJtlAo1-DP6GqLqCbgYsOsOr8ctD7L52tI54xcclPh_iqKJTRkWRJQTV9sBMOot26XSKPlCjTtOLvCb2HKJ4A0jy9psCIwuMb8YkTvNrSUHSQo9jv8hm-UF4NH-pd7nLapKgXyCV_HPmTeRYGwqvFrvyJXSUdQpUYRdHOFVY4ivX5Pl9Jo_3w',
  },
  {
    id: 'luffy',
    name: 'Monkey D. Luffy',
    title: 'One Piece',
    origin: 'One Piece (Anime)',
    category: 'anime',
    archetype: 'protagonist',
    badge: 'Grand Line Explorer',
    tag: 'Straw Hat Captain • Sun God Nika',
    quote: "I'm gonna be King of the Pirates!",
    role: 'Shonen Enthusiast',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAUfSiKG4sixkCXoK80UrDtUcX3KiijzEdUHLaQT0lvbhsPBhgIv5reieHYrIOVqIk5o8W9xRlRZtYLqMvaHe02SHyHo7pwdqOa0vHumJh01n5tin1kmZpgn7I2na04C8KjGpy6fLKpCO6gNZJ57cxjo4Yp1YXcMbMkProwF6sz9oeeasa97x9mCPV3hV4WF-gjH8TLu1m8acKmgd3yMrCrih7w2wcEVxXOvqF0wjrzjaj06sE-bfU2kw',
  },
  {
    id: 'tony-soprano',
    name: 'Tony Soprano',
    title: 'The Sopranos',
    origin: 'The Sopranos (TV)',
    category: 'tv',
    archetype: 'legend',
    badge: 'Bada Bing Regular',
    tag: 'Boss • DiMeo Crime Family',
    quote: 'Those who want respect, give respect.',
    role: 'Drama Specialist',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCOhIdCWAk0x-TFynBejdBYBxEZRhlWpfuEWN6rqDfjLHsN7_rfwigE3814b5K_QabDBvM-kdpM8L3b74ge-LUNaUMPGrK7ipSPDPW2gpILMsopdJeFjsW0gl0Ay5hwZPySor-THFEesm6ldTtcbXAJ0kasbQ_hgv4YyumnKdkKFU4WBXvGHwjjjYIoC9YoApka4yyf40u6K5mlz1iVE5eKHL6acQ3An5rV-loMICAMTL4a8p8rZOMWpw',
  },
  {
    id: 'levi',
    name: 'Levi Ackerman',
    title: 'Attack on Titan',
    origin: 'Attack on Titan (Anime)',
    category: 'anime',
    archetype: 'legend',
    badge: 'Survey Corps Captain',
    tag: 'Captain • Special Operations Squad',
    quote: "The only thing we're allowed to do is believe that we won't regret the choice.",
    role: 'Action Analyst',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBExjxZ9_6TptozE9GV8vluCsu7xo0WV7uBDZLOZynLf7BM8TzlVe46im1JfpThUN2JMrexxvUf5UxNdzGmgYLGHfXLMhG0NivYkAqqaGUifasKbJI85f9H3Sf0gty2SYj6cOdmn6vI3ARPbpquowa1pVFpVdLL489DkqERnE37UDeFbvkqMJcArsjq94x0t_sS33Yccr4MsS7f2R8-8oz8pg8LTO-uLXZssHUYzFOg3fGylkRqDZLnHg',
  },
  {
    id: 'deckard',
    name: 'Rick Deckard',
    title: 'Blade Runner',
    origin: 'Blade Runner 2049 (Movies)',
    category: 'movies',
    archetype: 'protagonist',
    badge: 'Tyrell Legacy',
    tag: 'Blade Runner • Los Angeles 2049',
    quote: 'I had your job once. I was good at it.',
    role: 'Cyberpunk Guild',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCUZtFtUmQ2f7jDsrH7pdyjEEhXDahx2dZc-AQ35eIjjBT8QAbxFyY-746rB9xjIFaHbzEcFyUP-GrqtQ7XsPyXFOB5jbFoLVUGyLqVdD9ge66R5NHplBE2CVekK6eUj8wB9dUrPiwVFEo7ydvzwybfPFzshG27RYWBb6uERWCtvYE1u6Od3EcNG3mpvm-ChN1vZslQpn5xVYNmdgU9YZt1Y_IAtvfE8nNw3YGphW0lTS54lIni0_Iofg',
  },
  {
    id: 'gojo',
    name: 'Satoru Gojo',
    title: 'Jujutsu Kaisen',
    origin: 'Jujutsu Kaisen (Anime)',
    category: 'anime',
    archetype: 'legend',
    badge: 'Limitless Sorcerer',
    tag: 'Special Grade • Tokyo Jujutsu High',
    quote: 'Throughout heaven and earth, I alone am the honored one.',
    role: 'Domain Theorist',
    imageUrl:
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'daenerys',
    name: 'Daenerys Targaryen',
    title: 'Game of Thrones',
    origin: 'Game of Thrones (TV)',
    category: 'tv',
    archetype: 'protagonist',
    badge: 'Mother of Dragons',
    tag: 'Breaker of Chains • House Targaryen',
    quote: 'I am not here to be queen of the ashes.',
    role: 'Lore Master',
    imageUrl:
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'aragorn',
    name: 'Aragorn / Elessar',
    title: 'Lord of the Rings',
    origin: 'Lord of the Rings (Movies)',
    category: 'movies',
    archetype: 'legend',
    badge: 'King of Gondor',
    tag: 'Dúnedain Chieftain • Fellowship',
    quote: 'There is always hope.',
    role: 'Epic Chronicler',
    imageUrl:
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'san',
    name: 'San / Princess Mononoke',
    title: 'Princess Mononoke',
    origin: 'Princess Mononoke (Anime)',
    category: 'anime',
    archetype: 'protagonist',
    badge: 'Wolf Clan Warrior',
    tag: 'Forest Spirit • Ghibli Canon',
    quote: "I'm not afraid to die. I'd do anything to get humans out of my forest!",
    role: 'Mythic Sentinel',
    imageUrl:
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'miles-morales',
    name: 'Miles Morales',
    title: 'Spider-Verse',
    origin: 'Spider-Verse (Movies)',
    category: 'movies',
    archetype: 'protagonist',
    badge: 'Multiverse Anomaly',
    tag: 'Spider-Man • Earth-1610',
    quote: "Everyone keeps telling me how my story is supposed to go. Nah, I'ma do my own thing.",
    role: 'Multiverse Pioneer',
    imageUrl:
      'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: 'rust-cohle',
    name: 'Rust Cohle',
    title: 'True Detective',
    origin: 'True Detective (TV)',
    category: 'tv',
    archetype: 'anti-hero',
    badge: 'Carcosa Investigator',
    tag: 'Detective • Louisiana State Police',
    quote: 'Time is a flat circle.',
    role: 'Philosophic Analyst',
    imageUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
  },
];

export interface CatalogFilterOptions {
  category?: string;
  archetype?: string;
  query?: string;
}

export const avatarService = {
  getCatalog(options: CatalogFilterOptions = {}) {
    const { category, archetype, query } = options;
    let list = [...CANON_AVATAR_CATALOG];

    if (category && category !== 'all') {
      list = list.filter((item) => item.category === category.toLowerCase());
    }

    if (archetype && archetype !== 'all') {
      list = list.filter((item) => item.archetype === archetype.toLowerCase());
    }

    if (query && query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.origin.toLowerCase().includes(q) ||
          item.badge.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q) ||
          item.quote.toLowerCase().includes(q)
      );
    }

    // Category breakdown counts
    const counts = {
      all: CANON_AVATAR_CATALOG.length,
      tv: CANON_AVATAR_CATALOG.filter((i) => i.category === 'tv').length,
      movies: CANON_AVATAR_CATALOG.filter((i) => i.category === 'movies').length,
      anime: CANON_AVATAR_CATALOG.filter((i) => i.category === 'anime').length,
    };

    return {
      items: list,
      total: list.length,
      counts,
    };
  },

  getById(id: string): AvatarItem | null {
    return CANON_AVATAR_CATALOG.find((item) => item.id.toLowerCase() === id.toLowerCase()) || null;
  },

  getRandom(category?: string): AvatarItem {
    let pool = CANON_AVATAR_CATALOG;
    if (category && category !== 'all') {
      const filtered = pool.filter((item) => item.category === category.toLowerCase());
      if (filtered.length > 0) pool = filtered;
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  },
};
