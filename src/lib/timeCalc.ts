import type { EntryType } from "@prisma/client";

// Separa le voci con un sessionId esplicito (Spostamento/Inizio/Fine creati
// insieme, quindi già legati con certezza) da quelle storiche senza
// sessionId, che vanno ancora abbinate indovinando dall'ordine cronologico.
// Indispensabile perché due sessioni diverse possono avere lo stesso orario
// (es. inserimenti manuali con lo stesso orario segnaposto): senza un legame
// esplicito non c'è modo di sapere quale Fine appartenga a quale Inizio.
export function splitBySessionId<T extends { sessionId?: string | null }>(
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

// Confini validi da cui far partire il conteggio automatico dello
// spostamento: fine turno precedente del tutto (DAY_START), fine di un
// lavoro/sopralluogo, o fine di una pausa.
const BOUNDARY_TYPES = new Set<EntryType>([
  "DAY_START",
  "WORK_END",
  "SOPRALLUOGO_END",
  "PAUSE_END",
]);

// Nuovo flusso "Inizio/Fine giornata": quando un Inizio lavoro/sopralluogo
// non ha un proprio TRAVEL_START nella stessa sessione (sempre il caso per i
// dati registrati col nuovo flusso), lo spostamento si calcola da solo come
// tempo trascorso dalla voce immediatamente precedente dello stesso
// collaboratore, se è un confine valido (vedi BOUNDARY_TYPES). Se la voce
// precedente è una PAUSE_START ancora aperta (mai chiusa: non dovrebbe
// capitare, punch() la chiude sempre prima di un nuovo Inizio) lo
// spostamento resta 0, per sicurezza. I dati storici (con un TRAVEL_START
// esplicito nella stessa sessione) non passano mai di qui: quel calcolo
// resta quello di sempre.
// Giorno di calendario in Italia ("AAAA-MM-GG"): il confronto tra due voci non
// deve dipendere dal fuso del server (UTC su Vercel, locale sul PC).
const dayKeyFormatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" });
const dayKey = (d: Date) => dayKeyFormatter.format(d);

// Lo spostamento si conta solo se la voce precedente è un confine valido E
// dello STESSO GIORNO. Senza questo vincolo, se un collaboratore dimentica
// "Inizio giornata", il lavoro prenderebbe come partenza una Fine lavoro di
// giorni prima (anche decine di giorni di "spostamento"). Quando non c'è un
// riferimento valido lo spostamento resta 0 e viene segnalato (mancante) in
// Timbrature, così si può correggere a mano.
export function autoTravelInfo<T extends { type: EntryType; timestamp: Date }>(
  sortedList: T[],
  target: T
): { minutes: number; mancante: boolean } {
  const idx = sortedList.indexOf(target);
  if (idx <= 0) return { minutes: 0, mancante: true };
  const prev = sortedList[idx - 1];
  if (!BOUNDARY_TYPES.has(prev.type)) return { minutes: 0, mancante: true };
  if (dayKey(prev.timestamp) !== dayKey(target.timestamp)) return { minutes: 0, mancante: true };
  return {
    minutes: (target.timestamp.getTime() - prev.timestamp.getTime()) / 60000,
    mancante: false,
  };
}

function autoTravelMinutes<T extends { type: EntryType; timestamp: Date }>(
  sortedList: T[],
  target: T
): number {
  return autoTravelInfo(sortedList, target).minutes;
}

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
      } else if (workStart) {
        travelMinutes += autoTravelMinutes(list, workStart);
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
      } else if (workStart) {
        add(siteId, autoTravelMinutes(list, workStart), "travelMinutes");
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
  luogo: string | null;
  sessionId?: string | null;
};

export type ActivityType = "LAVORO" | "SOPRALLUOGO";

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
  luogo: string | null;
  travelMinutes: number;
  // Lavoro senza spostamento perché manca un riferimento valido (nessun Inizio
  // giornata o voce precedente dello stesso giorno): da correggere a mano.
  travelMissing: boolean;
  activityType: ActivityType;
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
      const start =
        group.find((g) => g.type === "WORK_START" || g.type === "SOPRALLUOGO_START") ?? null;
      const end =
        group.find((g) => g.type === "WORK_END" || g.type === "SOPRALLUOGO_END") ?? null;
      // Senza un Inizio non c'è una riga sensata da mostrare (non dovrebbe
      // capitare: Spostamento/Fine vengono sempre creati insieme a un
      // Inizio o abbinati a uno già esistente).
      if (!start) continue;
      const activityType: ActivityType = start.type === "SOPRALLUOGO_START" ? "SOPRALLUOGO" : "LAVORO";
      const autoInfo = travelStart ? null : autoTravelInfo(list, start);
      const travelMinutes = travelStart
        ? Math.round((start.timestamp.getTime() - travelStart.timestamp.getTime()) / 60000)
        : Math.round(autoInfo!.minutes);
      // I Sopralluoghi non hanno spostamento per scelta: non si segnalano.
      const travelMissing = activityType === "LAVORO" && !!autoInfo?.mancante;
      sessions.push({
        startId: start.id,
        endId: end ? end.id : null,
        travelId: travelStart ? travelStart.id : null,
        user: start.user,
        site: start.site,
        start: start.timestamp,
        end: end ? end.timestamp : null,
        startEstimated: start.orarioStimato,
        endEstimated: end ? end.orarioStimato : false,
        lat: start.lat,
        lng: start.lng,
        note: start.note,
        luogo: start.luogo,
        travelMinutes,
        travelMissing,
        activityType,
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
        luogo: pendingWork.luogo,
        travelMinutes: pendingTravelMinutes,
        travelMissing: false,
        activityType: "LAVORO",
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
            luogo: pendingWork.luogo,
            travelMinutes: pendingTravelMinutes,
            travelMissing: false,
            activityType: "LAVORO",
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

// Nuovo flusso "Inizio/Fine giornata": lo stato del collaboratore ora ha più
// sfumature di prima (FREE/TRAVELING/WORKING/SOPRALLUOGO). NESSUNA_GIORNATA
// = non ha ancora premuto "Inizio giornata" (o l'ha già conclusa).
// SCEGLI_CANTIERE = giornata iniziata, deve ancora scegliere il cantiere.
// HUB = tra un cantiere e l'altro (dopo un Fine lavoro/sopralluogo, o in
// pausa) — inPausa distingue se in quel momento è in pausa.
export function currentStatus<T extends EntryWithSite>(entries: T[]) {
  const last = entries[entries.length - 1];
  if (!last || last.type === "DAY_END") {
    return { status: "NESSUNA_GIORNATA" as const, site: null, inPausa: false };
  }
  // TRAVEL_START qui è solo un residuo del vecchio flusso (dato che non
  // viene più creato da questo punto in poi): lo si tratta come DAY_START,
  // così chi si trovasse a metà di un vecchio "Inizia spostamento" proprio
  // al momento del rilascio può comunque scegliere un cantiere e continuare.
  if (last.type === "DAY_START" || last.type === "TRAVEL_START") {
    return { status: "SCEGLI_CANTIERE" as const, site: null, inPausa: false };
  }
  if (last.type === "WORK_START") {
    return { status: "LAVORO" as const, site: last.site, inPausa: false };
  }
  if (last.type === "SOPRALLUOGO_START") {
    return { status: "SOPRALLUOGO" as const, site: last.site, inPausa: false };
  }
  // WORK_END, SOPRALLUOGO_END, PAUSE_START, PAUSE_END.
  return { status: "HUB" as const, site: null, inPausa: last.type === "PAUSE_START" };
}
