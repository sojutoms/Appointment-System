import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LocalHospitalRoundedIcon from '@mui/icons-material/LocalHospitalRounded';
import { fetchAll } from '../api/fetchAll';
import FloatingGlow from '../components/FloatingGlow';
import { CARD_SHADOW } from '../theme';
import { parallaxSx, useSectionProgress } from '../utils/parallax';
import doctorPhoto from '../assets/doctor.png';
import { bookingLink } from '../components/landing/bookingLink';
import HeroPreview from '../components/landing/HeroPreview';
import PatientStoriesSection from '../components/landing/PatientStoriesSection';
import { PATIENT_STORIES } from '../components/landing/patientStories';
import SpecialistsSection from '../components/landing/SpecialistsSection';
import { HERO_STAFF_ID } from '../components/landing/specialistMedia';
import QuickBookingBar from '../components/landing/QuickBookingBar';
import ServiceIllustration, { StepIllustration } from '../components/landing/ServiceIllustration';
import useAuth from '../hooks/useAuth';
import { formatDuration, formatPrice } from '../utils/format';
import { CLIENT_ROLES } from '../utils/roles';

const STEPS = [
  { art: 'account', title: 'Create your account', text: 'Sign up free and verify your email in a few seconds.' },
  { art: 'choose', title: 'Choose a service', text: 'Pick what you need and the specialist you want to see.' },
  { art: 'time', title: 'Pick a time', text: 'Only open slots are shown, so there is never a double-booking.' },
];

// Cut-out doctor photo standing on a soft lavender circle, fading out at the bottom.
function DoctorPortrait() {
  return (
    // The photo is a little wider than its column and spills evenly into the gaps on both sides.
    <Box sx={{ position: 'relative', height: 520, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <Box
        aria-hidden
        sx={(theme) => ({
          position: 'absolute',
          top: 30,
          left: '50%',
          width: 380,
          height: 380,
          borderRadius: '50%',
          transform: 'translateX(-50%)',
          background: 'radial-gradient(circle, #d7ddff 0%, #e2e7ff 55%, #eceffe 68%, rgba(238,242,255,0) 71%)',
          ...theme.applyStyles('dark', {
            background: 'radial-gradient(circle, rgba(129,140,248,0.28) 0%, rgba(129,140,248,0) 70%)',
          }),
        })}
      />
      <Box
        component="img"
        src={doctorPhoto}
        alt="A smiling doctor in a white coat with a stethoscope"
        sx={{
          position: 'relative',
          flexShrink: 0,
          width: 330,
          height: 'auto',
          // Fade the bottom edge into the page so the photo doesn't end in a hard line.
          maskImage: 'linear-gradient(to bottom, #000 80%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 80%, transparent 100%)',
        }}
      />
    </Box>
  );
}

// Accent colours that rotate across cards (steps, services, doctors): [soft background, strong ink].
const TINTS = [
  ['#eef2ff', '#4f46e5'], // lavender
  ['#e6fbf7', '#0f9488'], // teal
  ['#fdf0f7', '#db2777'], // pink
  ['#fef8e6', '#b45309'], // amber
];
const tintAt = (i) => TINTS[i % TINTS.length];

// Soft coloured panel; in dark mode the same hue at low opacity so it doesn't glare.
const tintPanelSx = ([bg, ink]) => (theme) => ({
  bgcolor: bg,
  ...theme.applyStyles('dark', { bgcolor: `${ink}26` }),
});

// Blurred colour glows placed behind a section. Each layout is a list of [colour, position, size].
// Light mode: shades of the logo's indigo (#4f46e5), from pale mist to mid indigo.
const INDIGO_SOFT = '#a5b4fc';
const INDIGO_PALE = '#c7d2fe';
const INDIGO_MID = '#818cf8';
const INDIGO_MIST = '#dfe3ff';
const INDIGO_VIOLET = '#b4adfb';
const GLOWS = {
  hero: [
    [INDIGO_SOFT, { top: -120, left: -100 }, 440],
    [INDIGO_VIOLET, { top: '45%', left: '22%' }, 300],
    [INDIGO_MID, { top: 40, right: '30%' }, 320],
    [INDIGO_PALE, { bottom: 120, right: '2%' }, 340],
    [INDIGO_MIST, { top: -60, right: '-4%' }, 280],
  ],
  steps: [
    [INDIGO_PALE, { top: 20, left: '-4%' }, 440],
    [INDIGO_MIST, { bottom: 0, left: '22%' }, 300],
    [INDIGO_SOFT, { top: '20%', left: '38%' }, 380],
    [INDIGO_VIOLET, { top: 0, right: '22%' }, 300],
    [INDIGO_MID, { bottom: 0, right: '-2%' }, 440],
  ],
  services: [
    [INDIGO_MID, { top: 10, left: '-4%' }, 380],
    [INDIGO_VIOLET, { bottom: 0, left: '30%' }, 340],
    [INDIGO_MIST, { top: '15%', right: '30%' }, 300],
    [INDIGO_PALE, { bottom: 10, right: '-3%' }, 400],
  ],
  doctors: [
    [INDIGO_SOFT, { bottom: -20, left: '-2%' }, 460],
    [INDIGO_VIOLET, { top: 10, left: '28%' }, 300],
    [INDIGO_MIST, { top: '35%', left: '45%' }, 340],
    [INDIGO_PALE, { bottom: 0, right: '24%' }, 300],
    [INDIGO_MID, { top: 0, right: '2%' }, 420],
  ],
};
// The hero's photo and card cover its glows less, so it needs less strength than the card-heavy sections.
const GLOW_OPACITY = { hero: 0.92, steps: 0.62, services: 0.62, doctors: 0.62 };

// Dark mode: each indigo shade becomes a soft white, kept faint so it glows without glaring on navy.
const DARK_GLOW = {
  [INDIGO_SOFT]: '#ffffff',
  [INDIGO_PALE]: '#f4f6ff',
  [INDIGO_MID]: '#fafbff',
  [INDIGO_MIST]: '#eef1ff',
  [INDIGO_VIOLET]: '#f8f9ff',
};
const DARK_GLOW_OPACITY = { hero: 0.22, steps: 0.16, services: 0.16, doctors: 0.16 };

// Blobs are kept inside the section (overflow hidden) and the layer fades out at the top and
// bottom, so a glow near an edge never ends in a hard line against the next section.
const edgeFade = 'linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%)';

// Each section tracks its own scroll progress, so its glows drift while it's on screen.
function SectionGlow({ variant }) {
  const ref = useRef(null);
  useSectionProgress(ref);
  return (
    <Box
      ref={ref}
      aria-hidden
      sx={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        maskImage: edgeFade,
        WebkitMaskImage: edgeFade,
      }}
    >
      {GLOWS[variant].map(([color, pos, size], i) => (
        <FloatingGlow
          key={color}
          index={i}
          sx={{
            ...parallaxSx(i, { strength: 3.2, variable: '--cq-local', centered: true }),
            position: 'absolute',
            // Smaller, tighter glows on phones/tablets so they don't wash out a narrow screen.
            width: { xs: Math.min(size * 0.45, 300), sm: Math.round(size * 0.7), md: size },
            height: { xs: Math.min(size * 0.45, 300), sm: Math.round(size * 0.7), md: size },
            ...pos,
          }}
          blobSx={(theme) => ({
            bgcolor: color,
            filter: { xs: 'blur(60px)', sm: 'blur(75px)', md: 'blur(90px)' },
            opacity: GLOW_OPACITY[variant],
            ...theme.applyStyles('dark', { bgcolor: DARK_GLOW[color], opacity: DARK_GLOW_OPACITY[variant] }),
          })}
        />
      ))}
    </Box>
  );
}

function SectionHeading({ eyebrow, title, text, action }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-end' }, mb: 4 }}
    >
      <Box sx={{ maxWidth: 560 }}>
        <Typography
          variant="overline"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.75,
            px: 1.25,
            mb: 1.25,
            borderRadius: 999,
            fontWeight: 700,
            letterSpacing: '0.08em',
            lineHeight: '24px',
            bgcolor: 'accent.main',
            color: 'accent.contrastText',
            border: '1px solid',
            borderColor: (theme) => `rgba(${theme.vars.palette.primary.mainChannel} / 0.2)`,
            '&::before': { content: '""', width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' },
          }}
        >
          {eyebrow}
        </Typography>
        <Typography
          variant="h4"
          component="h2"
          sx={{ fontSize: { xs: '1.75rem', md: '2rem' }, letterSpacing: { xs: '-0.03em', md: '-0.01em' }, fontWeight: 800, mb: text ? 1 : 0 }}
        >
          {title}
        </Typography>
        {text && <Typography color="text.secondary">{text}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}

const sectionSx = { py: { xs: 6, sm: 7, md: 10 }, scrollMarginTop: 64 };

// Styles that only apply below md (phones and tablets); desktop is untouched.
const mobileOnly = (styles) => (theme) => ({ [theme.breakpoints.down('md')]: styles });

// Phones/tablets: one centred column, ~640px of content on tablets.
const containerSx = mobileOnly({ maxWidth: 688 });

// Hero buttons below md: side by side, 52px tall.
const heroButtonSx = (flex) => mobileOnly({ flex, minHeight: 52, px: 1.5, minWidth: 0 });

const cardSx = {
  height: '100%',
  p: 3,
  borderRadius: '16px',
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: CARD_SHADOW,
};

export default function Home() {
  const { user } = useAuth();
  const location = useLocation();
  const [services, setServices] = useState(null);
  const [staff, setStaff] = useState(null);

  useEffect(() => {
    let active = true;
    fetchAll('/services')
      .then((items) => active && setServices(items))
      .catch(() => active && setServices([]));
    fetchAll('/staff')
      .then((items) => active && setStaff(items.filter((s) => s.services?.length)))
      .catch(() => active && setStaff([]));
    return () => {
      active = false;
    };
  }, []);

  // Navbar links like "/#services" scroll to that section.
  useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash, location.key]);

  const isStaff = user?.role === 'staff';
  // The hero card sits next to the doctor photo, so feature the specialist it shows (by id, so renames don't matter);
  // otherwise any "Dr." name, otherwise the first specialist.
  const featured =
    staff?.find((s) => s._id === HERO_STAFF_ID) ??
    staff?.find((s) => /^dr\.?\s/i.test(s.name)) ??
    staff?.[0] ??
    null;
  const shownServices = services?.slice(0, 4);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <Box
        component="section"
        sx={(theme) => ({
          position: 'relative',
          pt: { xs: 4, sm: 6, md: 8 },
          pb: { xs: 5, md: 6 },
          background: 'linear-gradient(180deg, #ffffff 0%, #f5f7ff 100%)',
          ...theme.applyStyles('dark', { background: 'none' }),
        })}
      >
        <SectionGlow variant="hero" />
        <Container sx={[{ position: 'relative' }, containerSx]}>
          {/* Two columns on tablets; on wide screens the doctor photo sits between text and card. */}
          <Grid container spacing={{ xs: 6, md: 4 }} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 7, lg: 5 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 1.5,
                  py: 0.5,
                  mb: 3,
                  borderRadius: 999,
                  bgcolor: 'accent.main',
                  color: 'accent.contrastText',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'primary.main' }} />
                Online Appointment System
              </Box>
              <Typography
                variant="h1"
                sx={{
                  fontSize: { xs: '2.5rem', sm: '3rem', md: '3.4rem', lg: '3rem' },
                  fontWeight: 800,
                  letterSpacing: { xs: '-0.055em', md: '-0.035em' },
                  lineHeight: { xs: 1, md: 1.08 },
                  mb: 2.5,
                }}
              >
                Book your next appointment in under a minute.
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: { xs: '1.05rem', md: '1.15rem' }, maxWidth: 520, mb: { xs: 3.5, md: 4 } }}>
                See real-time availability, choose a time that suits you, and manage every visit in one place.
              </Typography>
              <Stack direction="row" spacing={1.5}>
                {isStaff ? (
                  <Button component={RouterLink} to="/staff" variant="contained" size="large" sx={[{ borderRadius: 999, px: 3.5 }, heroButtonSx(1)]}>
                    Open my schedule
                  </Button>
                ) : (
                  <Button
                    component={RouterLink}
                    to="/book"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />}
                    sx={[{ borderRadius: 999, px: 3.5 }, heroButtonSx(1.4)]}
                  >
                    {/* Shorter label on phones/tablets so both buttons fit side by side. */}
                    <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                      Book now
                    </Box>
                    <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                      Book an appointment
                    </Box>
                  </Button>
                )}
                <Button
                  component={RouterLink}
                  to={user ? '/appointments' : '/#how-it-works'}
                  size="large"
                  color="inherit"
                  sx={[
                    { borderRadius: 999, px: 3, border: 1, borderColor: 'divider', display: isStaff ? 'none' : undefined },
                    heroButtonSx(1),
                    mobileOnly({ bgcolor: 'field.main', whiteSpace: 'nowrap' }),
                  ]}
                >
                  {user ? (
                    <>
                      <Box component="span" sx={{ display: { xs: 'inline', md: 'none' } }}>
                        Appointments
                      </Box>
                      <Box component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>
                        My appointments
                      </Box>
                    </>
                  ) : (
                    'How it works'
                  )}
                </Button>
              </Stack>
            </Grid>

            <Grid size={{ lg: 3 }} sx={{ display: { xs: 'none', lg: 'block' } }}>
              <DoctorPortrait />
            </Grid>

            <Grid size={{ xs: 12, md: 5, lg: 4 }}>
              {staff?.length === 0 ? null : <HeroPreview staff={featured} />}
            </Grid>
          </Grid>

          {!isStaff && (
            <Box sx={{ mt: { xs: 6, md: 8 } }}>
              <QuickBookingBar services={services} staff={staff} />
            </Box>
          )}
        </Container>
      </Box>

      {/* ---------- How it works ---------- */}
      <Box component="section" id="how-it-works" sx={{ ...sectionSx, position: 'relative' }}>
        <SectionGlow variant="steps" />
        <Container sx={[{ position: 'relative' }, containerSx]}>
          <SectionHeading eyebrow="How it works" title="Three steps to your visit" />
          <Grid container spacing={2.5}>
            {STEPS.map((step, i) => (
              <Grid key={step.title} size={{ xs: 12, md: 4 }}>
                <Box
                  sx={{
                    ...cardSx,
                    position: 'relative',
                    textAlign: 'center',
                  }}
                >
                  <Box sx={[tintPanelSx(tintAt(i)), { position: 'relative', borderRadius: '14px', py: 2.5, display: 'flex', justifyContent: 'center' }]}>
                    <Typography
                      aria-hidden
                      sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        px: 1.25,
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        lineHeight: '24px',
                        bgcolor: 'background.paper',
                        color: tintAt(i)[1],
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </Typography>
                    <StepIllustration name={step.art} size={170} />
                  </Box>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 700, mt: 2, mb: 0.75 }}>
                    {/* Screen-reader-only text. (In MUI `width: 1` means 100%, so the size is in px.) */}
                    <Box
                      component="span"
                      sx={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
                    >
                      Step {i + 1}:{' '}
                    </Box>
                    {step.title}
                  </Typography>
                  <Typography color="text.secondary">{step.text}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ---------- Services ---------- */}
      <Box
        component="section"
        id="services"
        sx={(theme) => ({
          ...sectionSx,
          position: 'relative',
          background: 'linear-gradient(180deg, #f5f7ff 0%, #eef2ff 100%)',
          ...theme.applyStyles('dark', { background: theme.vars.palette.accent.main }),
        })}
      >
        <SectionGlow variant="services" />
        <Container sx={[{ position: 'relative' }, containerSx]}>
          <SectionHeading
            eyebrow="Services"
            title="Care for every visit"
            text="Transparent pricing and session lengths, so you know what to expect."
            action={
              services?.length > 4 && (
                <Button component={RouterLink} to="/book" endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 16 }} />} sx={{ borderRadius: 999, flex: 'none' }}>
                  View all {services.length} services
                </Button>
              )
            }
          />
          <Grid container spacing={2.5}>
            {services === null &&
              [1, 2, 3, 4].map((n) => (
                <Grid key={n} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Skeleton variant="rounded" height={250} sx={{ borderRadius: '16px' }} />
                </Grid>
              ))}
            {services?.length === 0 && (
              <Grid size={12}>
                <Typography color="text.secondary">Services will appear here once they are added.</Typography>
              </Grid>
            )}
            {shownServices?.map((service, i) => (
              <Grid key={service._id} size={{ xs: 12, sm: 6, md: 3 }}>
                <Box
                  component={RouterLink}
                  to={isStaff ? '/staff' : bookingLink({ service: service._id })}
                  title={service.description || undefined}
                  sx={{
                    ...cardSx,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 1.5,
                    pb: 2.5,
                    color: 'inherit',
                    textDecoration: 'none',
                    transition: 'transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
                    '& .cq-art': { transition: 'transform 300ms ease' },
                    '&:hover, &:focus-visible': {
                      transform: 'translateY(-4px)',
                      borderColor: tintAt(i)[1],
                      boxShadow: `0 20px 40px -24px ${tintAt(i)[1]}99`,
                    },
                    '&:hover .cq-art, &:focus-visible .cq-art': { transform: 'scale(1.06)' },
                    '@media (prefers-reduced-motion: reduce)': { '&, & .cq-art': { transition: 'none', transform: 'none !important' } },
                  }}
                >
                  <Box sx={[tintPanelSx(tintAt(i)), { width: '100%', borderRadius: '12px', py: 2.5, display: 'flex', justifyContent: 'center' }]}>
                    <Box className="cq-art">
                      <ServiceIllustration name={service.name} size={160} />
                    </Box>
                  </Box>
                  <Typography variant="h6" component="h3" sx={{ fontWeight: 600, fontSize: '1.05rem', mt: 2 }}>
                    {service.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {formatPrice(service.price)} · {formatDuration(service.durationMinutes)}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* ---------- Doctors ---------- */}
      <Box component='section' id='doctors' sx={{ position: 'relative', pt: { xs: 5, md: 5 }, pb: { xs: 7, md: 10 }, scrollMarginTop: 64 }}>
        <SectionGlow variant='doctors' />
        <Container sx={[{ position: 'relative' }, containerSx]}>
          <SpecialistsSection staff={staff} services={services} canBook={!isStaff} canSeeLive={CLIENT_ROLES.includes(user?.role)} />
        </Container>
      </Box>

      {/* ---------- Patient stories ---------- */}
      <Box component="section" id="stories" sx={{ ...sectionSx, position: 'relative' }}>
        <SectionGlow variant="steps" />
        <Container sx={[{ position: 'relative' }, containerSx]}>
          <SectionHeading
            eyebrow="Patient stories"
            title="Real care, real recoveries"
            text="From the first check-in to the day they feel better, in our patients' own words."
          />
          <PatientStoriesSection stories={PATIENT_STORIES} />
        </Container>
      </Box>

      {/* ---------- Closing call to action ---------- */}
      {!isStaff && (
        <Box component="section" sx={{ pb: { xs: 7, md: 10 } }}>
          <Container sx={containerSx}>
            <Box
              sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: '24px',
                bgcolor: '#4f46e5',
                color: '#fff',
                px: { xs: 3, sm: 6, md: 8 },
                py: { xs: 5, md: 7 },
              }}
            >
              {/* Decorative CliniQuick cross marks in the corner (same icon as the logo) */}
              <LocalHospitalRoundedIcon
                aria-hidden
                sx={{
                  position: 'absolute',
                  right: { xs: -110, md: -40 },
                  top: { xs: -70, md: -60 },
                  fontSize: 340,
                  color: '#fff',
                  opacity: 0.12,
                  transform: 'rotate(-14deg)',
                }}
              />
              <LocalHospitalRoundedIcon
                aria-hidden
                sx={{
                  display: { xs: 'none', md: 'block' },
                  position: 'absolute',
                  right: 300,
                  bottom: -34,
                  fontSize: 110,
                  color: '#fff',
                  opacity: 0.08,
                  transform: 'rotate(12deg)',
                }}
              />
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={4}
                sx={{ position: 'relative', alignItems: { md: 'center' }, justifyContent: 'space-between' }}
              >
                <Box sx={{ maxWidth: 560 }}>
                  <Typography variant="h4" component="h2" sx={{ fontWeight: 800, fontSize: { xs: '1.75rem', md: '2.2rem' }, mb: 1.5 }}>
                    Ready to book your visit?
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: { md: '1.05rem' } }}>
                    It takes under a minute. Pick a service, choose a time that works for you, and we&apos;ll take it from there.
                  </Typography>
                </Box>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flex: 'none' }}>
                  <Button
                    component={RouterLink}
                    to="/book"
                    size="large"
                    endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />}
                    sx={[{ borderRadius: 999, px: 3.5, bgcolor: '#fff', color: '#4338ca', '&:hover': { bgcolor: '#eef2ff' } }, mobileOnly({ minHeight: 52 })]}
                  >
                    Book an appointment
                  </Button>
                  {!user && (
                    <Button
                      component={RouterLink}
                      to="/register"
                      size="large"
                      sx={[
                        {
                          borderRadius: 999,
                          px: 3,
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.45)',
                          '&:hover': { bgcolor: 'rgba(255,255,255,0.1)', borderColor: '#fff' },
                        },
                        mobileOnly({ minHeight: 52 }),
                      ]}
                    >
                      Create an account
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Container>
        </Box>
      )}
    </>
  );
}
