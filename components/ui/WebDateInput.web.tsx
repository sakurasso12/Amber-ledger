import React from 'react';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Web / desktop (2.0): the browser's own date/time field (calendar popup, keyboard entry) styled
 * like the app's inputs. Values use the HTML formats: yyyy-MM-dd, HH:mm, yyyy-MM-ddTHH:mm.
 */
export function WebDateInput({
  type,
  value,
  onChange,
  max,
}: {
  type: 'date' | 'time' | 'datetime-local';
  value: string;
  onChange: (value: string) => void;
  max?: string;
}) {
  const theme = useTheme();
  return (
    <input
      type={type}
      value={value}
      max={max}
      onChange={(e) => {
        if (e.target.value) onChange(e.target.value);
      }}
      style={{
        flex: 1,
        minWidth: 0,
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        fontSize: 15,
        color: theme.colors.text,
        background: theme.colors.surfaceAlt,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 10,
        padding: '10px 14px',
        colorScheme: theme.dark ? 'dark' : 'light',
        outline: 'none',
      }}
    />
  );
}
