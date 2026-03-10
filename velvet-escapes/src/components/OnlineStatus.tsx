import { useTranslation } from "react-i18next";

function timeAgo(date: Date, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t("online.justNow");
  if (minutes < 60) return t("online.minutesAgo", { count: minutes });
  if (hours < 24) return t("online.hoursAgo", { count: hours });
  return t("online.daysAgo", { count: days });
}

interface OnlineProps {
  lastSeen?: string | Date | null;
  isOnline?: boolean;
}

export function checkOnline(props: OnlineProps): boolean {
  if (props.isOnline != null) return props.isOnline;
  return false;
}

export function OnlineDot({ lastSeen, isOnline, size = "sm" }: OnlineProps & { size?: "sm" | "md" }) {
  const online = checkOnline({ lastSeen, isOnline });
  const px = size === "md" ? "h-3 w-3" : "h-2.5 w-2.5";
  return (
    <span
      className={`inline-block rounded-full ${px} ${online ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-muted-foreground/40"}`}
      title={online ? "Online" : "Offline"}
    />
  );
}

export function OnlineLabel({ lastSeen, isOnline, showOfflineTime = true }: OnlineProps & { showOfflineTime?: boolean }) {
  const { t } = useTranslation();
  const online = checkOnline({ lastSeen, isOnline });

  if (online) {
    return <span className="text-[11px] font-medium text-emerald-500">{t("online.now")}</span>;
  }

  if (!showOfflineTime || !lastSeen) return null;

  return (
    <span className="text-[11px] text-muted-foreground">
      {timeAgo(new Date(lastSeen), t)}
    </span>
  );
}

export default function OnlineStatus({ lastSeen, isOnline, showLabel = true, size = "sm" }: OnlineProps & { showLabel?: boolean; size?: "sm" | "md" }) {
  return (
    <span className="inline-flex items-center gap-1">
      <OnlineDot lastSeen={lastSeen} isOnline={isOnline} size={size} />
      {showLabel && <OnlineLabel lastSeen={lastSeen} isOnline={isOnline} />}
    </span>
  );
}
