import { 
  Pizza, 
  Car, 
  ShoppingBag, 
  Receipt, 
  Activity, 
  Banknote, 
  Package, 
  CircleDot, 
  Folder, 
  Bookmark,
  LucideIcon
} from 'lucide-react-native';

const icons: Record<string, LucideIcon> = {
  pizza: Pizza,
  car: Car,
  'shopping-bag': ShoppingBag,
  receipt: Receipt,
  activity: Activity,
  banknote: Banknote,
  package: Package,
  'circle-dot': CircleDot,
  folder: Folder,
  category: Bookmark,
};

export const getIcon = (name?: string): LucideIcon => {
  if (!name) return icons['circle-dot'];
  return icons[name.toLowerCase()] || icons['circle-dot'];
};
