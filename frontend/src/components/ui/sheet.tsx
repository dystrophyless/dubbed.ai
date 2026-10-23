import * as Dialog from '@radix-ui/react-dialog'
import type { ComponentProps, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './button'

export interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  closeLabel: string
  description: string
  children: ReactNode
  onCloseAutoFocus?: ComponentProps<typeof Dialog.Content>['onCloseAutoFocus']
}

export function Sheet({
  open,
  onOpenChange,
  title,
  closeLabel,
  description,
  children,
  onCloseAutoFocus,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content className="sheet-content" onCloseAutoFocus={onCloseAutoFocus}>
          <div className="sheet-heading">
            <Dialog.Title className="sheet-title">{title}</Dialog.Title>
            <Dialog.Description className="visually-hidden">
              {description}
            </Dialog.Description>
            <Dialog.Close asChild>
              <Button
                className="sheet-close"
                variant="ghost"
                size="icon"
                aria-label={closeLabel}
              >
                <X aria-hidden="true" strokeWidth={1.1} />
              </Button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
