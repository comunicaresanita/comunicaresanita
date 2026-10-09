import ossArticleImage from "@/assets/oss-article.jpg";
import homeSafetyArticleImage from "@/assets/home-safety-article.jpg";

export interface BlogArticle {
  slug: string;
  title: string;
  date: string;
  summary: string;
  source: string;
  sourceUrl: string;
  content: string[];
  imageUrl: string;
  imageAlt: string;
}

export const articles: BlogArticle[] = [
  {
    slug: "assistenza-infermieristica-domiciliare-anziani",
    title: "L'importanza dell'assistenza infermieristica domiciliare per gli anziani",
    date: "15 Aprile 2026",
    imageUrl: "https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=800&q=80",
    imageAlt: "Infermiera che assiste un paziente anziano a domicilio",
    summary: "L'assistenza domiciliare consente agli anziani di ricevere cure personalizzate nel comfort della propria casa, riducendo il rischio di infezioni ospedaliere e migliorando la qualità della vita.",
    source: "Organizzazione Mondiale della Sanità (OMS)",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/ageing-and-health",
    content: [
      "L'assistenza infermieristica domiciliare rappresenta una delle risposte più efficaci alla crescente domanda di cure per la popolazione anziana. Secondo l'Organizzazione Mondiale della Sanità, entro il 2050 il numero di persone over 60 raddoppierà, rendendo indispensabile un modello di cura che sia sostenibile e centrato sulla persona.",
      "Il vantaggio principale dell'assistenza domiciliare è la possibilità per il paziente di rimanere nel proprio ambiente familiare, circondato dai propri affetti. Questo aspetto ha un impatto significativo sulla salute psicologica e sulla qualità della vita, riducendo i tassi di depressione e isolamento sociale tipici delle lunghe ospedalizzazioni.",
      "Dal punto di vista clinico, le cure domiciliari riducono il rischio di infezioni ospedaliere (HAI - Healthcare-Associated Infections), che colpiscono milioni di pazienti ogni anno nel mondo. Un infermiere qualificato che opera a domicilio può monitorare i parametri vitali, somministrare terapie, gestire medicazioni complesse e coordinare il piano terapeutico con il medico curante.",
      "L'OMS raccomanda di investire nei servizi sanitari territoriali e domiciliari come pilastro di un sistema sanitario resiliente, evidenziando come questo approccio migliori gli esiti clinici e riduca i costi complessivi per il sistema sanitario nazionale.",
      "In Italia, il Piano Nazionale di Ripresa e Resilienza (PNRR) ha stanziato fondi significativi per potenziare l'assistenza domiciliare integrata (ADI), con l'obiettivo di raggiungere il 10% della popolazione over 65 entro il 2026."
    ]
  },
  {
    slug: "fisioterapista-riabilitazione-post-operatoria",
    title: "Il ruolo del fisioterapista nella riabilitazione post-operatoria",
    date: "8 Aprile 2026",
    imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80",
    imageAlt: "Fisioterapista durante una sessione di riabilitazione con un paziente",
    summary: "La riabilitazione fisioterapica precoce dopo un intervento chirurgico accelera il recupero funzionale e riduce i tempi di degenza.",
    source: "Ministero della Salute",
    sourceUrl: "https://www.salute.gov.it/portale/lea/dettaglioContenutiLea.jsp?id=4833&area=Lea&menu=distrettuale",
    content: [
      "La riabilitazione post-operatoria è una fase cruciale del percorso di guarigione che, se gestita correttamente, può fare la differenza tra un recupero completo e limitazioni funzionali permanenti. Il fisioterapista è il professionista sanitario qualificato che guida il paziente in questo percorso.",
      "Il Ministero della Salute italiano, attraverso i Livelli Essenziali di Assistenza (LEA), riconosce la riabilitazione come diritto del cittadino e definisce le prestazioni di assistenza riabilitativa che devono essere garantite dal Servizio Sanitario Nazionale, sia in regime ospedaliero che domiciliare.",
      "Un programma riabilitativo personalizzato, avviato precocemente dopo l'intervento chirurgico, ha dimostrato di accelerare il recupero della mobilità, ridurre il dolore post-operatorio e diminuire i tempi di degenza ospedaliera. Questo è particolarmente evidente nella chirurgia ortopedica (protesi d'anca e di ginocchio), nella chirurgia cardiaca e negli interventi neurologici.",
      "La fisioterapia domiciliare offre un vantaggio aggiuntivo: il paziente può eseguire gli esercizi nel proprio ambiente, adattando il percorso riabilitativo alle condizioni reali della vita quotidiana. Il fisioterapista valuta anche l'accessibilità dell'abitazione e suggerisce eventuali adattamenti ambientali.",
      "Le linee guida nazionali raccomandano programmi riabilitativi basati sull'evidenza scientifica, personalizzati sulle esigenze individuali del paziente e coordinati con l'équipe medica multidisciplinare."
    ]
  },
  {
    slug: "oss-assistenza-socio-sanitaria",
    title: "OSS: una figura essenziale nell'assistenza socio-sanitaria",
    date: "1 Aprile 2026",
    imageUrl: ossArticleImage,
    imageAlt: "Operatore socio-sanitario che assiste una persona anziana nelle attività quotidiane",
    summary: "L'Operatore Socio-Sanitario svolge un ruolo fondamentale nel supporto alle persone con ridotta autonomia, contribuendo all'igiene personale, alla mobilizzazione e al supporto nelle attività quotidiane.",
    source: "Ministero della Salute",
    sourceUrl: "https://www.salute.gov.it",
    content: [
      "L'Operatore Socio-Sanitario (OSS) è una figura professionale istituita con l'Accordo Stato-Regioni del 22 febbraio 2001 che svolge un ruolo fondamentale nel sistema socio-sanitario italiano. Il Ministero della Salute ne riconosce l'importanza come anello di congiunzione tra l'assistenza sanitaria e quella sociale.",
      "L'OSS opera in diversi contesti: ospedali, residenze sanitarie assistite (RSA), servizi domiciliari e strutture riabilitative. Le sue competenze spaziano dall'igiene e cura della persona, all'assistenza nella mobilizzazione, alla preparazione e somministrazione dei pasti, fino al supporto psicologico e relazionale del paziente e della sua famiglia.",
      "Nel contesto dell'assistenza domiciliare, l'OSS rappresenta spesso il punto di riferimento quotidiano per le persone anziane o con disabilità. La sua presenza consente di mantenere l'autonomia del paziente il più a lungo possibile, prevenendo il ricorso a strutture residenziali.",
      "La formazione dell'OSS prevede un corso di almeno 1000 ore, di cui 450 di tirocinio pratico, che garantisce competenze sia tecniche che relazionali. Il professionista lavora sempre in collaborazione con l'infermiere e sotto la supervisione del personale sanitario.",
      "Con l'invecchiamento della popolazione e l'aumento delle patologie croniche, la domanda di OSS qualificati è in costante crescita, rendendo questa figura professionale sempre più strategica per il sistema sanitario territoriale."
    ]
  },
  {
    slug: "prevenire-cadute-sicurezza-casa",
    title: "Prevenire le cadute: una casa più sicura per gli anziani",
    date: "9 Ottobre 2026",
    imageUrl: homeSafetyArticleImage,
    imageAlt: "Professionista che accompagna una donna anziana vicino a un corrimano in casa",
    summary: "Illuminazione adeguata, percorsi liberi e sostegni stabili aiutano a rendere la casa più sicura. Una valutazione personalizzata può sostenere la mobilità e l'autonomia quotidiana.",
    source: "Organizzazione Mondiale della Sanità (OMS)",
    sourceUrl: "https://www.who.int/news-room/fact-sheets/detail/falls",
    content: [
      "Le cadute sono un problema importante per la salute delle persone anziane. L'Organizzazione Mondiale della Sanità sottolinea che il rischio dipende da diversi fattori, tra cui le condizioni di salute, la mobilità e l'ambiente in cui si vive. La prevenzione richiede quindi attenzione sia alla persona sia agli spazi quotidiani.",
      "In casa è utile mantenere liberi i passaggi, evitare cavi e tappeti instabili e garantire una buona illuminazione, soprattutto lungo il percorso tra camera e bagno. In bagno, superfici antiscivolo e sostegni adeguatamente installati possono rendere più sicuri i movimenti.",
      "Calzature stabili e ausili adatti alle proprie esigenze possono favorire la sicurezza. La scelta di un bastone o di un deambulatore va concordata con un professionista, che può verificarne l'adeguatezza e spiegare come utilizzarlo correttamente.",
      "Un percorso di esercizi per equilibrio, forza e mobilità deve essere personalizzato in base alle condizioni della persona. Il medico e il fisioterapista possono valutare le esigenze individuali e indicare le attività più adatte, evitando soluzioni uguali per tutti.",
      "Se si verificano cadute, capogiri o difficoltà nuove nel camminare, è importante parlarne con il medico. Questi suggerimenti hanno carattere informativo e non sostituiscono una valutazione sanitaria individuale."
    ]
  },
];
