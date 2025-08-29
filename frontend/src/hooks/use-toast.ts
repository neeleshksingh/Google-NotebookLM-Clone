"use client"

import { toast as sonnerToast } from "sonner"

export function useToast() {
  return {
    success: (title: string, options?: { description?: string }) =>
      sonnerToast.success(title, { description: options?.description }),

    error: (title: string, options?: { description?: string }) =>
      sonnerToast.error(title, { description: options?.description }),

    info: (title: string, options?: { description?: string }) =>
      sonnerToast(title, { description: options?.description }),

    loading: (title: string, options?: { description?: string }) =>
      sonnerToast.loading(title, { description: options?.description }),
  }
}
