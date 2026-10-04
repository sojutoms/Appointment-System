import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useColorScheme } from '@mui/material/styles';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';

// Light/dark switch. MUI remembers the choice in localStorage.
export default function ColorModeToggle({ sx }) {
  const { mode, systemMode, setMode } = useColorScheme();
  if (!mode) return null; // not resolved yet on first render

  const current = mode === 'system' ? systemMode : mode;
  const next = current === 'dark' ? 'light' : 'dark';

  return (
    <Tooltip title={`Switch to ${next} mode`}>
      <IconButton onClick={() => setMode(next)} aria-label={`Switch to ${next} mode`} sx={sx}>
        {current === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
      </IconButton>
    </Tooltip>
  );
}
