/** Yan panel naviqasiyası (Azərbaycan dili). */
export type NavItem = {
  to: string;
  label: string;
  /** Yalnız çıxış edən müştəri görür (məs. «Daxil ol»). */
  guestOnly?: boolean;
  /** Yalnız giriş etmiş istifadəçi görür. */
  authOnly?: boolean;
};

export type NavSection = { heading: string; items: NavItem[] };

/**
 * Qruplar: Ümumi naviqasiya, Alış-veriş, Hesab.
 * «Sifariş tamamlandı» yalnız yönləndirmə səhifəsidir — menyuda göstərilmir.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Ümumi',
    items: [
      { to: '/', label: 'Əsas səhifə' },
      { to: '/search', label: 'Axtarış' },
      { to: '/shops', label: 'Mağazalar' },
      { to: '/catalog/brisk', label: 'Şam (BRISK)' },
      { to: '/catalog/tesla', label: 'Babin' },
      { to: '/contact', label: 'Əlaqə' },
      { to: '/special-offers', label: 'Xüsusi Təkliflər' },
    ],
  },
  {
    heading: 'Alış-veriş',
    items: [
      { to: '/cart', label: 'Səbət' },
      { to: '/checkout', label: 'Ödəniş', authOnly: true },
    ],
  },
  {
    heading: 'Hesab',
    items: [
      { to: '/signin', label: 'Daxil ol', guestOnly: true },
      { to: '/account', label: 'Hesab', authOnly: true },
      { to: '/notifications', label: 'Bildirişlər', authOnly: true },
      { to: '/account/orders', label: 'Sifarişlərim', authOnly: true },
      { to: '/account/profile', label: 'Profil parametrləri', authOnly: true },
    ],
  },
  {
    heading: 'Proqram',
    items: [{ to: '/settings', label: 'Parametrlər' }],
  },
];
