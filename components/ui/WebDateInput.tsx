/** Phone builds use the native pickers — this web-only input is never rendered there. */
export function WebDateInput(_props: {
  type: 'date' | 'time' | 'datetime-local';
  value: string;
  onChange: (value: string) => void;
  max?: string;
}) {
  return null;
}
