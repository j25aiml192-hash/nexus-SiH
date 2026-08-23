import { useNexusStore } from '@/store/nexusStore';

export function useToast() {
  const addToast = useNexusStore((s) => s.addToast);
  const removeToast = useNexusStore((s) => s.removeToast);

  return {
    showSuccess: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'success', title, message, duration }),
    showError: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'error', title, message, duration }),
    showWarning: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'warning', title, message, duration }),
    showInfo: (title: string, message?: string, duration?: number) =>
      addToast({ type: 'info', title, message, duration }),
    removeToast,
  };
}
