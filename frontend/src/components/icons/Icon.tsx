import {
  ArrowLeft, ArrowRight, AudioLines, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleAlert, CircleCheck,
  CircleHelp, Clapperboard, Clock, Coins, CreditCard, Download, Ellipsis, Eye, EyeOff, FileVideo, FolderOpen, Globe,
  Headphones, History, House, ImageOff, Info, Languages, LoaderCircle, Lock, LogOut, Mail, Menu, Mic, MicOff, Minus,
  Pause, Pencil, Play, Plus, RefreshCw, RotateCcw, Scissors, Search, Settings, SkipBack, SkipForward, Sparkles, Square,
  Trash2, TriangleAlert, Upload, User, Volume1, Volume2, VolumeX, Wallet, X, type LucideIcon,
} from "lucide-react";

/*
 * Icons — Lucide only, through this semantic dictionary (design-system/foundations.md → Icons).
 * Drawn at 16px (14px small) with an absolute 1.3px stroke: the median stroke of the Clean pack's own 16px icons
 * (design-system/audit.md §12). Decorative by default (aria-hidden); pass `label` for a meaningful standalone icon.
 */
export const ICONS = {
  // navigation
  back: ArrowLeft, forward: ArrowRight, prev: ChevronLeft, next: ChevronRight, expand: ChevronDown, collapse: ChevronUp,
  close: X, menu: Menu, more: Ellipsis, home: House, exit: ArrowLeft,
  // actions
  add: Plus, edit: Pencil, delete: Trash2, download: Download, upload: Upload, search: Search, retry: RotateCcw,
  refresh: RefreshCw, check: Check, minus: Minus, show: Eye, hide: EyeOff, trim: Scissors,
  // media & recording
  play: Play, pause: Pause, record: Mic, micOff: MicOff, stop: Square, rewind: SkipBack, skip: SkipForward,
  volume: Volume2, volumeLow: Volume1, mute: VolumeX, headphones: Headphones, waveform: AudioLines, video: FileVideo,
  scene: Clapperboard, noPoster: ImageOff,
  // domain
  credits: Coins, purchase: CreditCard, wallet: Wallet, history: History, projects: FolderOpen, duration: Clock,
  magic: Sparkles,
  // account
  user: User, settings: Settings, signOut: LogOut, email: Mail, password: Lock, language: Languages, globe: Globe,
  // status
  info: Info, success: CircleCheck, warning: TriangleAlert, error: CircleAlert, help: CircleHelp, loading: LoaderCircle,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export type IconProps = {
  name: IconName;
  size?: 12 | 14 | 16 | 20 | 24;
  /** Accessible name; without it the icon is decorative */
  label?: string;
  className?: string;
};

export function Icon({ name, size = 16, label, className }: IconProps) {
  const Cmp = ICONS[name];
  return (
    <Cmp
      size={size}
      strokeWidth={1.3}
      absoluteStrokeWidth
      className={className}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
    />
  );
}
