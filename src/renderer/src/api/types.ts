/** API cavab modelləri (REST cavabları camelCase və ya snake_case ola bilər). */

export interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
  /** Bəzi endpointlər (məs. `banners`) əlavə `meta` qaytarır. */
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
}

export interface PaginatedProducts<T> {
  data: T[];
  meta?: PaginationMeta;
}

export interface ProductListItem {
  id: number;
  name?: string | null;
  slug?: string | null;
  cover?: string | null;
  unit_type?: string | null;
  price?: number | string | null;
  old_price?: number | string | null;
  /** false olduqda stokda yoxdur — səbətə əlavə olunmur (API). */
  stock_status?: boolean;
  /** Desktop keş / oflayn filtr (bundle). */
  shop_id?: number;
  product_type?: string | null;
  category_id_1?: number;
  category_id_2?: number;
  category_id_3?: number;
}

export interface CategoryItem {
  id: number;
  name?: string | null;
  slug?: string | null;
  icon?: string | null;
}

export interface ProductPartNumber {
  id: string | number;
  part_number?: string | null;
}

export interface ProductDetailsTableRow {
  make?: { name?: string | null };
  model?: { name?: string | null };
  generation?: { name?: string | null };
}

export interface ProductDetailDto {
  id: number;
  name?: string | null;
  slug?: string | null;
  price?: number | string | null;
  old_price?: number | string | null;
  information?: string | null;
  cover?: string | null;
  images?: { id: number; url?: string | null }[];
  shop?: { id: number; title?: string | null; slug?: string | null };
  unit_type?: string | null;
  stock_status?: boolean;
  part_numbers?: ProductPartNumber[];
  product_details_table?: ProductDetailsTableRow[];
}

export interface ProductDetailEnvelope {
  ProductInfo?: ProductDetailDto;
  SimilarProducts?: ProductListItem[];
  OtherProducts?: ProductListItem[];
}

export interface ShopListItem {
  id: number;
  shop_information_inline?: string | null;
  title?: string | null;
  slug?: string | null;
  logo?: string | null;
  cover?: string | null;
  product_count?: number;
  shop_type?: string | null;
}

export interface CartLine {
  id: number;
  name?: string | null;
  slug?: string | null;
  image?: string | null;
  stock?: boolean;
  price?: number | string;
  old_price?: number | string | null;
  quantity?: number;
  itemTotal?: number;
}

export interface CartPayload {
  items?: CartLine[];
  isEmpty?: boolean;
  totalItems?: number;
  total?: number | string;
}

export interface UserDto {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface OrderSummary {
  id: number;
  tracking_number?: string | null;
  amount?: number | string;
  created_at?: string | null;
  delivery_time?: string | null;
  status?: { name?: string | null; serial?: number; color?: string | null };
}

export interface OrderLine {
  id: number;
  name?: string | null;
  quantity?: number;
  price?: number | string;
}

export interface OrderDetail {
  id: number;
  total?: number | string;
  shipping_address?: string | null;
  note?: string | null;
  status?: OrderSummary['status'];
  products?: OrderLine[];
  created_at?: string | null;
}

export interface CompanyPhoneNumber {
  id: number;
  name?: string | null;
  phone_number?: string | null;
  position?: number;
}

/** `GET banners` — cavabın `meta` hissəsi. */
export interface BannersResponseMeta {
  has_new_special_offer_today?: boolean;
}

export interface BannersFetchResult {
  banners: BannerDto[];
  meta: BannersResponseMeta;
}

/** Promo banner (REST `banners`). */
export interface BannerDto {
  id: number;
  title?: string | null;
  content?: string | null;
  image?: string | null;
  link?: string | null;
  back_color?: string | null;
  text_color?: string | null;
  order?: number;
  status?: boolean;
}

/** `GET my-notifications` — tarix üzrə qruplaşdırılmış siyahı. */
export type NotificationsGroupedResponse = Record<string, NotificationRowDto[]>;

export interface NotificationRowDto {
  id?: string;
  type?: string;
  read_at?: string | null;
  created_at?: string | null;
  data?: {
    title?: string;
    desc?: string;
    url?: string;
    type?: string;
    [key: string]: unknown;
  };
}

export interface ProductGroupSection {
  title: string;
  items: ProductListItem[];
}

export interface CreateOrderPayload {
  address_id?: number | null;
  note?: string | null;
  leave_at_door?: boolean;
  products: { product_id: number; quantity: number }[];
}

export interface CreateOrderResult {
  success?: boolean;
  message?: string;
  order_id?: number;
}

export interface TeslaCarSpec {
  coil: string;
  subcoil?: string | null;
  displayLabel: string;
}
