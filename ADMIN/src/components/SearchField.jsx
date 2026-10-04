import { useEffect, useState } from 'react';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import useDebounce from '../hooks/useDebounce';

// Search box that reports its value 400 ms after the admin stops typing.
export default function SearchField({ value, onChange, placeholder, sx }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text.trim());

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // Only react to the debounced text; `value` changes come from this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <TextField
      size="small"
      placeholder={placeholder}
      value={text}
      onChange={(e) => setText(e.target.value)}
      sx={sx}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
        },
        htmlInput: { 'aria-label': placeholder, maxLength: 100 },
      }}
    />
  );
}
