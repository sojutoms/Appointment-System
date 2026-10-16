import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useColorScheme } from '@mui/material/styles';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import MobileTopBar from '../mobile/MobileTopBar';
import { SoftChip } from '../StatusChip';
import useAuth from '../../hooks/useAuth';
import AvatarEditor from './AvatarEditor';
import DangerZoneCard from './DangerZoneCard';
import EmailCard from './EmailCard';
import PersonalInfoCard from './PersonalInfoCard';
import ProfileCompleteness from './ProfileCompleteness';
import RemindersCard from './RemindersCard';
import SecurityCard from './SecurityCard';
import { pillSwitchSx, profileGradientSx, ROLE_LABEL, scrollToSection } from './profileUtils';

const contentSx = { maxWidth: 640, mx: 'auto', px: 2 };
const noMotion = { '@media (prefers-reduced-motion: reduce)': { transition: 'none' } };

// Sub-screen ids match the desktop section ids, so completeness hints map straight onto them.
// TODO(backend): "Health info" and "Devices" rows once that data/those endpoints exist.
const SCREENS = [
  { id: 'personal-info', title: 'Personal info', icon: PersonOutlineRoundedIcon },
  { id: 'email', title: 'Email address', icon: MailOutlineRoundedIcon },
  { id: 'security', title: 'Security & password', icon: LockOutlinedIcon },
  { id: 'reminders', title: 'Notifications', icon: NotificationsNoneRoundedIcon, clientOnly: true },
  // { id: 'danger-zone', title: 'Danger zone', icon: DeleteOutlineRoundedIcon, clientOnly: true, danger: true },
];

function IconTile({ icon: Icon, danger }) {
  return (
    <Box
      aria-hidden
      sx={(theme) => ({
        width: 38,
        height: 38,
        flex: 'none',
        borderRadius: '12px',
        display: 'grid',
        placeItems: 'center',
        ...(danger
          ? { bgcolor: `rgba(${theme.vars.palette.error.mainChannel} / 0.12)`, color: theme.vars.palette.error.main }
          : { bgcolor: theme.vars.palette.accent.main, color: theme.vars.palette.accent.contrastText }),
      })}
    >
      <Icon sx={{ fontSize: 21 }} />
    </Box>
  );
}

const rowSx = { display: 'flex', alignItems: 'center', gap: 1.75, width: '100%', minHeight: 60, px: 2, py: 1, textAlign: 'left' };

function RowLabel({ id, label, value, danger }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography id={id} sx={{ fontWeight: 700, color: danger ? 'error.main' : 'text.primary' }}>
        {label}
      </Typography>
      {value && (
        <Typography variant="body2" color="text.secondary" noWrap>
          {value}
        </Typography>
      )}
    </Box>
  );
}

// Settings row that opens a sub-screen.
function NavRow({ screen, value, onOpen, buttonRef }) {
  return (
    <ButtonBase
      ref={buttonRef}
      onClick={onOpen}
      disableRipple
      sx={(theme) => ({
        ...rowSx,
        transition: 'background-color 150ms',
        '&:hover, &:active': { bgcolor: theme.vars.palette.action.hover },
        '&.Mui-focusVisible': { outline: `2px solid ${theme.vars.palette.primary.main}`, outlineOffset: -2 },
        ...noMotion,
      })}
    >
      <IconTile icon={screen.icon} danger={screen.danger} />
      <RowLabel label={screen.title} value={value} danger={screen.danger} />
      <ChevronRightRoundedIcon aria-hidden sx={{ color: 'text.secondary', flex: 'none' }} />
    </ButtonBase>
  );
}

// Real light/dark switch (same store as the navbar toggle; MUI remembers it in localStorage).
function DarkModeRow() {
  const { mode, systemMode, setMode } = useColorScheme();
  const current = mode === 'system' ? systemMode : mode;
  return (
    <Box component="label" sx={{ ...rowSx, cursor: 'pointer' }}>
      <IconTile icon={DarkModeOutlinedIcon} />
      <RowLabel label="Dark mode" value={mode === 'system' ? 'Following your device' : undefined} />
      <Switch
        checked={current === 'dark'}
        disabled={!mode}
        onChange={(e) => setMode(e.target.checked ? 'dark' : 'light')}
        disableRipple
        sx={[pillSwitchSx, noMotion, { '& .MuiSwitch-switchBase': noMotion, '& .MuiSwitch-track': noMotion }]}
      />
    </Box>
  );
}

// Phone/tablet profile: header + settings list; each row opens an in-page sub-screen
// kept in `?section=` so Back closes it and a refresh keeps it open.
export default function ProfileMobile({ user, isStaff, isAdmin, personalSubtitle, onChangeEmail }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const screens = SCREENS.filter((s) => !s.clientOnly || !isStaff);
  const screen = screens.find((s) => s.id === params.get('section')) ?? null;
  const headingRef = useRef(null);
  const rowRefs = useRef({});
  const lastOpened = useRef(null);
  const pendingFocus = useRef(null);

  const open = (id, focus) => {
    lastOpened.current = id;
    pendingFocus.current = focus ? { id, focus } : null;
    setParams({ section: id }, { state: { profileSub: true } });
  };

  // Pop our own history entry when we pushed it; otherwise (deep link/refresh) just drop the param.
  const back = () => {
    if (location.state?.profileSub) navigate(-1);
    else setParams({}, { replace: true });
  };

  // Sub-screens start at the top with focus on their title (or on the field a hint pointed at);
  // closing one returns focus to the row that opened it.
  const screenId = screen?.id;
  useEffect(() => {
    if (screenId) {
      window.scrollTo(0, 0);
      const pending = pendingFocus.current;
      pendingFocus.current = null;
      if (pending?.id === screenId) scrollToSection(screenId, pending.focus);
      else headingRef.current?.focus({ preventScroll: true });
    } else if (lastOpened.current) {
      rowRefs.current[lastOpened.current]?.focus();
    }
  }, [screenId]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (screen) {
    return (
      <>
        <MobileTopBar
          left={
            <IconButton aria-label="Back" onClick={back} sx={{ width: 44, height: 44 }}>
              <ArrowBackRoundedIcon />
            </IconButton>
          }
          center={
            <Typography
              ref={headingRef}
              tabIndex={-1}
              component="h1"
              noWrap
              sx={{ fontSize: 17, fontWeight: 700, '&:focus': { outline: 'none' } }}
            >
              {screen.title}
            </Typography>
          }
        />
        {/* Extra bottom room on Personal info for the fixed save bar. */}
        <Box sx={{ ...contentSx, pt: 1, pb: screen.id === 'personal-info' ? 11 : 3 }}>
          {screen.id === 'personal-info' && <PersonalInfoCard subtitle={personalSubtitle} stickySave />}
          {screen.id === 'email' && <EmailCard user={user} isStaff={isStaff} isAdmin={isAdmin} onChange={onChangeEmail} />}
          {screen.id === 'security' && <SecurityCard isAdmin={isAdmin} />}
          {screen.id === 'reminders' && <RemindersCard />}
          {screen.id === 'danger-zone' && <DangerZoneCard />}
        </Box>
      </>
    );
  }

  const rowValues = { email: user.email };
  const rows = screens.filter((s) => !s.danger);
  const dangerRows = screens.filter((s) => s.danger);
  const renderRow = (s) => (
    <Box component="li" key={s.id}>
      <NavRow
        screen={s}
        value={rowValues[s.id]}
        onOpen={() => open(s.id)}
        buttonRef={(el) => {
          rowRefs.current[s.id] = el;
        }}
      />
    </Box>
  );
  const listSx = {
    listStyle: 'none',
    m: 0,
    p: 0,
    '& > li + li': { borderTop: 1, borderColor: 'divider' },
  };

  return (
    <Box sx={{ pb: 3 }}>
      {/* Decorative full-bleed banner (no text on it). */}
      <Box aria-hidden sx={[{ height: 120 }, profileGradientSx]} />

      <Box sx={contentSx}>
        <Stack direction="row" spacing={2} sx={{ mt: '-44px', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <AvatarEditor
            size={88}
            avatarSx={(theme) => ({
              fontSize: 30,
              fontWeight: 800,
              bgcolor: 'accent.main',
              color: 'accent.contrastText',
              border: `4px solid ${theme.vars.palette.background.default}`,
              boxSizing: 'border-box',
            })}
          />
          <Button variant="outlined" size="small" onClick={() => open('personal-info')} sx={{ minHeight: 44, flex: 'none' }}>
            Edit profile
          </Button>
        </Stack>

        <Typography
          component="h1"
          sx={{ mt: 1.5, fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15, overflowWrap: 'anywhere' }}
        >
          {user.name}
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
          {user.email}
        </Typography>
        <Stack direction="row" useFlexGap sx={{ mt: 1.5, gap: 1, flexWrap: 'wrap' }}>
          <SoftChip tone="accent">{ROLE_LABEL[user.role] ?? 'Client'}</SoftChip>
          {user.isVerified && (
            <SoftChip tone="success" icon="check">
              Email verified
            </SoftChip>
          )}
        </Stack>

        <Card sx={{ mt: 2.5, px: 2.5, pt: 2.5, pb: 1.5 }}>
          <ProfileCompleteness
            user={user}
            onHint={(section, focus) => open(section, focus)}
            linkSx={{ minHeight: 44, display: 'flex', alignItems: 'center', mt: 0.5 }}
          />
        </Card>

        <Card component="nav" aria-label="Profile settings" sx={{ mt: 2, p: 0, overflow: 'hidden' }}>
          <Box component="ul" sx={listSx}>
            {rows.map(renderRow)}
            <Box component="li">
              <DarkModeRow />
            </Box>
            {dangerRows.map(renderRow)}
          </Box>
        </Card>

        <Button
          color="error"
          fullWidth
          startIcon={<LogoutRoundedIcon />}
          onClick={handleLogout}
          sx={{ mt: 2, minHeight: 48, fontWeight: 700 }}
        >
          Log out
        </Button>
      </Box>
    </Box>
  );
}
