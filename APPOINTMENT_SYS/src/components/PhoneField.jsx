import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { LIMITS } from '../utils/validation';

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const COUNTRIES = getCountries()
  .map((code) => ({ code, label: regionNames.of(code) ?? code, dialCode: `+${getCountryCallingCode(code)}` }))
  .sort((a, b) => a.label.localeCompare(b.label));
const BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

// Country picker + number input. The country's calling code is filled in
// automatically; the user types only the local number (digits only).
// `value` is { country: 'PH', number: '9171234567' }.
export default function PhoneField({ value, onChange, error, label = 'Phone number', helperText }) {
  const country = BY_CODE[value.country] ?? null;

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2.5, sm: 1.5 }}>
      <Autocomplete
        options={COUNTRIES}
        value={country}
        onChange={(_e, next) => onChange({ ...value, country: next?.code ?? '' })}
        getOptionLabel={(c) => `${c.label} (${c.dialCode})`}
        isOptionEqualToValue={(a, b) => a.code === b.code}
        autoHighlight
        disableClearable={Boolean(country)}
        sx={{ flex: { sm: '0 0 45%' } }}
        renderOption={({ key, ...props }, c) => (
          <Box component="li" key={key} {...props}>
            {c.label}
            <Box component="span" sx={{ ml: 'auto', pl: 1, color: 'text.secondary' }}>
              {c.dialCode}
            </Box>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Country"
            error={Boolean(error) && !country}
            slotProps={{
              ...params.slotProps,
              htmlInput: { ...params.slotProps.htmlInput, maxLength: 60, autoComplete: 'country-name' },
            }}
          />
        )}
      />
      <TextField
        label={label}
        type="tel"
        autoComplete="tel-national"
        placeholder="9171234567"
        value={value.number}
        onChange={(e) => onChange({ ...value, number: e.target.value.replace(/\D/g, '').slice(0, LIMITS.phoneDigits) })}
        error={Boolean(error)}
        helperText={error || helperText}
        slotProps={{
          input: {
            startAdornment: <InputAdornment position="start">{country ? country.dialCode : '+'}</InputAdornment>,
          },
          htmlInput: { inputMode: 'numeric', maxLength: LIMITS.phoneDigits },
        }}
      />
    </Stack>
  );
}
