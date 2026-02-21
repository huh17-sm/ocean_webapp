"use client"

import { toast as sonnerToast } from "sonner"

interface ToastProps {
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success"
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastProps) => {
    const options = {
      description,
    }

    if (variant === "destructive") {
      sonnerToast.error(title, options)
    } else if (variant === "success") {
      sonnerToast.success(title, options)
    } else {
      sonnerToast(title, options)
    }
  }

  return { toast }
}
