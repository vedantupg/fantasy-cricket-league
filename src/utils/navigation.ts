/**
 * View Transitions API wrapper for navigation.
 * Applies slide-left (forward) or slide-right (back) page transitions when supported.
 */
export const transitionTo = (
  navigate: (to: any) => void,
  to: string | number,
  isBack = false
): void => {
  if (typeof document !== 'undefined' && (document as any).startViewTransition) {
    if (isBack) document.documentElement.classList.add('navigating-back');
    (document as any).startViewTransition(() => {
      navigate(to as any);
    }).finished.finally(() => {
      document.documentElement.classList.remove('navigating-back');
    });
  } else {
    navigate(to as any);
  }
};
