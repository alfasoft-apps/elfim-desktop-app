/** Next.js `cart.utils` ilə eyni məntiq — yalnız localStorage səbəti. */

export interface CartItem {
  id: string | number;
  name?: string;
  slug?: string;
  image?: string;
  price: number;
  quantity?: number;
  stock?: number;
  [key: string]: unknown;
}

export interface CartState {
  items: CartItem[];
  isEmpty: boolean;
  totalItems: number;
  totalUniqueItems: number;
  total: number;
}

export const emptyCartState = (): CartState => ({
  items: [],
  isEmpty: true,
  totalItems: 0,
  totalUniqueItems: 0,
  total: 0,
});

/** API JSON bəzən id-ni string qaytarır — müqayisə üçün normallaşdırır. */
export function cartIdsEqual(a: string | number, b: string | number): boolean {
  return Number(a) === Number(b);
}

export function addItemWithQuantity(items: CartItem[] = [], item: CartItem, quantity: number) {
  if (quantity <= 0) throw new Error("cartQuantity can't be zero or less than zero");
  const existingItemIndex = items.findIndex((existingItem) => cartIdsEqual(existingItem.id, item.id));
  if (existingItemIndex > -1) {
    const newItems = [...items];
    newItems[existingItemIndex].quantity = (newItems[existingItemIndex].quantity ?? 0) + quantity;
    return newItems;
  }
  return [...items, { ...item, quantity }];
}

export function updateItemWithQuantity(items: CartItem[] = [], item: CartItem, quantity: number) {
  if (quantity <= 0) throw new Error("cartQuantity can't be zero or less than zero");
  const existingItemIndex = items.findIndex((existingItem) => cartIdsEqual(existingItem.id, item.id));
  if (existingItemIndex > -1) {
    const newItems = [...items];
    newItems[existingItemIndex].quantity = quantity;
    return newItems;
  }
  return [...items, { ...item, quantity }];
}

export function removeItemOrQuantity(items: CartItem[], id: CartItem['id'], quantity: number) {
  return items.reduce((acc: CartItem[], item) => {
    if (cartIdsEqual(item.id, id)) {
      const newQuantity = (item.quantity ?? 0) - quantity;
      return newQuantity > 0 ? [...acc, { ...item, quantity: newQuantity }] : acc;
    }
    return [...acc, item];
  }, []);
}

export function removeItem(items: CartItem[], id: CartItem['id']) {
  return items.filter((existingItem) => !cartIdsEqual(existingItem.id, id));
}

export function getItem(items: CartItem[], id: CartItem['id']) {
  return items.find((item) => cartIdsEqual(item.id, id));
}

export const calculateTotal = (items: CartItem[]) =>
  items.reduce((total, item) => total + (item.quantity ?? 0) * item.price, 0);

export const calculateTotalItems = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);

export const calculateUniqueItems = (items: CartItem[]) => items.length;

function generateFinalState(items: CartItem[]): CartState {
  const totalUniqueItems = calculateUniqueItems(items);
  return {
    items,
    totalItems: calculateTotalItems(items),
    totalUniqueItems,
    total: calculateTotal(items),
    isEmpty: totalUniqueItems === 0,
  };
}

export function applyCartItems(items: CartItem[]): CartState {
  return generateFinalState(items);
}
