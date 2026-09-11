/**
 * This hook returns the current app theme colors based on React Native Paper theme.
 */

import { useTheme as usePaperTheme } from 'react-native-paper';

export function useTheme() {
  const theme = usePaperTheme();

  return {
    text: theme.colors.onSurface,
    background: theme.colors.background,
    backgroundElement: theme.colors.surface,
    backgroundSelected: theme.colors.surfaceVariant,
    textSecondary: theme.colors.onSurfaceVariant,
  };
}
