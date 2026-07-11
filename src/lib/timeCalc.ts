import type { EntryType } from "@prisma/client";

type Entry = {
  userId: string;
  type: EntryType;
  timestamp: Date;
};

export type UserTotals = { travelMinutes: number; workMinutes: number };

export function computeTotals(entries: Entry[]): Map<string, UserTotals> {
  const byUser = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = byUser.get(e.userId) ?? [];
    list.push(e);
    byUser.set(e.userId, list);
  }

  const totals = new Map<string, UserTotals>();

  for (const [userId, list] of byUser) {
    list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let travelMinutes = 0;
    let workMinutes = 0;
    let pendingTravelStart: Date | null = null;
    let pendingWorkStart: Date | null = null;

    for (const e of list) {
      if (e.type === "TRAVEL_START") {
        pendingTravelStart = e.timestamp;
      } else if (e.type === "WORK_START") {
        if (pendingTravelStart) {
          travelMinutes +=
            (e.timestamp.getTime() - pendingTravelStart.getTime()) / 60000;
          pendingTravelStart = null;
        }
        pendingWorkStart = e.timestamp;
      } else if (e.type === "WORK_END") {
        if (pendingWorkStart) {
          workMinutes +=
            (e.timestamp.getTime() - pendingWorkStart.getTime()) / 60000;
          pendingWorkStart = null;
        }
      }
    }

    totals.set(userId, {
      travelMinutes: Math.round(travelMinutes),
      workMinutes: Math.round(workMinutes),
    });
  }

  return totals;
}

type SiteEntry = {
  userId: string;
  siteId: string | null;
  type: EntryType;
  timestamp: Date;
};

export function computeSiteTotals(entries: SiteEntry[]): Map<string, UserTotals> {
  const byUser = new Map<string, SiteEntry[]>();
  for (const e of entries) {
    const list = byUser.get(e.userId) ?? [];
    list.push(e);
    byUser.set(e.userId, list);
  }

  const totals = new Map<string, UserTotals>();
  const add = (siteId: string, minutes: number, key: "travelMinutes" | "workMinutes") => {
    const current = totals.get(siteId) ?? { travelMinutes: 0, workMinutes: 0 };
    current[key] += minutes;
    totals.set(siteId, current);
  };

  for (const list of byUser.values()) {
    list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let pendingTravel: { time: Date; siteId: string } | null = null;
    let pendingWork: { time: Date; siteId: string } | null = null;

    for (const e of list) {
      if (e.type === "TRAVEL_START" && e.siteId) {
        pendingTravel = { time: e.timestamp, siteId: e.siteId };
      } else if (e.type === "WORK_START") {
        const siteId = e.siteId ?? pendingTravel?.siteId ?? null;
        if (pendingTravel && siteId) {
          add(siteId, (e.timestamp.getTime() - pendingTravel.time.getTime()) / 60000, "travelMinutes");
          pendingTravel = null;
        }
        if (siteId) {
          pendingWork = { time: e.timestamp, siteId };
        }
      } else if (e.type === "WORK_END") {
        if (pendingWork) {
          add(pendingWork.siteId, (e.timestamp.getTime() - pendingWork.time.getTime()) / 60000, "workMinutes");
          pendingWork = null;
        }
      }
    }
  }

  for (const [siteId, t] of totals) {
    totals.set(siteId, {
      travelMinutes: Math.round(t.travelMinutes),
      workMinutes: Math.round(t.workMinutes),
    });
  }

  return totals;
}

type RawSessionEntry<TSite, TUser> = {
  userId: string;
  user: TUser;
  siteId: string | null;
  site: TSite | null;
  type: EntryType;
  timestamp: Date;
  lat: number | null;
  lng: number | null;
};

export type WorkSession<TSite, TUser> = {
  user: TUser;
  site: TSite | null;
  start: Date;
  end: Date | null;
  lat: number | null;
  lng: number | null;
};

export function pairSessions<TSite, TUser>(
  entries: RawSessionEntry<TSite, TUser>[]
): WorkSession<TSite, TUser>[] {
  const byUser = new Map<string, RawSessionEntry<TSite, TUser>[]>();
  for (const e of entries) {
    const list = byUser.get(e.userId) ?? [];
    list.push(e);
    byUser.set(e.userId, list);
  }

  const sessions: WorkSession<TSite, TUser>[] = [];

  for (const list of byUser.values()) {
    list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let pendingWork: RawSessionEntry<TSite, TUser> | null = null;

    for (const e of list) {
      if (e.type === "WORK_START") {
        pendingWork = e;
      } else if (e.type === "WORK_END") {
        if (pendingWork) {
          sessions.push({
            user: pendingWork.user,
            site: pendingWork.site,
            start: pendingWork.timestamp,
            end: e.timestamp,
            lat: pendingWork.lat,
            lng: pendingWork.lng,
          });
          pendingWork = null;
        }
      }
    }

    if (pendingWork) {
      sessions.push({
        user: pendingWork.user,
        site: pendingWork.site,
        start: pendingWork.timestamp,
        end: null,
        lat: pendingWork.lat,
        lng: pendingWork.lng,
      });
    }
  }

  sessions.sort((a, b) => b.start.getTime() - a.start.getTime());
  return sessions;
}

export function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type EntryWithSite = {
  type: EntryType;
  site: { id: string; name: string; client: { name: string } } | null;
};

export function currentStatus<T extends EntryWithSite>(entries: T[]) {
  const last = entries[entries.length - 1];
  if (!last || last.type === "WORK_END") {
    return { status: "FREE" as const, site: null };
  }
  if (last.type === "TRAVEL_START") {
    return { status: "TRAVELING" as const, site: last.site };
  }
  return { status: "WORKING" as const, site: last.site };
}
