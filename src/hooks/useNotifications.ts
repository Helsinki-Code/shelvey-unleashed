import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, any>;
  read: boolean;
  created_at: string;
}

// Better notification sound (multi-tone alert)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQwbfZvk62hRBAZOmeTniF8YAytxqOb/knMbCRpvouj/lnccChRpn+X/mXofCxNmnuT/mnocChNlneP/mnkcChRlnOP/m3gcChVkm+L/nHgbCxZjmuH/nXgaCxdjmeD/nncZCxhjl9//n3cYDBliht7/oHcXDBphlN3/oXYWDBthk9z/onUVDRxgkdv/o3QUDRxfkNr/pHMTDh1ejtn/pXISDisscbP/';

// Urgent escalation sound (higher pitch)
const ESCALATION_SOUND = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YWoGAAB/f39/f39/gICAgICAgH9/f39/gICAgH9/f39/gICAgH9/f39/gICAf39/f39/gICAgH9/f39/gICAgIB/f39/gIB/f3+AgICAf39/f39/gICAgH9/f39/gICAgH9/f39/gICA';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const escalationAudioRef = useRef<HTMLAudioElement | null>(null);
  const notificationPermissionRef = useRef<NotificationPermission>('default');

  // Initialize audio and request notification permission
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
    
    escalationAudioRef.current = new Audio(ESCALATION_SOUND);
    escalationAudioRef.current.volume = 0.7;

    if ('Notification' in window) {
      notificationPermissionRef.current = Notification.permission;
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          notificationPermissionRef.current = permission;
        });
      }
    }
  }, []);

  const playNotificationSound = useCallback((isUrgent = false) => {
    const audio = isUrgent ? escalationAudioRef.current : audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string, isUrgent = false) => {
    if ('Notification' in window && notificationPermissionRef.current === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: isUrgent ? 'shelvey-urgent' : 'shelvey-notification',
        requireInteraction: isUrgent,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      if (!isUrgent) {
        setTimeout(() => notification.close(), 5000);
      }
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n: any) => !n.read).length);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
          
          // Urgent types get special treatment
          const urgentTypes = ['escalation', 'escalation_to_human', 'critical_blocker'];
          const importantTypes = ['phase_completed', 'phase_started', 'deliverable_review', 'deliverable_approved', 'deliverable_rejected'];
          
          if (urgentTypes.includes(newNotification.type)) {
            playNotificationSound(true);
            showBrowserNotification(newNotification.title, newNotification.message, true);
          } else if (importantTypes.includes(newNotification.type)) {
            playNotificationSound(false);
            showBrowserNotification(newNotification.title, newNotification.message, false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, playNotificationSound, showBrowserNotification]);

  // Subscribe to escalations that need human attention
  useEffect(() => {
    if (!user) return;

    const escalationChannel = supabase
      .channel('escalation-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'escalations',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const escalation = payload.new as any;
          // Alert when escalated to human
          if (escalation?.current_handler_type === 'human' && escalation?.status === 'open') {
            playNotificationSound(true);
            showBrowserNotification(
              '🚨 Escalation Needs Your Attention',
              `${escalation.created_by_agent_name}: ${escalation.issue_description?.substring(0, 100)}...`,
              true
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(escalationChannel);
    };
  }, [user, playNotificationSound, showBrowserNotification]);

  // Subscribe to deliverables ready for review
  useEffect(() => {
    if (!user) return;

    const deliverableChannel = supabase
      .channel('deliverable-alerts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'phase_deliverables',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deliverable = payload.new as any;
          const oldDeliverable = payload.old as any;
          
          // Alert when deliverable moves to review status
          if (deliverable?.status === 'review' && oldDeliverable?.status !== 'review') {
            playNotificationSound(false);
            showBrowserNotification(
              '📋 Deliverable Ready for Review',
              `"${deliverable.name}" is ready for your review`,
              false
            );
          }
          
          // Alert when deliverable is approved by CEO and needs user approval
          if (deliverable?.ceo_approved && !deliverable?.user_approved && !oldDeliverable?.ceo_approved) {
            playNotificationSound(false);
            showBrowserNotification(
              '✅ CEO Approved - Your Turn',
              `"${deliverable.name}" was approved by CEO and needs your final approval`,
              false
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(deliverableChannel);
    };
  }, [user, playNotificationSound, showBrowserNotification]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = async (notificationId: string) => {
    await supabase.from('notifications').delete().eq('id', notificationId);

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
    playNotificationSound,
  };
};
