(function (root, factory) {
  const api = factory();
  root.Embervale = root.Embervale || {};
  root.Embervale.ICONS = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  const SVG_DEFS = {
    hp_potion: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-hp" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#ef4444" flood-opacity="0.5"/>
        </filter>
        <ellipse cx="16" cy="28" rx="8" ry="2" fill="#000" opacity="0.35"/>
        <rect x="14" y="4" width="4" height="4" rx="1" fill="#a16207" stroke="#713f12" stroke-width="0.8"/>
        <path d="M13 8h6v3a6 6 0 0 1-1 3.2l.4.5a8 8 0 1 1-8.8 0l.4-.5A6 6 0 0 1 13 11V8z" fill="#1e293b" stroke="#475569" stroke-width="1.2"/>
        <path d="M10 17c1.5-1 3.5 0 6-1 2.5 1 4 0 5 1a7 7 0 0 1-11 5.8V17z" fill="#ef4444" filter="url(#glow-hp)"/>
        <path d="M10.5 18c1.5-.8 3.2 0 5.5-.8s3.5 0 4.5.8c.8 1.8.8 4-.2 5.5-1.5 2-4.5 2.5-6.5 1-1.8-1.2-2.5-3.5-1.8-5.5z" fill="#f87171" opacity="0.9"/>
        <circle cx="13" cy="20" r="1" fill="#fff" opacity="0.8"/>
        <circle cx="17.5" cy="18.5" r="0.7" fill="#fff" opacity="0.9"/>
        <path d="M12 11c0 2-1 3.5-1 5" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
      </svg>
    `,

    mp_potion: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-mp" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#3b82f6" flood-opacity="0.6"/>
        </filter>
        <ellipse cx="16" cy="28" rx="7" ry="2" fill="#000" opacity="0.35"/>
        <rect x="14.5" y="3" width="3" height="4" rx="0.8" fill="#cbd5e1" stroke="#94a3b8" stroke-width="0.8"/>
        <path d="M14 7h4v5l2 3v10a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3V15l2-3V7z" fill="#0f172a" stroke="#60a5fa" stroke-width="1.2"/>
        <path d="M13 16c1-.6 2 0 3-.6 1 .6 2 0 3 .6v8a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-8z" fill="#2563eb" filter="url(#glow-mp)"/>
        <path d="M13.5 17c.8-.5 1.8 0 2.5-.5s1.8 0 2.5.5v6.5a1.5 1.5 0 0 1-1.5 1.5h-2a1.5 1.5 0 0 1-1.5-1.5V17z" fill="#60a5fa" opacity="0.85"/>
        <circle cx="15" cy="19" r="0.8" fill="#fff" opacity="0.9"/>
        <circle cx="16.5" cy="22" r="0.6" fill="#fff" opacity="0.8"/>
        <path d="M13.5 9v5" stroke="#fff" stroke-width="0.8" stroke-linecap="round" opacity="0.45"/>
      </svg>
    `,

    greater_hp: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-ghp" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#dc2626" flood-opacity="0.7"/>
        </filter>
        <ellipse cx="16" cy="28.5" rx="9" ry="2.5" fill="#000" opacity="0.4"/>
        <polygon points="16,3 18.5,5.5 16,8 13.5,5.5" fill="#fbbf24" stroke="#d97706" stroke-width="0.8"/>
        <rect x="13" y="7" width="6" height="3" rx="0.5" fill="#d97706"/>
        <path d="M13 10h6l4 5-2 10-5 3-5-3-2-10 4-5z" fill="#1e1b4b" stroke="#f59e0b" stroke-width="1.2"/>
        <path d="M12 16l4-1 4 1 1.5 7.5-3.5 2-4-2L12 16z" fill="#b91c1c" filter="url(#glow-ghp)"/>
        <path d="M13 17.5l3-.8 3 .8 1 5.5-2.5 1.5-3-1.5-1.5-5.5z" fill="#ef4444" opacity="0.9"/>
        <polygon points="16,18 17,21 16,24 15,21" fill="#fca5a5" opacity="0.8"/>
        <circle cx="14" cy="19" r="0.8" fill="#fff"/>
        <path d="M12.5 12l-2 3.5" stroke="#fff" stroke-width="0.8" stroke-linecap="round" opacity="0.5"/>
      </svg>
    `,

    berserk_tonic: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-tonic" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#f97316" flood-opacity="0.8"/>
        </filter>
        <ellipse cx="16" cy="28" rx="8" ry="2" fill="#000" opacity="0.35"/>
        <path d="M12 4l4-2 4 2-1 3h-6l-1-3z" fill="#78350f" stroke="#b45309" stroke-width="0.8"/>
        <path d="M13 7h6l2 4 3 6-2 8a3 3 0 0 1-3 2h-6a3 3 0 0 1-3-2l-2-8 3-6 2-4z" fill="#27180e" stroke="#ea580c" stroke-width="1.2"/>
        <path d="M11 17l5-2 5 2-1 6-4 1.5-4-1.5-1-6z" fill="#d97706" filter="url(#glow-tonic)"/>
        <path d="M12 18.5l4-1.5 4 1.5-.8 4.5-3.2 1-3.2-1-.8-4.5z" fill="#f59e0b"/>
        <!-- flame crest -->
        <path d="M16 11c1 1.5.5 3 0 4-.5-1-1.5-1.5-1.5-2.5 0-1 1-1.5 1.5-1.5z" fill="#fef08a"/>
      </svg>
    `,

    elixir: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-elixir" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#fbbf24" flood-opacity="0.9"/>
        </filter>
        <ellipse cx="16" cy="29" rx="8" ry="2" fill="#000" opacity="0.4"/>
        <!-- Sun stopper -->
        <circle cx="16" cy="5" r="3" fill="#fef08a" stroke="#d97706" stroke-width="0.8"/>
        <path d="M16 1v2M16 7v2M12 5h2M18 5h2" stroke="#d97706" stroke-width="0.8" stroke-linecap="round"/>
        <!-- Ornate golden vessel -->
        <path d="M14 8h4l1 3 4 3v7l-3 5-4 1-4-1-3-5v-7l4-3 1-3z" fill="#3b2005" stroke="#fbbf24" stroke-width="1.3"/>
        <path d="M13 14l3-1 3 1 2 4-2 4-3 1-3-1-2-4 2-4z" fill="#f59e0b" filter="url(#glow-elixir)"/>
        <path d="M14 15l2-.7 2 .7 1.2 2.8-1.2 2.8-2 .7-2-.7-1.2-2.8L14 15z" fill="#fef08a" opacity="0.95"/>
        <polygon points="16,16 17,18.5 16,21 15,18.5" fill="#fff"/>
      </svg>
    `,

    rusty_shortsword: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="16" cy="29" rx="8" ry="2" fill="#000" opacity="0.3"/>
        <g transform="rotate(45 16 16)">
          <!-- Blade -->
          <path d="M15 3l1-2 1 2v17h-2V3z" fill="#94a3b8" stroke="#475569" stroke-width="0.8"/>
          <path d="M15.8 4v15" stroke="#64748b" stroke-width="0.7"/>
          <!-- Rust marks -->
          <circle cx="15.5" cy="8" r="0.8" fill="#b45309"/>
          <circle cx="16.5" cy="14" r="0.9" fill="#9a3412"/>
          <!-- Guard -->
          <rect x="11" y="20" width="10" height="2.2" rx="0.8" fill="#475569" stroke="#334155" stroke-width="0.6"/>
          <!-- Grip -->
          <rect x="14.5" y="22.2" width="3" height="5" rx="0.5" fill="#78350f" stroke="#451a03" stroke-width="0.6"/>
          <!-- Pommel -->
          <circle cx="16" cy="28.5" r="1.8" fill="#64748b" stroke="#334155" stroke-width="0.6"/>
        </g>
      </svg>
    `,

    oaksteel_blade: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-oak" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" flood-color="#4ade80" flood-opacity="0.6"/>
        </filter>
        <ellipse cx="16" cy="29" rx="8" ry="2" fill="#000" opacity="0.3"/>
        <g transform="rotate(45 16 16)">
          <!-- Leaf-shaped blade -->
          <path d="M16 1c1.5 4 2.2 10 1.2 18h-2.4C13.8 11 14.5 5 16 1z" fill="#cbd5e1" stroke="#22c55e" stroke-width="1" filter="url(#glow-oak)"/>
          <path d="M16 2v16" stroke="#4ade80" stroke-width="0.8"/>
          <!-- Oak leaf crossguard -->
          <path d="M10 19c2 1 4 0 6 1 2-1 4 0 6-1 0 1.5-1 2.5-2 2.5H12c-1 0-2-1-2-2.5z" fill="#92400e" stroke="#78350f" stroke-width="0.8"/>
          <circle cx="16" cy="20" r="1.2" fill="#22c55e"/>
          <!-- Grip -->
          <rect x="14.5" y="22.5" width="3" height="5" rx="0.5" fill="#451a03"/>
          <line x1="14.5" y1="24" x2="17.5" y2="25" stroke="#fbbf24" stroke-width="0.6"/>
          <line x1="14.5" y1="26" x2="17.5" y2="27" stroke="#fbbf24" stroke-width="0.6"/>
          <!-- Pommel -->
          <polygon points="16,27.5 17.8,29.5 16,31 14.2,29.5" fill="#f59e0b" stroke="#b45309" stroke-width="0.6"/>
        </g>
      </svg>
    `,

    mossfang_sabre: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-moss" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.8" flood-color="#38bdf8" flood-opacity="0.7"/>
        </filter>
        <ellipse cx="16" cy="29" rx="8" ry="2" fill="#000" opacity="0.3"/>
        <g transform="rotate(45 16 16)">
          <!-- Curved scimitar blade -->
          <path d="M17 1c-1 5 1 12 1 18h-2.5c0-6-1.5-12 1.5-18z" fill="#e0f2fe" stroke="#0284c7" stroke-width="1" filter="url(#glow-moss)"/>
          <path d="M17 3c.5 4 .5 10-.5 15" stroke="#38bdf8" stroke-width="0.9"/>
          <!-- Backfang serration -->
          <polygon points="17.5,7 19.5,8.5 17.5,9.5" fill="#0284c7"/>
          <polygon points="17.5,11 19.5,12.5 17.5,13.5" fill="#0284c7"/>
          <!-- Curved guard -->
          <path d="M11 19c2 1.5 5 0 7 0s3 1.5 4 0c0 1.5-1 2.5-2 2.5h-7c-1 0-2-1-2-2.5z" fill="#0f766e" stroke="#134e4a" stroke-width="0.8"/>
          <!-- Grip -->
          <rect x="14.5" y="21.5" width="3" height="5.5" rx="0.5" fill="#1e293b"/>
          <!-- Pommel fang -->
          <circle cx="16" cy="28.5" r="1.8" fill="#38bdf8" stroke="#0284c7" stroke-width="0.7"/>
        </g>
      </svg>
    `,

    runed_halberd: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-rune" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#60a5fa" flood-opacity="0.8"/>
        </filter>
        <ellipse cx="16" cy="29" rx="8" ry="2" fill="#000" opacity="0.3"/>
        <g transform="rotate(45 16 16)">
          <!-- Pole shaft -->
          <rect x="15" y="6" width="2" height="24" rx="0.5" fill="#78350f" stroke="#451a03" stroke-width="0.6"/>
          <!-- Spear point -->
          <polygon points="16,0 17.8,7 14.2,7" fill="#cbd5e1" stroke="#3b82f6" stroke-width="0.9" filter="url(#glow-rune)"/>
          <!-- Crescent axe blade on right -->
          <path d="M17 5c3-1 7 1 8 4-1 3-5 5-8 4v-8z" fill="#93c5fd" stroke="#2563eb" stroke-width="0.9"/>
          <!-- Back spike on left -->
          <polygon points="15,6 9,8 15,10" fill="#64748b" stroke="#334155" stroke-width="0.8"/>
          <!-- Glowing blue runes on blade -->
          <path d="M19 6l2 2-2 2M21 7h-2" stroke="#1d4ed8" stroke-width="0.8" stroke-linecap="round"/>
          <!-- Socket collar -->
          <rect x="14" y="6.5" width="4" height="2" rx="0.4" fill="#fbbf24"/>
        </g>
      </svg>
    `,

    dawnbreaker: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-dawn" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#fbbf24" flood-opacity="0.95"/>
        </filter>
        <ellipse cx="16" cy="29" rx="8" ry="2" fill="#000" opacity="0.3"/>
        <g transform="rotate(45 16 16)">
          <!-- Radiant golden greatsword blade -->
          <path d="M16 0l2 4v14l-2 1-2-1V4l2-4z" fill="#fef08a" stroke="#f59e0b" stroke-width="1" filter="url(#glow-dawn)"/>
          <!-- Glowing core fuller -->
          <path d="M16 3v13" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
          <!-- Sunburst crossguard -->
          <path d="M9 19l4-1 3 1.5 3-1.5 4 1-1 2.5-6-1-6 1-1-2.5z" fill="#d97706" stroke="#b45309" stroke-width="0.8"/>
          <circle cx="16" cy="19.5" r="1.6" fill="#fff" stroke="#f59e0b" stroke-width="0.8"/>
          <!-- Grip -->
          <rect x="14.8" y="21.5" width="2.4" height="6" rx="0.4" fill="#78350f"/>
          <!-- Sun pommel -->
          <circle cx="16" cy="29" r="2.2" fill="#fbbf24" stroke="#d97706" stroke-width="0.8"/>
          <circle cx="16" cy="29" r="1" fill="#fff"/>
        </g>
      </svg>
    `,

    traveler_tunic: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="16" cy="28.5" rx="9" ry="2.2" fill="#000" opacity="0.35"/>
        <!-- Linen tunic body -->
        <path d="M11 6l5-2 5 2 4 4-2 4-2-1v13H11V13l-2 1-2-4 4-4z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.1"/>
        <!-- Leather over-vest -->
        <path d="M12 9l4 2 4-2v11l-4 1-4-1V9z" fill="#78350f" stroke="#451a03" stroke-width="0.9"/>
        <!-- Belt & brass buckle -->
        <rect x="11" y="19" width="10" height="2.5" fill="#451a03"/>
        <rect x="14.5" y="18.5" width="3" height="3.5" rx="0.5" fill="#fbbf24" stroke="#d97706" stroke-width="0.6"/>
        <!-- V-neck shirt -->
        <polygon points="16,6 18,10 14,10" fill="#f8fafc"/>
      </svg>
    `,

    scout_leather: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-scout" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#22c55e" flood-opacity="0.4"/>
        </filter>
        <ellipse cx="16" cy="28.5" rx="9" ry="2.2" fill="#000" opacity="0.35"/>
        <!-- Forest green leather armor -->
        <path d="M10 6l6-2 6 2 4 3-2 4-2-1v14H10V12l-2 1-2-4 4-3z" fill="#15803d" stroke="#166534" stroke-width="1.1" filter="url(#glow-scout)"/>
        <!-- Layered pauldrons -->
        <path d="M8 8c2-2 5-1 5 1l-4 3c-1-1-1.5-2.5-1-4zM24 8c-2-2-5-1-5 1l4 3c1-1 1.5-2.5 1-4z" fill="#854d0e"/>
        <!-- Crossed straps & studs -->
        <line x1="12" y1="10" x2="20" y2="18" stroke="#78350f" stroke-width="1.2"/>
        <line x1="20" y1="10" x2="12" y2="18" stroke="#78350f" stroke-width="1.2"/>
        <circle cx="16" cy="14" r="1.3" fill="#fbbf24"/>
        <!-- Studded belt -->
        <rect x="10" y="20" width="12" height="2.5" fill="#451a03"/>
        <circle cx="12" cy="21.2" r="0.7" fill="#fbbf24"/>
        <circle cx="16" cy="21.2" r="0.7" fill="#fbbf24"/>
        <circle cx="20" cy="21.2" r="0.7" fill="#fbbf24"/>
      </svg>
    `,

    ironbound_mail: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-iron" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#38bdf8" flood-opacity="0.4"/>
        </filter>
        <ellipse cx="16" cy="28.5" rx="9" ry="2.2" fill="#000" opacity="0.35"/>
        <!-- Hauberk shape -->
        <path d="M10 6l6-2 6 2 5 4-3 4-2-1v13H10V13l-2 1-3-4 5-4z" fill="#475569" stroke="#334155" stroke-width="1.1"/>
        <!-- Reinforced steel breastplate chevron -->
        <path d="M12 9l4 2 4-2 1 8-5 4-5-4 1-8z" fill="#94a3b8" stroke="#cbd5e1" stroke-width="1" filter="url(#glow-iron)"/>
        <!-- Center crest line -->
        <line x1="16" y1="11" x2="16" y2="18" stroke="#f1f5f9" stroke-width="1"/>
        <!-- Rivets -->
        <circle cx="13.5" cy="11" r="0.7" fill="#f8fafc"/>
        <circle cx="18.5" cy="11" r="0.7" fill="#f8fafc"/>
        <circle cx="14" cy="17" r="0.7" fill="#f8fafc"/>
        <circle cx="18" cy="17" r="0.7" fill="#f8fafc"/>
        <!-- Steel belt -->
        <rect x="10" y="21" width="12" height="2.5" fill="#1e293b" stroke="#64748b" stroke-width="0.6"/>
      </svg>
    `,

    emberplate_aegis: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-aegis" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#f97316" flood-opacity="0.8"/>
        </filter>
        <ellipse cx="16" cy="28.5" rx="9" ry="2.2" fill="#000" opacity="0.4"/>
        <!-- Obsidian heavy cuirass -->
        <path d="M10 6l6-2 6 2 5 4-3 4-2-1v14H10V13l-2 1-3-4 5-4z" fill="#1c1917" stroke="#78350f" stroke-width="1.2"/>
        <!-- Spiked flame pauldrons -->
        <polygon points="6,9 11,6 10,12" fill="#ea580c"/>
        <polygon points="26,9 21,6 22,12" fill="#ea580c"/>
        <!-- Molten chestplate -->
        <path d="M12 9l4 2 4-2 1.5 8-5.5 5-5.5-5 1.5-8z" fill="#292524" stroke="#f97316" stroke-width="1.2" filter="url(#glow-aegis)"/>
        <!-- Phoenix magma veins -->
        <path d="M16 11l-3 4 3 2 3-2-3-4z" fill="#ef4444"/>
        <path d="M16 13l-1.5 2 1.5 1 1.5-1-1.5-2z" fill="#fde047"/>
        <line x1="16" y1="16" x2="16" y2="23" stroke="#f97316" stroke-width="1.2"/>
        <line x1="13" y1="18" x2="15" y2="21" stroke="#f97316" stroke-width="0.8"/>
        <line x1="19" y1="18" x2="17" y2="21" stroke="#f97316" stroke-width="0.8"/>
      </svg>
    `,

    copper_band: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="16" cy="27" rx="8" ry="2" fill="#000" opacity="0.3"/>
        <!-- Ring band -->
        <ellipse cx="16" cy="16" rx="10" ry="8" fill="#7c2d12" stroke="#ea580c" stroke-width="1"/>
        <ellipse cx="16" cy="16" rx="7.2" ry="5.5" fill="#0f172a"/>
        <!-- Top shine -->
        <path d="M9 13c2-2.5 5-4 7-4s5 1.5 7 4" stroke="#fdba74" stroke-width="1.6" stroke-linecap="round"/>
        <!-- Engraved spiral motif -->
        <circle cx="16" cy="8.5" r="1.2" fill="#f97316"/>
      </svg>
    `,

    ember_ring: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-ember-ring" x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#ef4444" flood-opacity="0.85"/>
        </filter>
        <ellipse cx="16" cy="27" rx="8" ry="2" fill="#000" opacity="0.3"/>
        <!-- Gold ring band -->
        <ellipse cx="16" cy="18" rx="9" ry="7" fill="#78350f" stroke="#fbbf24" stroke-width="1.2"/>
        <ellipse cx="16" cy="18" rx="6.5" ry="5" fill="#0f172a"/>
        <!-- Faceted ruby setting -->
        <polygon points="16,6 20.5,10 16,14 11.5,10" fill="#dc2626" stroke="#f87171" stroke-width="0.8" filter="url(#glow-ember-ring)"/>
        <polygon points="16,8 18.5,10 16,12 13.5,10" fill="#ef4444"/>
        <circle cx="15.5" cy="9.5" r="0.8" fill="#fff"/>
      </svg>
    `,

    windstrider_charm: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-wind" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.8" flood-color="#38bdf8" flood-opacity="0.7"/>
        </filter>
        <ellipse cx="16" cy="28" rx="7" ry="2" fill="#000" opacity="0.3"/>
        <!-- Silver chain cord -->
        <path d="M8 4c4 6 7 10 8 10s4-4 8-10" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round"/>
        <!-- Talisman ring -->
        <circle cx="16" cy="15" r="3" fill="#1e293b" stroke="#38bdf8" stroke-width="1.2"/>
        <!-- Winged feather hanging down -->
        <path d="M16 16c2 3 4 8 0 13-4-5-2-10 0-13z" fill="#0284c7" stroke="#38bdf8" stroke-width="0.9" filter="url(#glow-wind)"/>
        <line x1="16" y1="16" x2="16" y2="28" stroke="#e0f2fe" stroke-width="0.8"/>
        <!-- Feather vanes -->
        <line x1="16" y1="20" x2="18.5" y2="22" stroke="#bae6fd" stroke-width="0.6"/>
        <line x1="16" y1="23" x2="18" y2="25" stroke="#bae6fd" stroke-width="0.6"/>
        <line x1="16" y1="21" x2="13.5" y2="23" stroke="#bae6fd" stroke-width="0.6"/>
      </svg>
    `,

    heart_of_vale: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <filter id="glow-heart" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#fbbf24" flood-opacity="0.95"/>
        </filter>
        <ellipse cx="16" cy="28.5" rx="8" ry="2" fill="#000" opacity="0.35"/>
        <!-- Golden filigree chain -->
        <path d="M10 3c3 5 5 8 6 8s3-3 6-8" stroke="#d97706" stroke-width="1.2"/>
        <!-- Living amber heart jewel -->
        <path d="M16 12c-2-3-6-3-7 0-1.5 4 4 9 7 13 3-4 8.5-9 7-13-1-3-5-3-7 0z" fill="#b45309" stroke="#fbbf24" stroke-width="1.4" filter="url(#glow-heart)"/>
        <path d="M16 14c-1.5-2-4.5-2-5.5 0-1 3 3 6.5 5.5 9.5 2.5-3 6.5-6.5 5.5-9.5-1-2-4-2-5.5 0z" fill="#fbbf24"/>
        <path d="M16 15c-1-1.5-3-1.5-3.5 0-.8 2 2 4.5 3.5 6.5 1.5-2 4.3-4.5 3.5-6.5-.5-1.5-2.5-1.5-3.5 0z" fill="#fef08a"/>
        <circle cx="14" cy="15" r="0.9" fill="#fff"/>
      </svg>
    `,

    // Empty slot placeholders
    weapon_empty: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.35">
        <g transform="rotate(45 16 16)">
          <path d="M15 4v16h2V4l-1-2-1 2z" fill="#64748b"/>
          <rect x="12" y="20" width="8" height="2" rx="0.5" fill="#64748b"/>
          <rect x="15" y="22" width="2" height="5" fill="#64748b"/>
          <circle cx="16" cy="28" r="1.5" fill="#64748b"/>
        </g>
      </svg>
    `,

    armor_empty: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.35">
        <path d="M11 6l5-2 5 2 4 4-2 4-2-1v12H11V13l-2 1-2-4 4-4z" fill="#64748b"/>
      </svg>
    `,

    accessory_empty: (s) => `
      <svg viewBox="0 0 32 32" width="${s}" height="${s}" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.35">
        <ellipse cx="16" cy="16" rx="9" ry="7" fill="#64748b"/>
        <ellipse cx="16" cy="16" rx="6.5" ry="5" fill="#0f172a"/>
      </svg>
    `
  };

  let svgFilterSeq = 0;

  function getItemSvg(itemId, size = 32) {
    const fn = SVG_DEFS[itemId];
    if (!fn) return SVG_DEFS.weapon_empty(size);
    const svg = fn(size);
    if (!svg.includes('filter id="')) return svg;
    const seq = ++svgFilterSeq;
    return svg.replace(/glow-([a-z-]+)/g, `glow-$1-${seq}`);
  }

  function getSlotPlaceholderSvg(slot, size = 28) {
    const fn = SVG_DEFS[`${slot}_empty`] || SVG_DEFS.weapon_empty;
    return fn(size);
  }

  // Canvas 2D direct drawer for in-game pickups and map rendering
  function drawItemCanvas(ctx, itemId, cx, cy, size = 20) {
    ctx.save();
    ctx.translate(cx, cy);
    const half = size * 0.5;

    if (itemId.includes("potion") || itemId === "greater_hp" || itemId === "elixir" || itemId === "berserk_tonic") {
      // Flask bottle
      const col = itemId === "hp_potion" ? "#ef4444"
        : itemId === "mp_potion" ? "#3b82f6"
        : itemId === "greater_hp" ? "#b91c1c"
        : itemId === "berserk_tonic" ? "#f97316"
        : "#fbbf24";

      // Glass body
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, 2, half * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-half * 0.22, -half * 0.1, half * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // Stopper neck
      ctx.fillStyle = itemId === "greater_hp" ? "#fbbf24" : "#78350f";
      ctx.fillRect(-half * 0.22, -half * 0.8, half * 0.44, half * 0.4);
    } else if (itemId.includes("blade") || itemId.includes("sabre") || itemId.includes("sword") || itemId === "dawnbreaker" || itemId.includes("halberd")) {
      // Slanted weapon blade
      ctx.rotate(Math.PI / 4);
      const bladeCol = itemId === "dawnbreaker" ? "#fbbf24"
        : itemId === "mossfang_sabre" ? "#38bdf8"
        : itemId === "oaksteel_blade" ? "#4ade80"
        : itemId === "runed_halberd" ? "#60a5fa"
        : "#cbd5e1";

      ctx.fillStyle = bladeCol;
      ctx.fillRect(-2, -half, 4, half * 1.5);
      // Crossguard
      ctx.fillStyle = "#d97706";
      ctx.fillRect(-half * 0.45, half * 0.45, half * 0.9, 2.5);
      // Grip
      ctx.fillStyle = "#451a03";
      ctx.fillRect(-1.5, half * 0.55, 3, half * 0.4);
    } else if (itemId.includes("tunic") || itemId.includes("leather") || itemId.includes("mail") || itemId.includes("aegis")) {
      // Armor vest
      const armorCol = itemId === "emberplate_aegis" ? "#f97316"
        : itemId === "ironbound_mail" ? "#94a3b8"
        : itemId === "scout_leather" ? "#16a34a"
        : "#3b82f6";
      ctx.fillStyle = armorCol;
      ctx.beginPath();
      ctx.roundRect(-half * 0.55, -half * 0.65, half * 1.1, half * 1.3, 3);
      ctx.fill();
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-half * 0.3, -half * 0.05, half * 0.6, 2);
    } else {
      // Ring / amulet
      const gemCol = itemId === "heart_of_vale" ? "#fbbf24"
        : itemId === "ember_ring" ? "#ef4444"
        : itemId === "windstrider_charm" ? "#38bdf8"
        : "#f97316";
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 1, half * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = gemCol;
      ctx.beginPath();
      ctx.arc(0, -half * 0.4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  return {
    getItemSvg,
    getSlotPlaceholderSvg,
    drawItemCanvas
  };
});
