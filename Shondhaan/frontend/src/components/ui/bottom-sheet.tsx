import * as React from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  contentClassName?: string;
}

/**
 * Reusable mobile bottom-sheet built on Vaul (drag-to-dismiss).
 * Use for Filter / Cart / Booking / Location pickers — instant native feel.
 */
const BottomSheet = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
}: BottomSheetProps) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className={cn(
          "max-h-[92vh] pb-[max(1rem,env(safe-area-inset-bottom))]",
          contentClassName
        )}
      >
        {(title || description) && (
          <DrawerHeader className="text-left">
            {title && <DrawerTitle>{title}</DrawerTitle>}
            {description && <DrawerDescription>{description}</DrawerDescription>}
          </DrawerHeader>
        )}
        <div className="overflow-y-auto px-4 pb-2">{children}</div>
        {footer && <DrawerFooter>{footer}</DrawerFooter>}
      </DrawerContent>
    </Drawer>
  );
};

export { BottomSheet, DrawerClose as BottomSheetClose };