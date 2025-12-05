import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { 
  Bell, Check, CheckCheck, Trash2, Search, Filter, 
  Calendar, Loader2, ArrowLeft
} from 'lucide-react';
import { Link } from 'react-router-dom';

const notificationTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'phase_completed', label: 'Phase Complete' },
  { value: 'phase_started', label: 'Phase Started' },
  { value: 'deliverable_reviewed', label: 'CEO Review' },
  { value: 'deliverable_approved', label: 'Approved' },
  { value: 'deliverable_ready', label: 'Ready for Review' },
  { value: 'revision_requested', label: 'Revision Requested' },
  { value: 'task_delegated', label: 'Task Delegated' },
];

const dateFilters = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'ceo_review_complete':
    case 'deliverable_reviewed':
      return '👔';
    case 'deliverable_approved':
      return '✅';
    case 'phase_complete':
    case 'phase_completed':
      return '🎯';
    case 'phase_started':
      return '🚀';
    case 'revision_requested':
      return '📝';
    case 'deliverable_ready':
      return '📋';
    case 'task_delegated':
      return '📤';
    default:
      return '🔔';
  }
};

const getNotificationBadgeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
  if (type.includes('approved') || type.includes('complete')) return 'default';
  if (type.includes('revision') || type.includes('reject')) return 'destructive';
  return 'secondary';
};

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (!notification.title.toLowerCase().includes(searchLower) &&
            !notification.message.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Type filter
      if (typeFilter !== 'all' && notification.type !== typeFilter) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const notificationDate = parseISO(notification.created_at);
        switch (dateFilter) {
          case 'today':
            if (!isToday(notificationDate)) return false;
            break;
          case 'yesterday':
            if (!isYesterday(notificationDate)) return false;
            break;
          case 'week':
            if (!isThisWeek(notificationDate)) return false;
            break;
          case 'month':
            const now = new Date();
            const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
            if (notificationDate < monthAgo) return false;
            break;
        }
      }

      return true;
    });
  }, [notifications, search, typeFilter, dateFilter]);

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: Notification[] } = {};
    
    filteredNotifications.forEach(notification => {
      const date = parseISO(notification.created_at);
      let groupKey: string;
      
      if (isToday(date)) {
        groupKey = 'Today';
      } else if (isYesterday(date)) {
        groupKey = 'Yesterday';
      } else if (isThisWeek(date)) {
        groupKey = 'This Week';
      } else {
        groupKey = format(date, 'MMMM yyyy');
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(notification);
    });
    
    return groups;
  }, [filteredNotifications]);

  return (
    <>
      <Helmet>
        <title>Notifications | ShelVey AI</title>
        <meta name="description" content="View all your notifications and alerts" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 pt-24 pb-16">
          <SubscriptionGate>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Link to="/dashboard">
                    <Button variant="ghost" size="icon">
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                  </Link>
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                      <Bell className="w-8 h-8 text-primary" />
                      Notifications
                      {unreadCount > 0 && (
                        <Badge variant="default" className="ml-2">
                          {unreadCount} unread
                        </Badge>
                      )}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Stay updated with your business progress
                    </p>
                  </div>
                </div>

                {unreadCount > 0 && (
                  <Button variant="outline" onClick={markAllAsRead} className="gap-2">
                    <CheckCheck className="w-4 h-4" />
                    Mark all as read
                  </Button>
                )}
              </div>

              {/* Filters */}
              <Card className="mb-6">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search notifications..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        {notificationTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <Calendar className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Date range" />
                      </SelectTrigger>
                      <SelectContent>
                        {dateFilters.map(filter => (
                          <SelectItem key={filter.value} value={filter.value}>
                            {filter.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(search || typeFilter !== 'all' || dateFilter !== 'all') && (
                    <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                      <span>Showing {filteredNotifications.length} of {notifications.length} notifications</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => { setSearch(''); setTypeFilter('all'); setDateFilter('all'); }}
                      >
                        Clear filters
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Notifications List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4 opacity-50" />
                    <h2 className="text-xl font-semibold mb-2">No notifications found</h2>
                    <p className="text-muted-foreground">
                      {search || typeFilter !== 'all' || dateFilter !== 'all'
                        ? 'Try adjusting your filters'
                        : 'You\'re all caught up!'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedNotifications).map(([group, groupNotifications]) => (
                    <div key={group}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-3 px-2">
                        {group}
                      </h3>
                      <Card>
                        <div className="divide-y divide-border">
                          {groupNotifications.map((notification) => (
                            <NotificationRow
                              key={notification.id}
                              notification={notification}
                              onMarkAsRead={markAsRead}
                              onDelete={deleteNotification}
                            />
                          ))}
                        </div>
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </SubscriptionGate>
        </main>

        <Footer />
      </div>
    </>
  );
}

interface NotificationRowProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationRow = ({ notification, onMarkAsRead, onDelete }: NotificationRowProps) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`p-4 hover:bg-muted/30 transition-colors group ${
        !notification.read ? 'bg-primary/5' : ''
      }`}
    >
      <div className="flex gap-4">
        <div className="text-2xl flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">{notification.title}</p>
                {!notification.read && (
                  <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-muted-foreground line-clamp-2">{notification.message}</p>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={getNotificationBadgeVariant(notification.type)} className="text-xs">
                {notification.type.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-muted-foreground">
              {format(parseISO(notification.created_at), 'MMM d, yyyy \'at\' h:mm a')} • {formatDistanceToNow(parseISO(notification.created_at), { addSuffix: true })}
            </p>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkAsRead(notification.id)}
                  className="h-8 px-2"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Mark read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(notification.id)}
                className="h-8 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
