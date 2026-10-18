"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Bell,
  CheckCheck,
  LifeBuoy,
  MessageSquare,
  AlertTriangle,
  CreditCard,
  Info,
  ExternalLink,
} from "lucide-react";
import {
  getUserNotificationsAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
  type UserNotificationItem,
} from "@/lib/notifications/actions";
import { getPusherClient } from "@/lib/realtime/client";
import { formatRelativeTime } from "@/lib/format";

interface NotificationCenterProps {
  tenantSlug: string;
  userId?: string;
  tenantId?: string;
}

export function NotificationCenter({
  tenantSlug,
  userId,
  tenantId,
}: NotificationCenterProps) {
  const t = useTranslations("Notifications");
  const locale = useLocale();

  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = () => {
    startTransition(async () => {
      const data = await getUserNotificationsAction({ tenantSlug, locale });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    });
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000); // Polling backup
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug, locale]);

  // Real-time Pusher listener
  useEffect(() => {
    if (!userId || !tenantId) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channelName = `tenant-${tenantId}-user-${userId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind("notification-created", (newNotif: UserNotificationItem) => {
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((c) => c + 1);
    });

    return () => {
      pusher.unsubscribe(channelName);
    };
  }, [userId, tenantId]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    startTransition(async () => {
      await markNotificationAsReadAction({ notificationId: id, tenantSlug, locale });
    });
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
    );
    setUnreadCount(0);
    startTransition(async () => {
      await markAllNotificationsAsReadAction({ tenantSlug, locale });
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "TICKET_ASSIGNED":
      case "TICKET_REPLY":
        return <LifeBuoy className="size-4 text-primary" />;
      case "CUSTOMER_REPLY":
      case "MENTION":
        return <MessageSquare className="size-4 text-emerald-500" />;
      case "SLA_WARNING":
      case "SLA_BREACH":
        return <AlertTriangle className="size-4 text-destructive" />;
      case "BILLING":
        return <CreditCard className="size-4 text-amber-500" />;
      default:
        return <Info className="size-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={t("title")}
        aria-expanded={isOpen}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute end-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-foreground">{t("title")}</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {unreadCount} {t("unread")}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
              >
                <CheckCheck className="size-3.5" />
                <span>{t("markAllRead")}</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="mt-2 max-h-80 overflow-y-auto space-y-1 divide-y divide-border/30">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                <Bell className="mx-auto size-6 mb-2 opacity-30" />
                <p>{t("empty")}</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    onClick={() => isUnread && handleMarkAsRead(n.id)}
                    className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors cursor-pointer ${
                      isUnread
                        ? "bg-primary/5 hover:bg-primary/10"
                        : "hover:bg-muted/50 opacity-80"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 rounded-lg bg-background p-1.5 border border-border/60">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {n.title}
                        </p>
                        {isUnread && (
                          <span className="size-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      {n.body && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                          {n.body}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{formatRelativeTime(new Date(n.createdAt), locale)}</span>
                        {n.href && (
                          <Link
                            href={n.href}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-0.5 text-primary hover:underline font-sans"
                          >
                            <span>{t("view")}</span>
                            <ExternalLink className="size-2.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
