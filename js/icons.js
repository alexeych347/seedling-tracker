'use strict';

/* Plant SVG icons. viewBox="0 0 40 40", transparent background, flat style.
   Usage: PLANT_ICONS[typeKey] → svg string ready for innerHTML. */
const PLANT_ICONS = {

  tomato: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="20" cy="26" r="12" fill="#E53935"/>
    <ellipse cx="14.5" cy="21" rx="4" ry="3" fill="white" opacity="0.15"/>
    <line x1="20" y1="7" x2="20" y2="14" stroke="#388E3C" stroke-width="2.5" stroke-linecap="round"/>
    <polygon points="20,9.5 21.2,12.4 24.3,12.6 21.9,14.6 22.7,17.6 20,16 17.4,17.6 18.1,14.6 15.7,12.6 18.8,12.4" fill="#4CAF50"/>
  </svg>`,

  cucumber: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="20" cy="22" rx="8" ry="15" fill="#43A047"/>
    <ellipse cx="20" cy="22" rx="3.5" ry="13" fill="#81C784" opacity="0.5"/>
    <ellipse cx="20" cy="8" rx="4" ry="3" fill="#2E7D32"/>
    <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FDD835"/>
    <ellipse cx="13.5" cy="19" rx="2.5" ry="4" fill="white" opacity="0.15"/>
  </svg>`,

  pepper: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M11 13 C8 17 8 25 10 30 C12 35 15 38 18 38.5 C19 39 21 39 22 38.5 C25 38 28 35 30 30 C32 25 32 17 29 13 Z" fill="#FF6D00"/>
    <line x1="15" y1="28" x2="14" y2="36" stroke="#E64A19" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <line x1="25" y1="28" x2="26" y2="36" stroke="#E64A19" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
    <ellipse cx="14" cy="21" rx="3.5" ry="5" fill="white" opacity="0.15"/>
    <rect x="18" y="5" width="4" height="8" rx="2" fill="#33691E"/>
    <path d="M14 12 Q17 9 20 12" stroke="#388E3C" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M26 12 Q23 9 20 12" stroke="#388E3C" stroke-width="2" fill="none" stroke-linecap="round"/>
  </svg>`,

  eggplant: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="20" cy="27" rx="10" ry="14" fill="#7B1FA2"/>
    <ellipse cx="14" cy="21" rx="3.5" ry="5" fill="white" opacity="0.12"/>
    <ellipse cx="20" cy="13" rx="10" ry="4" fill="#388E3C"/>
    <line x1="20" y1="6" x2="20" y2="13" stroke="#2E7D32" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,

  cabbage: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M4 23 C5 11 13 8 20 9 C27 8 35 11 36 23 C35 34 28 39 20 39 C12 39 5 34 4 23Z" fill="#2E7D32"/>
    <path d="M7 23 C8 14 14 11 20 12 C26 11 32 14 33 23 C31 32 26 37 20 37 C14 37 9 32 7 23Z" fill="#43A047"/>
    <ellipse cx="20" cy="24" rx="9" ry="8" fill="#C8E6C9"/>
    <ellipse cx="15.5" cy="20" rx="2.5" ry="2" fill="white" opacity="0.2"/>
  </svg>`,

  basil: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line x1="20" y1="38" x2="20" y2="26" stroke="#1B5E20" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="20" cy="17" rx="11" ry="13" fill="#2E7D32"/>
    <ellipse cx="10" cy="28" rx="9" ry="7" fill="#388E3C" transform="rotate(-30 10 28)"/>
    <ellipse cx="30" cy="28" rx="9" ry="7" fill="#388E3C" transform="rotate(30 30 28)"/>
    <ellipse cx="15.5" cy="13" rx="3.5" ry="5" fill="#81C784" opacity="0.4"/>
  </svg>`,

  zucchini: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="21" cy="22" rx="8" ry="16" fill="#558B2F" transform="rotate(12 21 22)"/>
    <ellipse cx="21" cy="22" rx="3" ry="14" fill="#7CB342" opacity="0.5" transform="rotate(12 21 22)"/>
    <ellipse cx="29" cy="9" rx="4" ry="3" fill="#33691E" transform="rotate(12 29 9)"/>
    <circle cx="12" cy="34" r="3" fill="#F9A825"/>
    <ellipse cx="16" cy="16" rx="2.5" ry="4" fill="white" opacity="0.15" transform="rotate(12 16 16)"/>
  </svg>`,

  carrot: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20 38 L11 13 Q20 8 29 13 Z" fill="#FF6D00"/>
    <path d="M20 38 L11 13 Q14 14 20 38Z" fill="#E65100" opacity="0.3"/>
    <ellipse cx="14" cy="18" rx="2.5" ry="4" fill="white" opacity="0.15"/>
    <line x1="17" y1="11" x2="12" y2="3" stroke="#43A047" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="20" y1="10" x2="20" y2="2" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="23" y1="11" x2="28" y2="3" stroke="#388E3C" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,

  beet: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="20" cy="27" r="12" fill="#880E4F"/>
    <ellipse cx="14.5" cy="22" rx="3.5" ry="2.5" fill="white" opacity="0.12"/>
    <ellipse cx="20" cy="10" rx="8" ry="6" fill="#4CAF50"/>
    <ellipse cx="13" cy="12" rx="5" ry="3.5" fill="#43A047" transform="rotate(-20 13 12)"/>
    <ellipse cx="27" cy="12" rx="5" ry="3.5" fill="#388E3C" transform="rotate(20 27 12)"/>
    <line x1="20" y1="16" x2="20" y2="20" stroke="#2E7D32" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  onion: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="20" cy="28" rx="13" ry="10" fill="#F57F17"/>
    <path d="M9 28 Q12 21 20 21 Q28 21 31 28" fill="#FDD835"/>
    <ellipse cx="13.5" cy="25" rx="3" ry="2" fill="white" opacity="0.2"/>
    <line x1="15" y1="19" x2="12" y2="6" stroke="#4CAF50" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="20" y1="18" x2="20" y2="4" stroke="#43A047" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="25" y1="19" x2="28" y2="6" stroke="#388E3C" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,

  radish: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="20" cy="25" r="12" fill="#E53935"/>
    <path d="M8 28 Q12 37 20 37 Q28 37 32 28Z" fill="#FAFAFA"/>
    <ellipse cx="14" cy="20" rx="3" ry="2.5" fill="white" opacity="0.2"/>
    <line x1="20" y1="37" x2="20" y2="39" stroke="#E53935" stroke-width="1.5" stroke-linecap="round"/>
    <ellipse cx="17" cy="11" rx="5" ry="4" fill="#4CAF50" transform="rotate(-15 17 11)"/>
  </svg>`,

  lettuce: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="20" cy="23" r="14" fill="#AED581"/>
    <circle cx="20" cy="23" r="9" fill="#C5E1A5"/>
    <path d="M6 22 C9 16 13 17 15 22 C17 16 20 15 22 22 C24 16 28 16 31 22" stroke="#66BB6A" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="14.5" cy="19" rx="3.5" ry="2.5" fill="white" opacity="0.2"/>
  </svg>`,

  dill: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line x1="20" y1="37" x2="20" y2="12" stroke="#388E3C" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="20" y1="28" x2="11" y2="20" stroke="#4CAF50" stroke-width="2" stroke-linecap="round"/>
    <line x1="20" y1="28" x2="29" y2="20" stroke="#4CAF50" stroke-width="2" stroke-linecap="round"/>
    <line x1="20" y1="20" x2="13" y2="14" stroke="#66BB6A" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="20" y1="20" x2="27" y2="14" stroke="#66BB6A" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="20" cy="9" r="5.5" fill="#FDD835"/>
    <circle cx="11" cy="19" r="3" fill="#81C784"/>
    <circle cx="29" cy="19" r="3" fill="#81C784"/>
    <circle cx="13" cy="13" r="2.5" fill="#A5D6A7"/>
    <circle cx="27" cy="13" r="2.5" fill="#A5D6A7"/>
  </svg>`,

  parsley: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line x1="20" y1="38" x2="20" y2="26" stroke="#558B2F" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="20" y1="26" x2="10" y2="17" stroke="#689F38" stroke-width="2" stroke-linecap="round"/>
    <line x1="20" y1="26" x2="20" y2="15" stroke="#689F38" stroke-width="2" stroke-linecap="round"/>
    <line x1="20" y1="26" x2="30" y2="17" stroke="#689F38" stroke-width="2" stroke-linecap="round"/>
    <circle cx="7.5" cy="14" r="3.5" fill="#7CB342"/>
    <circle cx="12" cy="11" r="3" fill="#8BC34A"/>
    <circle cx="14.5" cy="15.5" r="2.8" fill="#7CB342"/>
    <circle cx="17.5" cy="11.5" r="3" fill="#7CB342"/>
    <circle cx="22.5" cy="11.5" r="3" fill="#7CB342"/>
    <circle cx="20" cy="8" r="3.5" fill="#8BC34A"/>
    <circle cx="32.5" cy="14" r="3.5" fill="#7CB342"/>
    <circle cx="28" cy="11" r="3" fill="#8BC34A"/>
    <circle cx="25.5" cy="15.5" r="2.8" fill="#7CB342"/>
  </svg>`,

  strawberry: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M20 37 C13 32 6 26 8 17 C10 10 16 9 20 15 C24 9 30 10 32 17 C34 26 27 32 20 37Z" fill="#E53935"/>
    <ellipse cx="14" cy="20" rx="3.5" ry="3" fill="white" opacity="0.18"/>
    <circle cx="14" cy="26" r="1.2" fill="#FDD835" opacity="0.85"/>
    <circle cx="20" cy="29" r="1.2" fill="#FDD835" opacity="0.85"/>
    <circle cx="26" cy="26" r="1.2" fill="#FDD835" opacity="0.85"/>
    <circle cx="17" cy="20" r="1" fill="#FDD835" opacity="0.85"/>
    <circle cx="23" cy="20" r="1" fill="#FDD835" opacity="0.85"/>
    <path d="M14 13 Q17 8 20 13 Q23 8 26 13 Q20 10 14 13Z" fill="#43A047"/>
    <path d="M16 11 Q20 6 24 11" stroke="#4CAF50" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`,
};
