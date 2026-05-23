import { HugeiconsIcon } from '@hugeicons/react';
import type { ComponentProps } from 'react';

export {
  Clock01Icon,
  Calendar03Icon,
  BarChartIcon,
  Analytics01Icon,
  Setting06Icon,
  Fire02Icon,
  Search01Icon,
  PlusSignIcon,
  Tick01Icon,
  LockIcon,
  SparklesIcon,
  Moon01Icon,
  Sun01Icon,
  Cancel01Icon,
  DragDropVerticalIcon,
  Coffee01Icon,
  Book01Icon,
  CodeIcon,
  GraduationScrollIcon,
  Briefcase01Icon,
  Dumbbell01Icon,
  Building03Icon,
  Notification01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  Refresh01Icon,
  FilterHorizontalIcon,
  AlertCircleIcon,
  Delete01Icon,
  CheckmarkCircle01Icon,
  FloppyDiskIcon,
  MoreVerticalIcon,
  Edit01Icon,
  ArrowLeft01Icon,
} from '@hugeicons/core-free-icons';

type HugeIconProps = ComponentProps<typeof HugeiconsIcon>;

interface IconProps extends Omit<HugeIconProps, 'size'> {
  size?: number;
}

export function Icon({ size = 18, strokeWidth = 1.5, ...props }: IconProps) {
  return (
    <HugeiconsIcon
      size={size}
      strokeWidth={strokeWidth}
      color="currentColor"
      {...props}
    />
  );
}
