import type { EntryType } from "@prisma/client";

// Separa le voci con un sessionId esplicito (Spostamento/Inizio/Fine creati
// insieme, quindi già legati con certezza) da quelle storiche senza
// sessionId, che vanno ancora abbinate indovinando dall'ordine cronologico.
// Indispensabile perché due sessioni diverse possono avere lo stesso orario
// (es. inserimenti manuali con lo stesso orario segnaposto): senza un legame
// esplicito non c'è modo di sapere quale Fine appartenga a quale Inizio.
function splitBySessionId<T extends { sessionId?: string | null }>(
  list: T[]
): { grouped: Map<string, T[]>; legacy: T[] } {
  const grouped = new Map<string, T[]>();
  const legacy: T[] = [];
  for (const e of list) {
    if (e.sessionId) {
      const arr = grouped.get(e.sessionId) ?? [];
      arr.push(e);
      grouped.set(e.sessionId, arr);
    } else {
      legacy.push(e);
    }
  }
  return { grouped, legacy };
}

type Entry = {
  userId: string;
  type: EntryType;
  timestamp: Date;
  sessionId?: string | null;
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

    const { grouped, legacy } = splitBySessionId(list);

    for (const group of grouped.values()) {
      const travelStart = group.find((g) => g.type === "TRAVEL_START");
      const workStart = group.find((g) => g.type === "WORK_START");
      const workEnd = group.find((g) => g.type === "WORK_END");
      if (workStart && workEnd) {
        workMinutes += (workEnd.timestamp.getTime() - workStart.timestamp.getTime()) / 60000;
      }
      if (travelStart && workStart) {
        travelMinutes += (workStart.timestamp.getTime() - travelStart.timestamp.getTime()) / 60000;
      }
    }

    let pendingTravelStart: Date | null = null;
    let pendingWorkStart: Date | null = null;

    for (const e of legacy) {
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
  sessionId?: string | null;
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

    const { grouped, legacy } = splitBySessionId(list);

    for (const group of grouped.values()) {
      const travelStart = group.find((g) => g.type === "TRAVEL_START");
      const workStart = group.find((g) => g.type === "WORK_START");
      const workEnd = group.find((g) => g.type === "WORK_END");
      const siteId = workStart?.siteId ?? travelStart?.siteId ?? null;
      if (!siteId) continue;
      if (workStart && workEnd) {
        add(siteId, (workEnd.timestamp.getTime() - workStart.timestamp.getTime()) / 60000, "workMinutes");
      }
      if (travelStart && workStart) {
        add(siteId, (workStart.timestamp.getTime() - travelStart.timestamp.getTime()) / 60000, "travelMinutes");
      }
    }

    let pendingTravel: { time: Date; siteId: string } | null = null;
    let pendingWork: { time: Date; siteId: string } | null = null;

    for (const e of legacy) {
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
  id: string;
  userId: string;
  user: TUser;
  siteId: string | null;
  site: TSite | null;
  type: EntryType;
  timestamp: Date;
  orarioStimato: boolean;
  lat: number | null;
  lng: number | null;
  note: string | null;
  sessionId?: string | null;
};

export type WorkSession<TSite, TUser> = {
  startId: string;
  endId: string | null;
  travelId: string | null;
  user: TUser;
  site: TSite | null;
  start: Date;
  end: Date | null;
  startEstimated: boolean;
  endEstimated: boolean;
  lat: number | null;
  lng: number | null;
  note: string | null;
  travelMinutes: number;
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

    const { grouped, legacy } = splitBySessionId(list);

    for (const group of grouped.values()) {
      const travelStart = group.find((g) => g.type === "TRAVEL_START") ?? null;
      const workStart = group.find((g) => g.type === "WORK_START") ?? null;
      const workEnd = group.find((g) => g.type === "WORK_END") ?? null;
      // Senza un Inizio non c'è una riga sensata da mostrare (non dovrebbe
      // capitare: Spostamento/Fine vengono sempre creati insieme a un
      // Inizio o abbinati a uno già esistente).
      if (!workStart) continue;
      const travelMinutes = travelStart
        ? Math.round((workStart.timestamp.getTime() - travelStart.timestamp.getTime()) / 60000)
        : 0;
      sessions.push({
        startId: workStart.id,
        endId: workEnd ? workEnd.id : null,
        travelId: travelStart ? travelStart.id : null,
        user: workStart.user,
        site: workStart.site,
        start: workStart.timestamp,
        end: workEnd ? workEnd.timestamp : null,
        startEstimated: workStart.orarioStimato,
        endEstimated: workEnd ? workEnd.orarioStimato : false,
        lat: workStart.lat,
        lng: workStart.lng,
        note: workStart.note,
        travelMinutes,
      });
    }

    let pendingTravel: { id: string; time: Date } | null = null;
    let pendingTravelId: string | null = null;
    let pendingTravelMinutes = 0;
    let pendingWork: RawSessionEntry<TSite, TUser> | null = null;

    // Mostra come "in corso" (senza Fine) l'eventuale WORK_START ancora in
    // sospeso invece di perderlo: capita con inserimenti manuali duplicati o
    // doppi, dove arriva un nuovo Inizio prima che il precedente riceva la
    // sua Fine.
    function flushPendingAsOpen() {
      if (!pendingWork) return;
      sessions.push({
        startId: pendingWork.id,
        endId: null,
        travelId: pendingTravelId,
        user: pendingWork.user,
        site: pendingWork.site,
        start: pendingWork.timestamp,
        end: null,
        startEstimated: pendingWork.orarioStimato,
        endEstimated: false,
        lat: pendingWork.lat,
        lng: pendingWork.lng,
        note: pendingWork.note,
        travelMinutes: pendingTravelMinutes,
      });
      pendingWork = null;
      pendingTravelMinutes = 0;
      pendingTravelId = null;
    }

    for (const e of legacy) {
      if (e.type === "TRAVEL_START") {
        pendingTravel = { id: e.id, time: e.timestamp };
      } else if (e.type === "WORK_START") {
        flushPendingAsOpen();
        pendingTravelMinutes = pendingTravel
          ? Math.round((e.timestamp.getTime() - pendingTravel.time.getTime()) / 60000)
          : 0;
        pendingTravelId = pendingTravel?.id ?? null;
        pendingTravel = null;
        pendingWork = e;
      } else if (e.type === "WORK_END") {
        if (pendingWork) {
          sessions.push({
            startId: pendingWork.id,
            endId: e.id,
            travelId: pendingTravelId,
            user: pendingWork.user,
            site: pendingWork.site,
            start: pendingWork.timestamp,
            end: e.timestamp,
            startEstimated: pendingWork.orarioStimato,
            endEstimated: e.orarioStimato,
            lat: pendingWork.lat,
            lng: pendingWork.lng,
            note: pendingWork.note,
            travelMinutes: pendingTravelMinutes,
          });
          pendingWork = null;
          pendingTravelMinutes = 0;
          pendingTravelId = null;
        }
      }
    }

    flushPendingAsOpen();
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
  site: {
    id: string;
    name: string;
    client: {
      tipo: string;
      nome: string | null;
      cognome: string | null;
      ragioneSociale: string | null;
      name: string;
    };
  } | null;
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
