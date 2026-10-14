/**
 * Bookzee Design System Tokens
 * Hospitality-focused operational workspace for boutique hotels, resorts, and homestays.
 */

export const colors = {
  brand: {
    primary: '#0D5C56', // Deep Forest / Petrol Teal
    primaryHover: '#094440',
    primaryDark: '#073330',
    primaryLight: '#E8F3F1',
    secondary: '#164E63', // Deep Slate Cyan
    secondaryLight: '#EAF3F6',
    accent: '#C45532', // Warm Terracotta / Due Attention
    accentHover: '#A84323',
    accentLight: '#FAF0EB',
    sand: '#F2E9DB', // Soft Linen Sand
    sandMuted: '#E5DBCB',
  },
  surface: {
    page: '#F8F7F4', // Warm stone linen canvas
    panel: '#FFFFFF', // Clean surface panel
    card: '#FFFFFF',
    cardMuted: '#F3F0EA',
    subtle: '#FAF9F6', // Soft elevated background
    highlight: '#E8F3F1',
  },
  text: {
    primary: '#1A2B28', // Deepest charcoal with subtle pine undertone
    secondary: '#5C6E6B', // Muted slate pine
    muted: '#7E8F8C', // Accessible caption / helper text
    tertiary: '#8E9E9B',
    inverted: '#FFFFFF',
    accent: '#C45532',
  },
  border: {
    subtle: '#EAE5DC', // Light divider
    default: '#D8D2C5', // Standard card / input border
    main: '#D8D2C5',
    strong: '#C2BBB0', // Higher contrast border
  },
  semantic: {
    success: '#276749',
    successBg: '#EBF6EF',
    successBorder: '#BDDFC9',
    warning: '#B7791F',
    warningBg: '#FDF5E8',
    warningBorder: '#F5DCAD',
    danger: '#B84A4A',
    dangerBg: '#FDF0F0',
    dangerBorder: '#F7C6C6',
    info: '#2B6CB0',
    infoBg: '#EEF6FC',
    infoBorder: '#BEE3F8',
  },
  calendar: {
    stay: '#F0ECE4', // Neutral / soft surface for stays
    stayBorder: '#D8D2C5',
    stayText: '#1A2B28',
    selection: '#0D5C56',
    paymentDue: '#C45532',
    paymentDueBg: '#FAF0EB',
    checkedOut: '#8E9E9B',
    checkedOutBg: '#F2EFEA',
  }
};

export const radii = {
  input: '10px',
  button: '10px',
  card: '14px',
  dialog: '16px',
  badge: '9999px',
};

export const shadows = {
  subtle: '0 1px 2px rgba(20, 35, 30, 0.04)',
  card: '0 1px 3px rgba(20, 35, 30, 0.05), 0 1px 2px rgba(20, 35, 30, 0.03)',
  raised: '0 4px 12px -2px rgba(20, 35, 30, 0.08), 0 2px 6px -1px rgba(20, 35, 30, 0.04)',
  dialog: '0 16px 32px -8px rgba(20, 35, 30, 0.16), 0 8px 16px -4px rgba(20, 35, 30, 0.08)',
};
