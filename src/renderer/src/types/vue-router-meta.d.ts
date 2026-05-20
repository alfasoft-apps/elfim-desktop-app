import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** Server tərəfində fingerprint_token yanlış olanda — əsas nav gizlədilir. */
    licenseConfigLock?: boolean;
  }
}

export {};
