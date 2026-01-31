/**
 * Centralized Color System
 *
 * Electric Blue + Navy Theme for Fantasy Cricket League
 *
 * Color Philosophy:
 * - Electric Blue (#1E88E5) = Primary actions, energy, trust
 * - Navy (#003E5C) = Depth, cards, sophistication
 * - Deep Blue (#016293) = Emphasis, hover states
 * - Orange (#FF9800) = Captain, critical highlights
 * - Teal (#00897B) = Informational, secondary roles
 */

export const colors = {
  // PRIMARY BLUES - Main brand colors
  blue: {
    electric: '#1E88E5',    // Primary CTAs, active states, links
    deep: '#016293',        // Hover states, emphasis, elevated cards
    navy: '#003E5C',        // Card backgrounds, panels, depth
    light: '#42A5F5',       // Lighter accents, highlights
  },

  // ACCENT COLORS
  orange: {
    primary: '#FF9800',     // Captain badges, critical highlights
    dark: '#F57C00',        // Hover, emphasis
    light: '#FFB74D',       // Lighter accents
  },

  // FUNCTIONAL COLORS
  purple: {
    primary: '#7B1FA2',     // VC, informational states, premium features
    light: '#9C27B0',       // X-Factor, lighter accents
    dark: '#6A1B9A',        // Emphasis, deep purple
  },

  success: {
    primary: '#7CB342',     // Valid states, success messages
    dark: '#558B2F',        // Emphasis
    light: '#9CCC65',       // Lighter success
  },

  green: {
    primary: '#4CAF50',     // Green states, completed
    dark: '#388E3C',        // Emphasis
    light: '#66BB6A',       // Lighter green
  },

  warning: {
    primary: '#FFA726',     // Warnings, deadlines approaching
    dark: '#F57C00',        // Critical warnings
    light: '#FFB74D',       // Light warnings
  },

  error: {
    primary: '#E53935',     // Errors, destructive actions
    dark: '#C62828',        // Critical errors
    light: '#EF5350',       // Light errors
  },

  // SPECIAL COLORS
  gold: '#FFD700',          // Rank #1, achievements
  silver: '#C0C0C0',        // Rank #2
  bronze: '#CD7F32',        // Rank #3

  // NEUTRALS
  grey: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // TEXT COLORS
  text: {
    primary: '#FFFFFF',
    secondary: '#E0E0E0',
    disabled: '#9E9E9E',
    hint: '#757575',
  },

  // BACKGROUNDS
  background: {
    default: '#0A1929',     // Main dark background
    paper: '#003E5C',       // Cards, panels (navy)
    elevated: '#016293',    // Elevated cards, modals (deep blue)
    overlay: 'rgba(0, 62, 92, 0.95)', // Modal overlays
    glass: 'rgba(0, 62, 92, 0.8)',    // Glass morphism
  },

  // BORDERS
  border: {
    subtle: 'rgba(30, 136, 229, 0.12)',   // Very subtle borders
    default: 'rgba(30, 136, 229, 0.23)',  // Default borders
    strong: 'rgba(30, 136, 229, 0.5)',    // Focused/active borders
    emphasis: '#1E88E5',                   // Full color borders
  },

  // GRADIENTS
  gradients: {
    hero: 'linear-gradient(135deg, #0A1929 0%, #003E5C 50%, #016293 100%)',
    card: 'linear-gradient(90deg, #003E5C 0%, #016293 100%)',
    button: 'linear-gradient(180deg, #1E88E5 0%, #016293 100%)',
    title: 'linear-gradient(90deg, #1E88E5 0%, #00BCD4 100%)',
    orange: 'linear-gradient(90deg, #FF9800 0%, #F57C00 100%)',
    purple: 'linear-gradient(90deg, #7B1FA2 0%, #9C27B0 100%)',
  },

  // SHADOWS & GLOWS
  shadows: {
    blue: {
      sm: '0 4px 12px rgba(30, 136, 229, 0.2)',
      md: '0 8px 24px rgba(30, 136, 229, 0.3)',
      lg: '0 12px 40px rgba(30, 136, 229, 0.4)',
      glow: '0 0 20px rgba(30, 136, 229, 0.5)',
    },
    orange: {
      sm: '0 4px 12px rgba(255, 152, 0, 0.2)',
      md: '0 8px 24px rgba(255, 152, 0, 0.3)',
      lg: '0 12px 40px rgba(255, 152, 0, 0.4)',
      glow: '0 0 20px rgba(255, 152, 0, 0.6)',
    },
    purple: {
      sm: '0 4px 12px rgba(123, 31, 162, 0.2)',
      md: '0 8px 24px rgba(123, 31, 162, 0.3)',
      lg: '0 12px 40px rgba(123, 31, 162, 0.4)',
      glow: '0 0 20px rgba(123, 31, 162, 0.6)',
    },
    navy: {
      sm: '0 4px 12px rgba(0, 62, 92, 0.5)',
      md: '0 8px 24px rgba(0, 62, 92, 0.7)',
      lg: '0 12px 40px rgba(0, 62, 92, 0.9)',
    },
  },
};

// Helper function to get rgba with custom alpha
export const rgba = (color: string, alpha: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Export default for easy importing
export default colors;
