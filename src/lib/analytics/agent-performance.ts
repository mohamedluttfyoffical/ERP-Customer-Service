import { prisma } from "@/lib/db";

export interface AgentLeaderboardItem {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  roleName: string;
  resolvedCount: number;
  totalAssigned: number;
  resolutionRate: number;
  avgFirstResponseMinutes: number;
  csatAverage: number;
  points: number;
  rank: number;
}

export async function getAgentLeaderboard(
  tenantId: string
): Promise<AgentLeaderboardItem[]> {
  const memberships = await prisma.membership.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      role: { select: { name: true } },
      assignedTickets: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          firstRespondedAt: true,
          resolvedAt: true,
          csatResponse: {
            select: { rating: true },
          },
        },
      },
    },
  });

  const items: Omit<AgentLeaderboardItem, "rank">[] = [];

  for (const m of memberships) {
    const tickets = m.assignedTickets;
    const totalAssigned = tickets.length;
    let resolvedCount = 0;
    let totalFirstResponseMinutes = 0;
    let firstResponseCount = 0;
    const ratings: number[] = [];

    for (const t of tickets) {
      if (t.status === "RESOLVED" || t.status === "CLOSED") {
        resolvedCount++;
      }
      if (t.firstRespondedAt) {
        const diff = Math.max(
          0,
          Math.round((t.firstRespondedAt.getTime() - t.createdAt.getTime()) / (60 * 1000))
        );
        totalFirstResponseMinutes += diff;
        firstResponseCount++;
      }
      if (t.csatResponse?.rating) {
        ratings.push(t.csatResponse.rating);
      }
    }

    const resolutionRate =
      totalAssigned > 0 ? Math.round((resolvedCount / totalAssigned) * 100) : 100;
    const avgFirstResponseMinutes =
      firstResponseCount > 0
        ? Math.round(totalFirstResponseMinutes / firstResponseCount)
        : 0;
    const csatAverage =
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 4.8;

    // Composite scoring formula
    const points =
      resolvedCount * 20 +
      Math.round(resolutionRate * 1.5) +
      Math.round(csatAverage * 15);

    items.push({
      membershipId: m.id,
      userId: m.user.id,
      name: m.user.name || m.user.email,
      email: m.user.email,
      roleName: m.role.name,
      resolvedCount,
      totalAssigned,
      resolutionRate,
      avgFirstResponseMinutes,
      csatAverage,
      points,
    });
  }

  // Sort descending by points
  items.sort((a, b) => b.points - a.points);

  return items.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}
