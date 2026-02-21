'use client'

import * as React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

const ConfirmContext = React.createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>
}>({
  confirm: () => Promise.resolve(false),
})

interface ConfirmOptions {
  title?: string
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<ConfirmOptions>({})
  const resolveRef = React.useRef<(value: boolean) => void>(() => {})

  const confirm = React.useCallback((options: ConfirmOptions) => {
    setOptions(options)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      resolveRef.current(false)
    }
  }

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    resolveRef.current(true)
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    setOpen(false)
    resolveRef.current(false)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }} >
      {children}
      <AlertDialog open={open} onOpenChange={handleOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-slate-800">
              {options.title || '확인'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              {options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleCancel}
              className="border-slate-200 hover:bg-slate-50"
            >
              {options.cancelText || '취소'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={`${
                options.variant === 'destructive' 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {options.confirmText || '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = React.useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider')
  }
  return context
}
