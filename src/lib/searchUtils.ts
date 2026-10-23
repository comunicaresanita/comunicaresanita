// Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
  return dp[m][n];
}

// Synonym map: alternative terms → canonical terms found in service names
const synonymMap: Record<string, string[]> = {
  "iniezione": ["intramuscolare", "sottocutanea", "eparina", "insulina"],
  "iniezioni": ["intramuscolare", "sottocutanea", "eparina", "insulina"],
  "puntura": ["intramuscolare", "sottocutanea", "eparina"],
  "punture": ["intramuscolare", "sottocutanea", "eparina"],
  "siringa": ["intramuscolare", "sottocutanea"],
  "punturina": ["eparina", "sottocutanea"],
  "flebo": ["infusione endovenosa", "infusionale"],
  "fleboclisi": ["infusione endovenosa"],
  "endovena": ["infusione endovenosa"],
  "ago": ["intramuscolare", "sottocutanea", "infusione"],
  "ferita": ["medicazione", "ferita"],
  "piaga": ["lesione da pressione", "medicazione"],
  "decubito": ["lesione da pressione"],
  "ulcera": ["lesione da pressione"],
  "catetere": ["cateterismo", "catetere vescicale", "catetere venoso"],
  "sonda": ["sondino", "sonda rettale"],
  "sng": ["sondino nasogastrico"],
  "nutrizione": ["nutrizione enterale", "nutrizione parenterale"],
  "clistere": ["clistere evacuativo", "clisma", "microclisma"],
  "enteroclisma": ["clisma", "clistere evacuativo"],
  "stitichezza": ["clistere", "clisma", "microclisma"],
  "pressione": ["parametri vitali"],
  "parametri": ["parametri vitali"],
  "stomia": ["colostomia", "ileostomia", "urostomia", "nefrostomia", "tracheostomia"],
  "sacchetto": ["colostomia", "ileostomia", "urostomia"],
  "tracheotomia": ["tracheostomia"],
  "benda": ["bendaggio"],
  "fasciatura": ["bendaggio"],
  "calza": ["elastocompressivo", "compressivo"],
  "gambe": ["arti inferiori", "bendaggio"],
  "diabete": ["insulina", "glicemia"],
  "zucchero": ["glicemia"],
  "glicemia": ["glicemia capillare"],
  "insulina": ["insulina"],
  "aerosol": ["aerosolterapia"],
  "inalatore": ["inalatoria"],
  "spray": ["inalatoria", "gocce nasali"],
  "orecchio": ["gocce auricolari"],
  "orecchie": ["gocce auricolari"],
  "naso": ["gocce nasali"],
  "occhi": ["colliri", "oftalmici"],
  "collirio": ["colliri"],
  "supposta": ["rettale"],
  "supposte": ["rettale"],
  "pomata": ["topica"],
  "crema": ["topica"],
  "cerotto": ["transdermico"],
  "ovuli": ["vaginale"],
  "pillole": ["terapia orale", "sublinguale"],
  "farmaci": ["somministrazione", "terapia"],
  "medicine": ["somministrazione", "terapia orale"],
  "port": ["port a cath"],
  "pompa": ["pompa"],
  "ipodermoclisi": ["ipodermoclisi"],
  "eparina": ["eparina"],
  "massaggio": ["massoterapia", "linfodrenaggio"],
  "fisioterapia": ["riabilitazione"],
  "riabilitazione": ["riabilitazione"],
  "ginnastica": ["ginnastica posturale", "ginnastica dolce"],
  "posturale": ["ginnastica posturale"],
  "cervicale": ["cervicalgia"],
  "schiena": ["lombalgia", "cervicalgia"],
  "lombare": ["lombalgia"],
  "protesi": ["post-operatoria"],
  "anca": ["protesi anca"],
  "ginocchio": ["protesi ginocchio"],
  "ictus": ["post-ictus"],
  "pavimento pelvico": ["pavimento pelvico"],
  "linfodrenaggio": ["linfodrenaggio"],
  "taping": ["kinesio taping"],
  "stretching": ["stretching terapeutico"],
  "camminare": ["deambulazione"],
  "camminata": ["deambulazione"],
  "bagno": ["bagno assistito", "igiene personale"],
  "doccia": ["bagno assistito"],
  "igiene": ["igiene personale", "igiene intima"],
  "pannolone": ["pannolone", "cambio pannolone"],
  "pannolino": ["pannolone", "cambio pannolone"],
  "vestire": ["vestizione"],
  "alzare": ["mobilizzazione", "trasferimento"],
  "letto": ["mobilizzazione", "igiene personale"],
  "carrozzina": ["trasferimento"],
  "sedia a rotelle": ["trasferimento"],
  "mangiare": ["pasti", "imboccamento"],
  "cibo": ["pasti"],
  "compagnia": ["compagnia", "sorveglianza"],
  "notte": ["notturna"],
  "spesa": ["spesa", "commissioni"],
  "commissioni": ["commissioni"],
  "casa": ["gestione della casa"],
  "pulizie": ["gestione della casa"],
  "visita medica": ["accompagnamento a visite"],
  "passeggiata": ["passeggiate"],
  "operazione": ["post-operatoria"],
  "dimissione": ["post-dimissione"],
  "ospedale": ["post-dimissione", "ospedaliera"],
  "educazione": ["educazione sanitaria"],
  "sutura": ["punti di sutura"],
  "punti": ["punti di sutura"],
  "graffette": ["graffette chirurgiche"],
};

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").trim();
}

// Check if a search word fuzzy-matches any word in a target string
function fuzzyWordMatch(searchWord: string, targetWords: string[]): boolean {
  // Exact substring match first
  const targetJoined = targetWords.join(" ");
  if (targetJoined.includes(searchWord)) return true;

  // Levenshtein match against individual words
  const maxDist = searchWord.length <= 3 ? 1 : searchWord.length <= 6 ? 2 : 3;
  return targetWords.some(tw => levenshtein(searchWord, tw) <= maxDist);
}

export function fuzzySearchServices(query: string, services: string[]): string[] {
  if (!query.trim()) return services;

  const normalizedQuery = normalize(query);
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  // Expand query words with synonyms
  const expandedWordSets: string[][] = queryWords.map(word => {
    const expanded = [word];
    // Check if this word (or phrase containing it) has synonyms
    for (const [key, values] of Object.entries(synonymMap)) {
      const normalizedKey = normalize(key);
      if (normalizedKey === word || normalizedKey.includes(word) || word.includes(normalizedKey)) {
        expanded.push(...values.map(v => normalize(v)));
      }
    }
    return Array.from(new Set(expanded));
  });

  // Score each service
  const scored = services.map(service => {
    const normalizedService = normalize(service);
    const serviceWords = normalizedService.split(/\s+/).filter(Boolean);

    let matchCount = 0;
    for (const wordSet of expandedWordSets) {
      const matches = wordSet.some(w => fuzzyWordMatch(w, serviceWords));
      if (matches) matchCount++;
    }

    return { service, score: matchCount, total: expandedWordSets.length };
  });

  // Filter: at least half the words must match, or all if only 1-2 words
  const minMatch = queryWords.length <= 2 ? queryWords.length : Math.ceil(queryWords.length * 0.5);
  const filtered = scored.filter(s => s.score >= minMatch);

  // Sort by match quality
  filtered.sort((a, b) => b.score - a.score);

  return filtered.map(s => s.service);
}

// Haversine distance in km
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
