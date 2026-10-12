import { useState } from 'react';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { keyframes } from '@mui/material/styles';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FormatQuoteRoundedIcon from '@mui/icons-material/FormatQuoteRounded';
import { orderedStories } from './patientStories';

// Same frosted surface as the specialist cards.
const frostSx = (theme) => ({
  border: '1px solid',
  borderColor: 'divider',
  backgroundColor: 'rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 24px 50px -28px rgba(60, 50, 160, 0.28)',
  ...theme.applyStyles('dark', { backgroundColor: 'rgba(20, 26, 54, 0.74)', boxShadow: '0 24px 50px -28px rgba(0, 0, 0, 0.65)' }),
});

// [light bg, light text, dark bg, dark text]
const AMBER = ['#fef3c7', '#b45309', 'rgba(251, 191, 36, 0.14)', '#fcd34d'];
const GREEN = ['#e7f7ee', '#15803d', 'rgba(134, 239, 172, 0.14)', '#86efac'];
const toneSx = ([bg, ink, darkBg, darkInk]) => (theme) => ({ bgcolor: bg, color: ink, ...theme.applyStyles('dark', { bgcolor: darkBg, color: darkInk }) });

const fadeIn = keyframes`from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; }`;
const slideInSx = {
  animation: `${fadeIn} 420ms ease both`,
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
};

const tablet = (styles) => (theme) => ({ [theme.breakpoints.down('md')]: styles });

function StageChip({ tone, children }) {
  return (
    <Box
      component="span"
      sx={[{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, borderRadius: 999, fontSize: 12.5, fontWeight: 700, lineHeight: '28px', whiteSpace: 'nowrap' }, toneSx(tone)]}
    >
      <Box component="span" aria-hidden sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'currentColor' }} />
      {children}
    </Box>
  );
}

// Small frosted label laid over a photo.
function PhotoLabel({ children, sx }) {
  return (
    <Box
      sx={[
        frostSx,
        { position: 'absolute', px: 1.5, py: 0.75, borderRadius: '12px', fontSize: 13, fontWeight: 700, color: 'text.primary', maxWidth: 'calc(100% - 24px)' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}

// Hand-drawn style arrow from the inset ("during") up toward the main photo ("after").
function JourneyArrow() {
  return (
    <Box
      component="svg"
      aria-hidden
      viewBox="0 0 90 70"
      sx={[{ position: 'absolute', width: 86, height: 66, color: 'primary.main', pointerEvents: 'none' }, { right: 'calc(36% + 4px)', bottom: 96 }, tablet({ display: 'none' })]}
    >
      <path d="M84 62 C 60 64, 30 52, 14 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 7" />
      <path d="M6 24 L 13 12 L 25 19" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
}

// "Patient journey / From treatment to thumbs up" (or "In our care" while still in treatment).
function JourneyTag({ after }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: '9px', bgcolor: 'primary.main', color: 'primary.contrastText', flex: 'none' }}>
        <FavoriteRoundedIcon sx={{ fontSize: 16 }} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', lineHeight: 1.2 }}>Patient journey</Box>
        <Box sx={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.25 }}>{after ? 'From treatment to thumbs up' : 'In our care'}</Box>
      </Box>
    </Box>
  );
}

function PhotoStage({ story }) {
  const after = story.journeyStage === 'after';
  const { mainPhoto, insetPhoto } = story;

  return (
    <Box sx={{ position: 'relative', pb: insetPhoto ? { xs: 7, md: 6 } : 0, pr: insetPhoto ? { xs: 2, md: 3 } : 0 }}>
      {/* Phones and tablets: the tag sits above the photo so it never covers a face. */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, mb: 1.5 }}>
        <JourneyTag after={after} />
      </Box>
      <Box sx={{ position: 'relative', borderRadius: '28px', overflow: 'hidden', boxShadow: '0 30px 60px -32px rgba(40, 30, 120, 0.45)', aspectRatio: '4 / 3', bgcolor: 'accent.main' }}>
        <Box
          component="img"
          src={mainPhoto.src}
          alt={mainPhoto.alt}
          width={mainPhoto.width}
          height={mainPhoto.height}
          loading="lazy"
          sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Desktop: the story tag sits top-right, over the monitor rather than anyone's face. */}
        <PhotoLabel sx={{ top: 14, right: 14, display: { xs: 'none', md: 'flex' } }}>
          <JourneyTag after={after} />
        </PhotoLabel>
        {/* Bottom-left: caption for the main photo. */}
        {/* Narrower than the photo so it wraps instead of sliding under the inset. */}
        <PhotoLabel sx={{ bottom: 14, left: 14, maxWidth: insetPhoto ? { xs: '52%', md: '56%' } : undefined }}>{story.mainPhotoLabel}</PhotoLabel>
      </Box>

      {insetPhoto && (
        <>
          {after && <JourneyArrow />}
          {/* Outer box positions the inset; the inner one clips the photo. The label hangs off the
              bottom edge (outside the photo) so it never covers the patient's face. */}
          <Box sx={{ position: 'absolute', right: 0, bottom: 14, width: { xs: '40%', md: '36%' } }}>
            <Box
              sx={(theme) => ({
                borderRadius: '20px',
                overflow: 'hidden',
                border: '4px solid #fff',
                boxShadow: '0 24px 44px -20px rgba(40, 30, 120, 0.55)',
                aspectRatio: '4 / 3',
                ...theme.applyStyles('dark', { borderColor: '#141a36' }),
              })}
            >
              <Box
                component="img"
                src={insetPhoto.src}
                alt={insetPhoto.alt}
                width={insetPhoto.width}
                height={insetPhoto.height}
                loading="lazy"
                sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
              />
            </Box>
            {story.insetPhotoLabel && (
              <Box
                sx={[
                  { position: 'absolute', right: 10, bottom: -14, px: 1.25, borderRadius: 999, fontSize: 12, fontWeight: 700, lineHeight: '26px', whiteSpace: 'nowrap', boxShadow: '0 6px 14px -8px rgba(0,0,0,0.35)' },
                  toneSx(AMBER),
                ]}
              >
                {story.insetPhotoLabel}
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}

function QuoteCard({ story, controls }) {
  const after = story.journeyStage === 'after';
  return (
    <Box sx={[frostSx, { borderRadius: '24px', p: { xs: 2.5, sm: 3.5 } }]}>
      <Box sx={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '14px', bgcolor: 'accent.main', color: 'accent.contrastText', mb: 2 }}>
        <FormatQuoteRoundedIcon />
      </Box>
      <Typography component="blockquote" sx={{ m: 0, fontSize: { xs: 18, md: 21 }, fontWeight: 600, lineHeight: 1.5, letterSpacing: '-0.01em' }}>
        “{story.quote}”
      </Typography>
      <Typography sx={{ mt: 2, fontWeight: 700 }}>{story.author}</Typography>
      {story.detail && (
        <Typography variant="body2" color="text.secondary">
          {story.detail}
        </Typography>
      )}

      {/* Journey line: During → After for finished stories; only "During" while still in care. */}
      <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1, mt: 2.5, pt: 2.5, borderTop: 1, borderColor: 'divider' }}>
        <StageChip tone={AMBER}>During treatment</StageChip>
        {after && (
          <>
            <ArrowForwardRoundedIcon aria-label="then" sx={{ fontSize: 18, color: 'text.secondary' }} />
            <StageChip tone={GREEN}>After the session</StageChip>
          </>
        )}
      </Stack>
      {controls}
    </Box>
  );
}

// "Patient stories": one story at a time with a photo stage and a quote card.
// Works with any number of stories; prev/next and dots only appear when there is more than one.
export default function PatientStoriesSection({ stories }) {
  const list = orderedStories(stories);
  const [index, setIndex] = useState(0);
  if (!list.length) return null;

  const current = list[Math.min(index, list.length - 1)];
  const many = list.length > 1;
  const go = (i) => setIndex((i + list.length) % list.length);

  const controls = many && (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 2.5 }}>
      <IconButton aria-label="Previous story" onClick={() => go(index - 1)} sx={{ border: 1, borderColor: 'divider', bgcolor: 'field.main' }}>
        <ChevronLeftRoundedIcon />
      </IconButton>
      <IconButton aria-label="Next story" onClick={() => go(index + 1)} sx={{ border: 1, borderColor: 'divider', bgcolor: 'field.main' }}>
        <ChevronRightRoundedIcon />
      </IconButton>
      <Box sx={{ flexGrow: 1 }} />
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
        {list.map((s, i) => (
          <ButtonBase
            key={s.id}
            aria-label={`Show story ${i + 1} of ${list.length}`}
            aria-current={i === index ? 'true' : undefined}
            onClick={() => go(i)}
            sx={{
              width: i === index ? 22 : 8,
              height: 8,
              borderRadius: 999,
              bgcolor: i === index ? 'primary.main' : 'divider',
              transition: 'width 200ms ease',
              '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
            }}
          />
        ))}
      </Stack>
    </Stack>
  );

  return (
    <Box role={many ? 'region' : undefined} aria-roledescription={many ? 'carousel' : undefined} aria-label="Patient stories">
      <Box
        key={current.id}
        aria-live="polite"
        aria-roledescription={many ? 'slide' : undefined}
        aria-label={many ? `Story ${index + 1} of ${list.length}` : undefined}
        sx={[{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 6, alignItems: 'center' }, tablet({ gridTemplateColumns: '1fr', gap: 4 }), slideInSx]}
      >
        <PhotoStage story={current} />
        <QuoteCard story={current} controls={controls} />
      </Box>
    </Box>
  );
}
