import { useCallback, useEffect, useRef } from 'react';

// Notification sound (base64 encoded short beep)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQwbfZ' +
  'vk62hRBAZOmeTniF8YAytxqOb/knMbCRpvouj/lnccChRpn+X/mXofCxNmnuT/mnocChNlneP/mnkcChRlnOP/m3gcChVkm+L/nHgbCxZjmuH/nXgaCxdjmeD/nncZCxhjl9//n3cYDBli' +
  'lt7/oHcXDBphlN3/oXYWDBthk9z/onUVDRxgkdv/o3QUDRxfkNr/pHMTDh1ejtn/pXISDisscbP/';

export const useNotificationAlerts = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    // Initialize audio element
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;

    // Check notification permission
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.log('Browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      permissionRef.current = 'granted';
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === 'granted';
    }

    return false;
  }, []);

  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(console.error);
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string, icon?: string) => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'shelvey-notification',
        requireInteraction: false,
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }, []);

  const triggerAlert = useCallback((
    title: string,
    message: string,
    options?: { sound?: boolean; browser?: boolean }
  ) => {
    const { sound = true, browser = true } = options || {};

    if (sound) {
      playSound();
    }

    if (browser && permissionRef.current === 'granted') {
      showBrowserNotification(title, message);
    }
  }, [playSound, showBrowserNotification]);

  return {
    requestPermission,
    triggerAlert,
    playSound,
    showBrowserNotification,
    hasPermission: permissionRef.current === 'granted',
  };
};
