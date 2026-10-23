import { ALTO_VICENTINO, type ChallengeEntry, type Community, type CommunityChallenge, type Member, type Spot, type SpotCategory, type SpotKind } from "@/data/community";
import type { ActionId } from "@/data/actions";
import type { Comment, Comune, Media, Post, User } from "@/data/types";
import { bboxAround } from "@/services/geo";
import { useApp } from "@/store/app-store";
import { useCommunity } from "@/store/community-store";

// Demo data for the Community tab, device-only: open the web app with `?demo=community`.
// A lived-in Alto Vicentino (places on the map, proofs, a challenge under way) and two groups of friends.

const img = {
  bikeWhite: require("../../assets/demo/bike-white.jpg"),
  bikeBlack: require("../../assets/demo/bike-black.jpg"),
  bus: require("../../assets/demo/bus.jpg"),
  binsPark: require("../../assets/demo/bins-park.jpg"),
  binsColor: require("../../assets/demo/bins-color.jpg"),
  recycle: require("../../assets/demo/recycle-blue.jpg"),
  beachLitter: require("../../assets/demo/beach-litter.jpg"),
  beachCleanup: require("../../assets/demo/beach-cleanup.jpg"),
  bottleGreen: require("../../assets/demo/bottle-green.jpg"),
  bottles: require("../../assets/demo/bottles.jpg"),
  meshBag: require("../../assets/demo/mesh-bag.jpg"),
  seedpots: require("../../assets/demo/seedpots.jpg"),
  seedlings: require("../../assets/demo/seedlings.jpg"),
  soil: require("../../assets/demo/soil.jpg"),
  fern: require("../../assets/demo/fern-hands.jpg"),
  forest: require("../../assets/demo/forest.jpg"),
  veggies: require("../../assets/demo/veggies.jpg"),
  leftovers: require("../../assets/demo/leftovers.jpg"),
  thriftFlat: require("../../assets/demo/thrift-flatlay.jpg"),
  thriftRack: require("../../assets/demo/thrift-rack.jpg"),
  sprig: require("../../assets/demo/sprig.jpg"),
  ecosign: require("../../assets/demo/ecosign.jpg"),
  bales: require("../../assets/demo/plastic-bales.jpg"),
};

const clip: Record<ActionId, Media> = {
  move: require("../../assets/proof/bike-black.mp4"),
  sort: require("../../assets/proof/recycle-blue.mp4"),
  pickup: require("../../assets/proof/beach-cleanup.mp4"),
  refill: require("../../assets/proof/bottle-green.mp4"),
  plant: require("../../assets/proof/soil.mp4"),
  spot: require("../../assets/proof/forest.mp4"),
  plate: require("../../assets/proof/leftovers.mp4"),
  rewear: require("../../assets/proof/thrift-rack.mp4"),
  save: require("../../assets/proof/bottle-green.mp4"),
  crew: require("../../assets/proof/plastic-bales.mp4"),
};

const H = 3600e3;
const D = 24 * H;

const SCHIO: Comune = { id: "6538270", name: "Schio", province: "Vicenza", region: "Veneto", lat: 45.7126, lon: 11.3567 };
const THIENE_ID = "6540386";

const PEOPLE: User[] = [
  { id: "cm-giulia", name: "Giulia Dal Santo", handle: "giulia.ds", role: "student" },
  { id: "cm-marco", name: "Marco Zanella", handle: "marcoz", role: "student" },
  { id: "cm-sara", name: "Sara Pegoraro", handle: "sarapeg", role: "student" },
  { id: "cm-luca", name: "Luca Benetti", handle: "lucab", role: "student" },
  { id: "cm-elena", name: "Elena Cortiana", handle: "elena.c", role: "teacher" },
  { id: "cm-davide", name: "Davide Toniolo", handle: "dtoniolo", role: "student" },
  { id: "cm-chiara", name: "Chiara Grotto", handle: "chiarag", role: "student" },
  { id: "cm-paolo", name: "Paolo Rigon", handle: "paolorigon", role: "association" },
  { id: "cm-anna", name: "Anna Fabris", handle: "annaf", role: "student" },
  { id: "cm-tommaso", name: "Tommaso Busin", handle: "tommy.b", role: "student" },
  { id: "cm-irene", name: "Irene Sella", handle: "irenesella", role: "student" },
  { id: "cm-nicola", name: "Nicola Pozzan", handle: "nicop", role: "association" },
];
const ids = PEOPLE.map((p) => p.id);

// ---------- groups ----------

const group = (id: string, name: string, kind: Community["kind"], description: string, at: { lat: number; lon: number }, comuni: string[]): Community => ({
  id,
  name,
  kind,
  description,
  area: comuni.join(" · "),
  visibility: "private",
  center: at,
  bbox: bboxAround(at, 4),
  comuni,
});

const CLASS = group("demo-classe-4b", "Classe 4B · Schio", "school", "La 4B e la prof. Cortiana: una sfida green a settimana, chi verifica di più offre la merenda.", SCHIO, ["Schio"]);
const FRIENDS = group("demo-pedalata", "Pedalata del giovedì", "friends", "Ogni giovedì in bici Schio–Thiene lungo la ciclabile, e un caffè in piazza Ferrarin.", { lat: 45.709, lon: 11.42 }, ["Schio", "Thiene"]);

// ---------- places on the map ----------

type Seed = {
  kind: SpotKind;
  category: SpotCategory;
  title: string;
  body: string;
  at: [number, number];
  address: string;
  by: string;
  ago: number;
  photo?: Media;
  status?: Spot["status"];
  event?: { in: number; hours?: number; at?: number };
  family?: boolean;
  saves?: number;
  going?: number;
  reactions?: Record<string, number>;
  comments?: [string, string, number][];
  verified?: boolean;
};

const SEEDS: Seed[] = [
  // Schio
  { kind: "useful", category: "repair", title: "Repair Café del Lanificio", body: "Ogni primo sabato del mese volontari aggiustano piccoli elettrodomestici, bici e vestiti. Porta l'oggetto rotto, si impara insieme.", at: [45.7139, 11.3593], address: "Via Pasubio, Schio", by: "cm-paolo", ago: 12 * D, photo: img.ecosign, saves: 18, reactions: { "🙌": 9, "💚": 6 }, comments: [["cm-giulia", "Mi hanno sistemato la lampada in 20 minuti!", 6 * D], ["cm-marco", "Si possono portare anche le bici?", 2 * D], ["cm-paolo", "Sì, c'è anche una ciclofficina in cortile 🚲", 2 * D - 3 * H]], verified: true },
  { kind: "discovery", category: "gardens", title: "Giardino Jacquard", body: "Il giardino ottocentesco dietro al Lanificio: alberi monumentali, fontana e un angolo tranquillo per studiare all'ombra.", at: [45.7127, 11.3566], address: "Via Pasubio, Schio", by: "cm-chiara", ago: 9 * D, photo: img.fern, saves: 24, reactions: { "😍": 14, "💚": 8 }, comments: [["cm-anna", "Il posto più bello di Schio in primavera", 5 * D]], verified: true },
  { kind: "useful", category: "swap", title: "Scaffale del libero scambio", body: "Libri, giochi e fumetti: ne lasci uno, ne prendi uno. Nell'androne della biblioteca, aperto negli orari di apertura.", at: [45.7148, 11.3612], address: "Centro storico, Schio", by: "cm-sara", ago: 7 * D, photo: img.thriftFlat, saves: 11, reactions: { "📚": 7 } },
  { kind: "event", category: "events", title: "Pulizia argini del Leogra", body: "Raccolta rifiuti lungo il torrente, dal ponte fino alla passerella. Guanti e sacchi forniti, ritrovo al parcheggio.", at: [45.7046, 11.3688], address: "Pista ciclabile del Leogra, Schio", by: "cm-nicola", ago: 4 * D, photo: img.beachCleanup, event: { in: 2, at: 9 }, family: true, going: 23, saves: 15, reactions: { "💪": 12 }, comments: [["cm-luca", "Ci sono con tutta la 4B!", 3 * D], ["cm-elena", "Confermo, portiamo anche le pinze 🧤", 3 * D - 2 * H]] },
  { kind: "report", category: "reports", title: "Rifiuti abbandonati vicino al ponte", body: "Sacchi e qualche elettrodomestico lasciati sotto il ponte. Segnalato anche al Comune.", at: [45.7072, 11.3731], address: "Via Maraschin, Schio", by: "cm-davide", ago: 3 * D, photo: img.beachLitter, status: "toVerify", reactions: { "😡": 5 }, comments: [["cm-nicola", "Lo aggiungiamo al giro di sabato", 2 * D]] },
  { kind: "useful", category: "repair", title: "Ciclofficina popolare", body: "Attrezzi e consigli gratis per sistemare la tua bici da solo. Martedì e giovedì dalle 17 alle 20.", at: [45.7188, 11.3524], address: "Zona Fabbrica Alta, Schio", by: "cm-marco", ago: 15 * D, photo: img.bikeBlack, saves: 20, reactions: { "🚲": 11 }, verified: true },
  { kind: "moment", category: "moments", title: "Primo raccolto nell'orto della scuola", body: "Pomodori, zucchine e basilico: quest'anno la 4B ha piantato tutto da seme.", at: [45.7099, 11.3489], address: "Schio", by: "cm-elena", ago: 1 * D, photo: img.veggies, reactions: { "😍": 16, "🍅": 9 }, comments: [["cm-tommaso", "Le zucchine erano mie 😎", 20 * H]] },
  { kind: "useful", category: "gardens", title: "Orti urbani di Magrè", body: "Piccoli lotti in affitto dal Comune, ci sono ancora due posti liberi. Compostiera condivisa.", at: [45.7245, 11.3433], address: "Magrè, Schio", by: "cm-irene", ago: 20 * D, photo: img.seedlings, saves: 8, reactions: { "🌱": 6 } },
  { kind: "discovery", category: "discover", title: "Mercatino dell'usato solidale", body: "Vestiti, mobili e oggetti di seconda mano, il ricavato va ad associazioni del territorio.", at: [45.7179, 11.3657], address: "Schio", by: "cm-anna", ago: 6 * D, photo: img.thriftRack, saves: 13, reactions: { "👗": 8 } },
  { kind: "event", category: "events", title: "Swap party di vestiti", body: "Porta fino a 5 capi in buono stato e scambiali. Musica, tè e una postazione per piccole riparazioni.", at: [45.7133, 11.3579], address: "Piazza Statuto, Schio", by: "cm-giulia", ago: 2 * D, photo: img.thriftFlat, event: { in: 5, at: 16, hours: 3 }, going: 31, saves: 22, reactions: { "🔥": 13 } },
  { kind: "useful", category: "swap", title: "Casetta dei semi", body: "Una piccola casetta di legno con buste di semi da orto e fiori: prendi e riporta i semi della tua pianta.", at: [45.7105, 11.3622], address: "Parco Ex Lanerossi, Schio", by: "cm-chiara", ago: 11 * D, photo: img.seedpots, saves: 9 },
  // Santorso, Monte Summano
  { kind: "discovery", category: "gardens", title: "Parco di Villa Rossi", body: "Ventidue ettari di bosco e prati ai piedi del Summano, con un percorso naturalistico ad anello.", at: [45.7346, 11.3889], address: "Santorso", by: "cm-luca", ago: 14 * D, photo: img.forest, saves: 27, reactions: { "🌳": 15 }, verified: true },
  { kind: "challenge", category: "events", title: "Sentiero del Summano senza plastica", body: "Saliamo insieme e riportiamo a valle tutto quello che troviamo lungo il sentiero. Ogni sacco conta per la sfida.", at: [45.7562, 11.3942], address: "Monte Summano, Santorso", by: "cm-nicola", ago: 5 * D, photo: img.bales, event: { in: 8, at: 8, hours: 5 }, going: 14, saves: 10 },
  // Thiene
  { kind: "discovery", category: "discover", title: "Mercato contadino del sabato", body: "Produttori a km zero da tutto l'Alto Vicentino: porta la tua borsa e il contenitore per le uova.", at: [45.7077, 11.4783], address: "Piazza Ferrarin, Thiene", by: "cm-sara", ago: 8 * D, photo: img.veggies, saves: 19, reactions: { "🥕": 10 }, verified: true },
  { kind: "useful", category: "repair", title: "Fontanella dell'acqua", body: "Acqua potabile fresca, anche frizzante. Ottima per riempire la borraccia dopo la ciclabile.", at: [45.7069, 11.4808], address: "Thiene centro", by: "cm-tommaso", ago: 10 * D, photo: img.bottleGreen, saves: 12, reactions: { "💧": 7 } },
  { kind: "report", category: "reports", title: "Cestini pieni al parco", body: "I cestini dell'area giochi traboccano dal weekend, serve un passaggio in più.", at: [45.7029, 11.4741], address: "Thiene", by: "cm-anna", ago: 1 * D, status: "active", photo: img.binsPark, reactions: { "👀": 3 } },
  { kind: "moment", category: "moments", title: "Tramonto dal castello", body: "Arrivati in bici da Schio in 35 minuti. Si torna col treno!", at: [45.7088, 11.4797], address: "Castello di Thiene", by: "cm-davide", ago: 5 * H, photo: img.bikeWhite, reactions: { "😍": 11 } },
  // Malo, Marano, Piovene, Breganze
  { kind: "useful", category: "swap", title: "Biblioteca degli attrezzi", body: "Trapano, scala, idropulitrice: si prendono in prestito gratis con la tessera della biblioteca.", at: [45.6593, 11.4048], address: "Malo", by: "cm-paolo", ago: 18 * D, photo: img.ecosign, saves: 16, reactions: { "🛠️": 9 } },
  { kind: "discovery", category: "discover", title: "Negozio sfuso", body: "Pasta, legumi, detersivi alla spina. Porta i tuoi barattoli e paghi solo il contenuto.", at: [45.6935, 11.4253], address: "Marano Vicentino", by: "cm-irene", ago: 13 * D, photo: img.meshBag, saves: 14, reactions: { "🫙": 6 } },
  { kind: "moment", category: "moments", title: "Ciclabile dell'Astico", body: "Sterrato lungo il fiume, ombra e niente auto. Perfetta per andare a scuola d'estate.", at: [45.7563, 11.4318], address: "Piovene Rocchette", by: "cm-marco", ago: 2 * D, photo: img.bikeWhite, reactions: { "🚲": 8 } },
  { kind: "event", category: "events", title: "Piantiamo una siepe tra i vigneti", body: "Con un'associazione agricola piantiamo 300 arbusti autoctoni per gli impollinatori. Pranzo condiviso.", at: [45.7063, 11.5622], address: "Breganze", by: "cm-elena", ago: 3 * D, photo: img.soil, event: { in: 12, at: 9, hours: 6 }, family: true, going: 19, saves: 11 },
  { kind: "useful", category: "gardens", title: "Compostiera di quartiere", body: "Aperta a tutti i residenti: umido nel primo bidone, foglie secche nel secondo. Il compost è per gli orti.", at: [45.6987, 11.5293], address: "Sarcedo", by: "cm-luca", ago: 22 * D, photo: img.soil, saves: 6 },
  { kind: "report", category: "reports", title: "Lampioni accesi di giorno", body: "Tutta la via ha i lampioni accesi anche alle 11 del mattino.", at: [45.7004, 11.4602], address: "Zanè", by: "cm-tommaso", ago: 6 * D, status: "resolved", reactions: { "💡": 4 }, comments: [["cm-nicola", "Sistemato dal Comune giovedì 👍", 2 * D]] },
  { kind: "moment", category: "moments", title: "Ecocentro, finalmente vuoto il garage", body: "Ho portato vecchi RAEE e cartongesso: personale gentilissimo, niente coda il mercoledì mattina.", at: [45.7262, 11.3798], address: "Schio", by: "cm-giulia", ago: 3 * H, photo: img.recycle, reactions: { "♻️": 6 } },
];

function spotsFor(now: number, me: string): Spot[] {
  return SEEDS.map((s, i): Spot => {
    const createdAt = now - s.ago;
    const startsAt = s.event ? new Date(now + s.event.in * D).setHours(s.event.at ?? 10, 0, 0, 0) : undefined;
    const comments: Comment[] = (s.comments ?? []).map(([authorId, text, ago], j) => ({ id: `demo-c-${i}-${j}`, authorId, text, createdAt: now - ago }));
    return {
      id: `demo-spot-${i}`,
      communityId: ALTO_VICENTINO.id,
      authorId: s.by,
      kind: s.kind,
      category: s.category,
      title: s.title,
      body: s.body,
      photo: s.photo,
      lat: s.at[0],
      lon: s.at[1],
      precise: true,
      address: s.address,
      status: s.status ?? "active",
      startsAt,
      endsAt: startsAt && s.event?.hours ? startsAt + s.event.hours * H : undefined,
      family: !!s.family,
      visibility: "public",
      verifiedAt: s.verified ? createdAt + 2 * D : undefined,
      createdAt,
      updatedAt: createdAt,
      saves: s.saves ?? 0,
      going: s.going ?? 0,
      reactions: s.reactions ?? {},
      comments,
    };
  }).concat(
    // One of your own, so "mine" isn't empty.
    {
      id: "demo-spot-mine",
      communityId: ALTO_VICENTINO.id,
      authorId: me,
      kind: "useful",
      category: "swap",
      title: "Banco del baratto in cortile",
      body: "Il condominio ha un tavolo per scambiarsi piante, barattoli e libri. Passate pure!",
      photo: img.sprig,
      lat: 45.7161,
      lon: 11.3549,
      precise: false,
      address: "Schio",
      status: "active",
      family: false,
      visibility: "public",
      createdAt: now - 26 * H,
      updatedAt: now - 26 * H,
      saves: 4,
      going: 0,
      reactions: { "💚": 5 },
      comments: [{ id: "demo-c-mine", authorId: "cm-sara", text: "Domani porto una talea di pothos 🌿", createdAt: now - 10 * H }],
    },
  );
}

// ---------- proofs ----------

const PHOTO: Record<ActionId, Media> = {
  move: img.bikeWhite,
  sort: img.binsColor,
  pickup: img.beachCleanup,
  refill: img.bottles,
  plant: img.seedlings,
  spot: img.forest,
  plate: img.leftovers,
  rewear: img.thriftRack,
  save: img.sprig,
  crew: img.bales,
};

const CAPTIONS: Record<ActionId, string[]> = {
  move: ["In bici fino a scuola, 4 km sulla ciclabile", "Oggi bus invece del passaggio in macchina", "Schio–Thiene in bici col gruppo del giovedì"],
  sort: ["Differenziata fatta bene anche alla festa", "Separato vetro e lattine del pranzo di classe"],
  pickup: ["Mezzo sacco raccolto lungo il Leogra", "Raccolta al parco giochi con mia sorella", "3 sacchi sul sentiero del Summano"],
  refill: ["Borraccia riempita alla fontanella", "Spesa allo sfuso con i miei barattoli"],
  plant: ["Piantato basilico e pomodori nell'orto della scuola", "Semi presi alla casetta, già spuntati!"],
  spot: ["Un airone cenerino sul Leogra", "Prima fioritura di bucaneve a Villa Rossi"],
  plate: ["Avanzi di ieri diventati frittata", "Pranzo a km zero dal mercato del sabato"],
  rewear: ["Giacca trovata al mercatino solidale", "Jeans ricuciti al Repair Café"],
  save: ["Doccia di 4 minuti, timer acceso", "Spenta la ciabatta del PC di notte"],
  crew: ["Pulizia argini con la 4B: 14 sacchi!", "Swap party organizzato in biblioteca"],
};

const ACTION_LIST = Object.keys(CAPTIONS) as ActionId[];

function postsFor(now: number, me: string): Post[] {
  const out: Post[] = [];
  // A steady, uneven week: a few keen people, everyone else now and then.
  const weight = [6, 5, 5, 4, 4, 3, 3, 3, 2, 2, 2, 1];
  PEOPLE.forEach((u, ui) => {
    for (let k = 0; k < weight[ui]; k++) {
      const action = ACTION_LIST[(ui * 3 + k * 7) % ACTION_LIST.length];
      const caps = CAPTIONS[action];
      const ago = ((ui * 11 + k * 17) % 150) * H + (k === 0 && ui < 4 ? 0 : 2 * H);
      const thiene = ui % 3 === 2;
      out.push({
        id: `demo-post-${u.id}-${k}`,
        authorId: u.id,
        action,
        photo: PHOTO[action],
        proof: clip[action],
        caption: caps[(ui + k) % caps.length],
        place: thiene ? "Thiene" : "Schio",
        createdAt: now - ago - ui * 37 * 60e3,
        verifiedBy: ids.filter((id, j) => id !== u.id && (j + k + ui) % 3 === 0).slice(0, 4),
        reactions: { "💚": (ui + k) % 7, "🔥": (ui * k) % 4 },
        comments: [],
        comuneId: thiene ? THIENE_ID : SCHIO.id,
        audience: "comune",
        spotId: action === "pickup" && k === 0 ? "demo-spot-3" : undefined,
      });
    }
  });
  // Yours: enough to sit mid-table in the city, near the top of your class.
  const mine: [ActionId, number][] = [["move", 4 * H], ["refill", 28 * H], ["pickup", 52 * H], ["rewear", 80 * H], ["plant", 110 * H]];
  mine.forEach(([action, ago], k) =>
    out.push({
      id: `demo-post-me-${k}`,
      authorId: me,
      action,
      photo: PHOTO[action],
      proof: clip[action],
      caption: CAPTIONS[action][0],
      place: "Schio",
      createdAt: now - ago,
      verifiedBy: ids.slice(k, k + 3),
      reactions: { "💚": 3 + k },
      comments: [],
      comuneId: SCHIO.id,
      audience: "comune",
    }),
  );
  return out.sort((a, b) => b.createdAt - a.createdAt);
}

// ---------- challenges ----------

function challengesFor(now: number, me: string): { challenges: CommunityChallenge[]; entries: ChallengeEntry[] } {
  const challenges: CommunityChallenge[] = [
    { id: "demo-ch-cleanup", communityId: ALTO_VICENTINO.id, template: "cleanup", title: "", body: "", category: "events", goal: 8, startsAt: now - 9 * D, endsAt: now + 12 * D, createdBy: "cm-nicola" },
    { id: "demo-ch-places", communityId: ALTO_VICENTINO.id, template: "fivePlaces", title: "", body: "", category: "discover", goal: 5, startsAt: now - 4 * D, endsAt: now + 10 * D, createdBy: "cm-chiara" },
    { id: "demo-ch-class", communityId: CLASS.id, title: "Una settimana senza bottigliette", body: "Solo borraccia, a scuola e fuori. Ogni proof di ricarica vale un punto per la classe.", goal: 40, startsAt: now - 3 * D, endsAt: now + 4 * D, createdBy: "cm-elena" },
    { id: "demo-ch-ride", communityId: FRIENDS.id, title: "100 km in bici a ottobre", body: "Sommiamo i chilometri del gruppo: ogni uscita conta.", goal: 20, startsAt: now - 20 * D, endsAt: now + 8 * D, createdBy: "cm-marco" },
  ];
  const entries: ChallengeEntry[] = [];
  const add = (challengeId: string, userId: string, ago: number, spotId?: string, note = "") =>
    entries.push({ id: `demo-e-${entries.length}`, challengeId, userId, spotId, note, createdAt: now - ago });
  ["cm-nicola", "cm-luca", "cm-elena", "cm-giulia", "cm-davide", me].forEach((u, i) => add("demo-ch-cleanup", u, (i + 1) * 20 * H, i < 2 ? "demo-spot-3" : undefined, "Un sacco di plastica e vetro"));
  [["cm-chiara", "demo-spot-1"], ["cm-luca", "demo-spot-11"], ["cm-sara", "demo-spot-13"]].forEach(([u, s], i) => add("demo-ch-places", u, (i + 1) * 15 * H, s));
  [...ids.slice(0, 7), me].forEach((u, i) => {
    for (let k = 0; k <= i % 4; k++) add("demo-ch-class", u, (i * 5 + k * 9) * H, undefined, "Borraccia ✔︎");
  });
  ["cm-marco", "cm-davide", "cm-tommaso", me].forEach((u, i) => {
    for (let k = 0; k < 4 - (i % 2); k++) add("demo-ch-ride", u, (i * 30 + k * 60) * H, undefined, `${12 + k * 3} km`);
  });
  return { challenges, entries };
}

// ---------- load ----------

export function loadCommunityDemo() {
  const now = Date.now();
  const app = useApp.getState();
  if (!app.onboarded) app.finishOnboarding({ name: "Alex Dalla Via", handle: "alex.dv", role: "student" });
  if (!useApp.getState().comune) useApp.getState().setComune(SCHIO);
  const me = useApp.getState().userId;

  const posts = postsFor(now, me);
  const profiles = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));
  const a = useApp.getState();
  const kept = a.posts.filter((p) => !p.id.startsWith("demo-post-"));
  useApp.setState({ posts: [...posts, ...kept], profiles: { ...a.profiles, ...profiles } });

  const { challenges, entries } = challengesFor(now, me);
  const member = (userId: string, role: Member["role"] = "member"): Member => ({ userId, role });
  const c = useCommunity.getState();
  const isDemo = (id: string) => id.startsWith("demo-");
  useCommunity.setState({
    primary: ALTO_VICENTINO.id,
    roles: { ...c.roles, [ALTO_VICENTINO.id]: "member", [CLASS.id]: "member", [FRIENDS.id]: "moderator" },
    catalog: [...c.catalog.filter((x) => !isDemo(x.id)), CLASS, FRIENDS],
    spots: [...spotsFor(now, me), ...c.spots.filter((s) => !isDemo(s.id))],
    challenges: [...c.challenges.filter((x) => !isDemo(x.id)), ...challenges],
    entries: [...c.entries.filter((x) => !isDemo(x.id)), ...entries],
    members: {
      ...c.members,
      [ALTO_VICENTINO.id]: [member(me), ...ids.map((u) => member(u, u === "cm-nicola" || u === "cm-paolo" ? "moderator" : "member"))],
      [CLASS.id]: [member(me), member("cm-elena", "moderator"), ...["cm-giulia", "cm-marco", "cm-sara", "cm-luca", "cm-chiara", "cm-anna", "cm-tommaso"].map((u) => member(u))],
      [FRIENDS.id]: [member(me, "moderator"), ...["cm-marco", "cm-davide", "cm-tommaso", "cm-irene"].map((u) => member(u))],
    },
    postIds: { ...c.postIds, [ALTO_VICENTINO.id]: posts.map((p) => p.id) },
    invites: { ...c.invites, [CLASS.id]: "SCHIO4B", [FRIENDS.id]: "GIOVEDI" },
    saved: { ...c.saved, "demo-spot-1": now - 2 * D, "demo-spot-9": now - 5 * H },
    going: { ...c.going, "demo-spot-3": true },
  });
}
