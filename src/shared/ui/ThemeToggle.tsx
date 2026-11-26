import { useTheme } from '../hooks/useTheme';
import { Button } from './Button';
import { Icon } from './Icon';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const next = theme === 'dark' ? 'claro' : 'escuro';
  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label={`Ativar tema ${next}`} title={`Ativar tema ${next}`}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-4 w-4" />
    </Button>
  );
}
