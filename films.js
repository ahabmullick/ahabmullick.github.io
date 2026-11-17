// Every film on the site. Edit this list to add, remove or reorder work.
// `stills` is how many images exist in assets/stills/<slug>-N.jpg.
// `video` is either { vimeo: "id" } or { youtube: "id" }. For Vimeo, `start` is the
// second the silent loop behind the title begins from.
export const FILMS = [
  {
    slug: 'stone-island', title: 'Stone Island x Sir Render', kind: 'Vinyl campaign',
    roles: 'Video, Photography, Edit & Color', video: { vimeo: '1233022797', start: 8 }, stills: 12,
  },
  {
    slug: 'sir-render', title: 'Sir Render', kind: 'Music video for Navy Blue',
    roles: 'Directed & Color', featuring: 'Sage Elsesser', video: { youtube: 'E6Ljg3Xn7CI' }, stills: 6,
  },
  {
    slug: 'crux-ansata', title: 'Crux Ansata', kind: 'Album film for Navy Blue',
    roles: 'Written, Directed & Color', featuring: 'Sage and Paloma Elsesser', video: { youtube: 'PhUyS4A8pb8' }, stills: 6,
  },
  {
    slug: 'next-life', title: 'Next Life', kind: 'Music video for Navy Blue',
    roles: 'Directed & Color', featuring: 'Sage Elsesser', video: { youtube: 'BZvC0xNvRFk' }, stills: 3,
  },
  {
    slug: 'berlin', title: 'Berlin', kind: 'Brand campaign',
    roles: 'Written, Directed & Color', video: { vimeo: '799330576', start: 110 }, stills: 16,
  },
  {
    slug: 'phantoms', title: 'Phantoms', kind: 'Brand campaign',
    roles: 'Written, Directed, Photographed & Color', video: { vimeo: '703672361', start: 55 }, stills: 12,
  },
  {
    slug: 'aesop', title: 'Aurner', kind: 'Brand campaign for Aesop, director’s cut',
    roles: 'Directed & Color', featuring: 'Tony Özkan', video: { vimeo: '1081069657', start: 35 }, stills: 12,
  },
  {
    slug: 'two-of-us', title: 'Two of Us', kind: 'Brand campaign',
    roles: 'Written, Directed, Photographed & Color', video: { vimeo: '549446575', start: 25 }, stills: 11,
  },
  {
    slug: 'glasshouse', title: 'Life in a Glasshouse', kind: 'Short film',
    roles: 'Written, Directed, Photographed & Color', featuring: 'Yesly Dimate and Tony Özkan', video: { vimeo: '1044155971', start: 19 }, stills: 7,
  },
  {
    slug: 'dreams', title: 'Dreams', kind: 'Short film',
    roles: 'Written, Directed & Color', video: { vimeo: '766786499', start: 14 }, stills: 6,
  },
  {
    slug: 'siegfried', title: 'Siegfried', kind: 'Narrative short',
    roles: 'Written, Directed, Photographed & Color', video: { vimeo: '376621384', start: 31 }, stills: 7,
  },
  {
    slug: 'bambi', title: 'Bambi', kind: 'Short film',
    roles: 'Written, Directed, Photographed & Color', video: { vimeo: '584438798', start: 38 }, stills: 7,
  },
  {
    slug: 'home', title: 'Home', kind: 'Brand campaign',
    roles: 'Written, Directed, Photographed & Color', video: { vimeo: '647512200', start: 25 }, stills: 12,
  },
  {
    slug: 'godspeed', title: 'Godspeed', kind: 'Short film',
    roles: 'Written, Directed, Photographed & Color', video: { vimeo: '222430358', start: 60 }, stills: 3,
  },
];

export const still = (slug, n = 1) => `assets/stills/${slug}-${n}.jpg`;
export const thumb = (slug, n = 1) => `assets/thumbs/${slug}-${n}.jpg`;
