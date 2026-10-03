import { useEffect, useRef } from 'react';

const LENGTH = 6;

// Six single-digit boxes. Supports typing, backspace, arrow keys and pasting
// the whole code. `value` is a string where empty boxes are spaces; parents can
// use value.trim().length === 6 to know it's complete. Calls onComplete(code)
// as soon as all six digits are filled.
export default function OtpInput({ value, onChange, onComplete, disabled, invalid, autoFocus = true }) {
  const inputs = useRef([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => (value[i] && value[i] !== ' ' ? value[i] : ''));

  const focus = (index) => inputs.current[Math.max(0, Math.min(LENGTH - 1, index))]?.focus();

  // When the parent clears the code (e.g. after a wrong attempt), jump back to the first box.
  useEffect(() => {
    if (!value && !disabled && autoFocus) inputs.current[0]?.focus();
  }, [value, disabled, autoFocus]);

  const emit = (chars) => {
    const next = chars.map((c) => c || ' ').join('').trimEnd();
    onChange(next);
    if (/^\d{6}$/.test(next)) onComplete?.(next);
  };

  const handleChange = (index, e) => {
    const typed = e.target.value.replace(/\D/g, '');
    if (!typed) return;
    // Typing several digits at once (some mobile keyboards) fills the following boxes.
    const chars = digits.slice();
    typed.split('').forEach((ch, offset) => {
      if (index + offset < LENGTH) chars[index + offset] = ch;
    });
    emit(chars);
    focus(index + typed.length);
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const chars = digits.slice();
      if (chars[index]) {
        chars[index] = '';
      } else if (index > 0) {
        chars[index - 1] = '';
        focus(index - 1);
      }
      emit(chars);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focus(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focus(index + 1);
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    emit(pasted.split(''));
    focus(pasted.length);
  };

  return (
    <div className="otp-input" role="group" aria-label="6-digit verification code">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            inputs.current[i] = el;
          }}
          className={`form-control otp-box${invalid ? ' is-invalid' : ''}`}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1}`}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
