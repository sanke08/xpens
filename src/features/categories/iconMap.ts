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
  ShoppingCart,
  Home,
  Lightbulb,
  HeartPulse,
  Plane,
  Briefcase,
  Gamepad2,
  LucideIcon,
} from "lucide-react-native";

const icons: Record<string, LucideIcon> = {
  pizza: Pizza,
  car: Car,
  "shopping-bag": ShoppingBag,
  receipt: Receipt,
  activity: Activity,
  banknote: Banknote,
  package: Package,
  "circle-dot": CircleDot,
  folder: Folder,
  category: Bookmark,
  "shopping-cart": ShoppingCart,
  home: Home,
  lightbulb: Lightbulb,
  "heart-pulse": HeartPulse,
  plane: Plane,
  briefcase: Briefcase,
  gamepad2: Gamepad2,
};

export const AVAILABLE_ICONS = Object.keys(icons);

export const getIcon = (name?: string): LucideIcon => {
  if (!name) return icons["circle-dot"];
  return icons[name.toLowerCase()] || icons["circle-dot"];
};
