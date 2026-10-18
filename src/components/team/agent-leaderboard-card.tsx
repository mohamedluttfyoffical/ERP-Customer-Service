import { Trophy, Award, Clock, Star, CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getAgentLeaderboard } from "@/lib/analytics/agent-performance";
import { getInitials } from "@/lib/format";

interface AgentLeaderboardCardProps {
  tenantId: string;
  locale?: string;
}

export async function AgentLeaderboardCard({
  tenantId,
  locale: _locale,
}: AgentLeaderboardCardProps) {
  const t = await getTranslations("Leaderboard");
  const agents = await getAgentLeaderboard(tenantId);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <span className="grid size-7 place-items-center rounded-xl bg-amber-500/10 text-amber-500 font-bold text-sm">
            🥇
          </span>
        );
      case 2:
        return (
          <span className="grid size-7 place-items-center rounded-xl bg-slate-400/10 text-slate-400 font-bold text-sm">
            🥈
          </span>
        );
      case 3:
        return (
          <span className="grid size-7 place-items-center rounded-xl bg-amber-700/10 text-amber-700 font-bold text-sm">
            🥉
          </span>
        );
      default:
        return (
          <span className="grid size-7 place-items-center rounded-xl bg-muted text-muted-foreground font-mono text-xs font-bold">
            #{rank}
          </span>
        );
    }
  };

  return (
    <div className="mt-8 rounded-3xl border border-border/80 bg-card p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-500/10 text-amber-500">
            <Trophy className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {t("title")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Award className="size-4 text-primary" />
          <span className="font-semibold">{agents.length} {t("activeAgents")}</span>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-start text-xs">
          <thead>
            <tr className="border-b border-border/50 text-[10px] font-semibold text-muted-foreground uppercase">
              <th className="py-2.5 px-3 text-start">{t("rank")}</th>
              <th className="py-2.5 px-3 text-start">{t("agent")}</th>
              <th className="py-2.5 px-3 text-center">{t("resolved")}</th>
              <th className="py-2.5 px-3 text-center">{t("resolutionRate")}</th>
              <th className="py-2.5 px-3 text-center">{t("avgResponse")}</th>
              <th className="py-2.5 px-3 text-center">{t("csat")}</th>
              <th className="py-2.5 px-3 text-end">{t("points")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {agents.map((agent) => (
              <tr
                key={agent.membershipId}
                className="hover:bg-muted/30 transition-colors"
              >
                {/* Rank */}
                <td className="py-3 px-3">{getRankBadge(agent.rank)}</td>

                {/* Agent info */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-bold">
                      {getInitials(agent.name)}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-foreground block truncate">
                        {agent.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {agent.roleName}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Resolved Count */}
                <td className="py-3 px-3 text-center font-mono font-bold text-foreground">
                  <span className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3" />
                    <span>{agent.resolvedCount}</span>
                  </span>
                </td>

                {/* Resolution Rate */}
                <td className="py-3 px-3 text-center font-mono text-muted-foreground">
                  {agent.resolutionRate}%
                </td>

                {/* Avg First Response */}
                <td className="py-3 px-3 text-center font-mono text-muted-foreground">
                  <span className="flex items-center justify-center gap-1">
                    <Clock className="size-3 text-amber-500" />
                    <span>{agent.avgFirstResponseMinutes}m</span>
                  </span>
                </td>

                {/* CSAT Score */}
                <td className="py-3 px-3 text-center font-mono">
                  <span className="flex items-center justify-center gap-0.5 text-amber-500 font-bold">
                    <Star className="size-3 fill-amber-500" />
                    <span>{agent.csatAverage.toFixed(1)}</span>
                  </span>
                </td>

                {/* Performance Points */}
                <td className="py-3 px-3 text-end font-mono font-bold text-primary text-sm">
                  {agent.points} <span className="text-[9px] text-muted-foreground font-normal">{t("pts")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
