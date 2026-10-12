// Patient stories shown on the landing page. Add, remove or reorder freely: the section works
// with one story or many, with or without an inset photo.
//
// Per story:
//   journeyStage     "after"  → the patient has finished treatment (shown first, with a During → After line)
//                    "during" → still in our care (only the amber "During treatment" chip)
//   mainPhoto        { src, alt, width, height }   large photo
//   insetPhoto       optional small photo in the corner, same shape
//   mainPhotoLabel   caption on the main photo, e.g. "After the session" or "With Dr. {name} during treatment"
//   insetPhotoLabel  label on the inset, e.g. "During treatment"
//   quote, author, detail   the words in the quote card and who said them
//
// TODO: replace the sample quotes and attribution with the patients' own words and names,
// and keep their written consent on file before publishing their photos.
export const PATIENT_STORIES = [
  {
    id: 'story-1',
    journeyStage: 'after',
    mainPhoto: {
      src: '/images/stories/story1_main.jpg',
      width: 1400,
      height: 1050,
      alt: 'A smiling patient in a hospital bed giving a thumbs up next to his doctor, who gives a thumbs up too',
    },
    insetPhoto: {
      src: '/images/stories/story1_inset.jpg',
      width: 700,
      height: 933,
      alt: 'The same patient resting in bed with an oxygen mask during treatment',
    },
    mainPhotoLabel: 'After the session',
    insetPhotoLabel: 'During treatment',
    quote:
      'I was scared when I came in. The team explained every step, checked on me through the night, and the next morning I was giving my doctor a thumbs up.',
    author: 'Shared by a CliniQuick patient',
    detail: 'Comprehensive Check-up',
  },
  {
    id: 'story-2',
    journeyStage: 'during',
    mainPhoto: {
      src: '/images/stories/story2_main.jpg',
      width: 1400,
      height: 1050,
      alt: 'A doctor sitting beside a patient who is resting in a hospital bed with an oxygen mask',
    },
    insetPhoto: {
      src: '/images/stories/story2_inset.jpg',
      width: 700,
      height: 525,
      alt: 'Close-up of the patient resting with an oxygen mask',
    },
    // TODO: use the doctor's name once confirmed, e.g. "With Dr. {name} during treatment".
    mainPhotoLabel: 'With our doctor during treatment',
    insetPhotoLabel: 'Resting between check-ins',
    quote:
      'My doctor sat with me and walked me through what was happening. Knowing someone was watching over me made the hardest days easier.',
    author: 'Shared by a CliniQuick patient',
    detail: 'Currently in our care',
  },
];

// Stories with a happy ending come first, so the first slide visitors see is a positive one.
export const orderedStories = (stories) => [...stories].sort((a, b) => (a.journeyStage === 'after' ? 0 : 1) - (b.journeyStage === 'after' ? 0 : 1));
