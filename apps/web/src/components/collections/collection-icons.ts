import {
  Folder,
  FolderHeart,
  Star,
  FolderArchive,
  FolderClock,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  Watch,
  Headphones,
  Gamepad2,
  Camera,
  Tv,
  Cpu,
  HardDrive,
  Keyboard,
  Mouse,
  Speaker,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

// Predefined collection icons
export const COLLECTION_ICONS: { name: string; value: string; icon: LucideIcon }[] = [
  { name: 'Folder', value: 'folder', icon: Folder },
  { name: 'Heart', value: 'folder-heart', icon: FolderHeart },
  { name: 'Star', value: 'star', icon: Star },
  { name: 'Archive', value: 'folder-archive', icon: FolderArchive },
  { name: 'Clock', value: 'folder-clock', icon: FolderClock },
  { name: 'Monitor', value: 'monitor', icon: Monitor },
  { name: 'Laptop', value: 'laptop', icon: Laptop },
  { name: 'Smartphone', value: 'smartphone', icon: Smartphone },
  { name: 'Tablet', value: 'tablet', icon: Tablet },
  { name: 'Watch', value: 'watch', icon: Watch },
  { name: 'Headphones', value: 'headphones', icon: Headphones },
  { name: 'Gamepad', value: 'gamepad2', icon: Gamepad2 },
  { name: 'Camera', value: 'camera', icon: Camera },
  { name: 'TV', value: 'tv', icon: Tv },
  { name: 'CPU', value: 'cpu', icon: Cpu },
  { name: 'Storage', value: 'hard-drive', icon: HardDrive },
  { name: 'Keyboard', value: 'keyboard', icon: Keyboard },
  { name: 'Mouse', value: 'mouse', icon: Mouse },
  { name: 'Speaker', value: 'speaker', icon: Speaker },
  { name: 'WiFi', value: 'wifi', icon: Wifi },
];

// Get icon component by value
export function getCollectionIcon(iconValue?: string): LucideIcon {
  const found = COLLECTION_ICONS.find((i) => i.value === iconValue);
  return found?.icon || Folder;
}
