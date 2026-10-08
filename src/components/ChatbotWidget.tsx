import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// All available services for matching
const ALL_SERVICES = [
  "Iniezione intramuscolare", "Iniezione sottocutanea", "Iniezione endovenosa",
  "Medicazione semplice", "Medicazione complessa",
  "Medicazione ferita chirurgica", "Medicazione ulcera da pressione", "Medicazione ulcera venosa",
  "Rimozione punti di sutura", "Rimozione graffette chirurgiche",
  "Cateterismo vescicale maschile", "Cateterismo vescicale femminile",
  "Gestione e sostituzione catetere vescicale", "Clistere evacuativo",
  "Infusione endovenosa (flebo)", "Terapia infusionale sottocutanea",
  "Somministrazione terapia intramuscolare", "Somministrazione terapia orale",
  "Somministrazione insulina", "Misurazione glicemia capillare",
  "Misurazione parametri vitali completa", "Misurazione pressione arteriosa",
  "ECG a domicilio", "Gestione stomie (colostomia, ileostomia, urostomia)",
  "Sostituzione sacca stomia", "Gestione nutrizione enterale (SNG/PEG)",
  "Gestione nutrizione parenterale", "Aspirazione tracheale", "Gestione tracheostomia",
  "Gestione drenaggi", "Bendaggio compressivo", "Bendaggio elastocompressivo arti inferiori",
  "Assistenza post-operatoria a domicilio", "Assistenza post-dimissione ospedaliera",
  "Educazione sanitaria al paziente e caregiver", "Educazione alla gestione del diabete",
  "Lavaggio auricolare",
  "Aerosolterapia a domicilio", "Ossigenoterapia domiciliare - avvio e monitoraggio",
  "Assistenza domiciliare continuativa (per ora)", "Assistenza infermieristica notturna (per ora)",
  "Assistenza infermieristica diurna (per ora)",
  "Riabilitazione motoria a domicilio", "Riabilitazione post-operatoria (protesi anca/ginocchio)",
  "Riabilitazione post-frattura", "Riabilitazione post-ictus", "Riabilitazione neurologica",
  "Riabilitazione respiratoria", "Riabilitazione pavimento pelvico", "Riabilitazione sportiva",
  "Linfodrenaggio manuale", "Massoterapia decontratturante", "Terapia manuale ortopedica",
  "Ginnastica posturale a domicilio", "Ginnastica dolce per anziani",
  "Rieducazione alla deambulazione", "Mobilizzazione articolare",
  "Trattamento cervicalgia/lombalgia", "Kinesio taping",
  "Esercizio terapeutico personalizzato", "Stretching terapeutico",
  "Laser terapia", "Laser terapia YAG", "Tecar terapia",
  "Onde d'urto", "Elettrostimolazione", "Ultrasuono", "Valutazione ecografica",
  "Igiene personale completa a letto", "Bagno assistito in vasca/doccia",
  "Vestizione e svestizione assistita", "Cambio pannolone e igiene intima",
  "Mobilizzazione e cambio postura a letto", "Trasferimento letto-carrozzina/poltrona",
  "Assistenza alla deambulazione", "Assistenza ai pasti e imboccamento",
  "Preparazione pasti a domicilio", "Compagnia e sorveglianza diurna (per ora)",
  "Sorveglianza notturna (per ora)", "Accompagnamento a visite mediche",
  "Accompagnamento a passeggiate", "Piccola spesa e commissioni",
  "Stimolazione cognitiva e attività ricreative", "Supporto nella gestione della casa leggera",
  "Assistenza continuativa diurna (per ora)", "Assistenza continuativa notturna (per ora)",
];

interface ChatbotWidgetProps {
  onSelectService?: (service: string) => void;
  professionals?: { profileId: string; nome: string }[];
}

const ChatbotWidget = ({ onSelectService, professionals = [] }: ChatbotWidgetProps) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ciao! 👋 Sono qui per aiutarti a capire quale prestazione fa al caso tuo. Descrivimi il tuo problema o i tuoi sintomi e ti consiglierò la prestazione più adatta." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-assistente", {
        body: { messages: newMessages.map(m => ({ role: m.role, content: m.content })) },
      });

      if (error) throw error;

      const assistantContent = data?.reply || "Mi dispiace, non sono riuscito a rispondere. Riprova.";
      setMessages(prev => [...prev, { role: "assistant", content: assistantContent }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Si è verificato un errore. Riprova tra poco." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBoldClick = useCallback((text: string) => {
    // Check if it matches a service
    const serviceMatch = ALL_SERVICES.find(s => s.toLowerCase() === text.toLowerCase());
    if (serviceMatch) {
      if (onSelectService) {
        onSelectService(serviceMatch);
      }
      setOpen(false);
      return;
    }
    // Check if it matches a professional name
    const profMatch = professionals.find(p => p.nome.toLowerCase() === text.toLowerCase());
    if (profMatch) {
      navigate(`/profilo-infermiere/${profMatch.profileId}`);
      setOpen(false);
      return;
    }
    // Partial match on service
    const partialService = ALL_SERVICES.find(s => s.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(s.toLowerCase()));
    if (partialService && onSelectService) {
      onSelectService(partialService);
      setOpen(false);
      return;
    }
    // Partial match on professional
    const partialProf = professionals.find(p => p.nome.toLowerCase().includes(text.toLowerCase()) || text.toLowerCase().includes(p.nome.toLowerCase()));
    if (partialProf) {
      navigate(`/profilo-infermiere/${partialProf.profileId}`);
      setOpen(false);
    }
  }, [onSelectService, professionals, navigate]);

  // Render message content, making **bold** text clickable
  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      const boldMatch = part.match(/^\*\*(.+)\*\*$/);
      if (boldMatch) {
        const innerText = boldMatch[1];
        return (
          <button
            key={i}
            onClick={() => handleBoldClick(innerText)}
            className="font-bold underline text-primary hover:opacity-80 cursor-pointer inline"
          >
            {innerText}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 bg-primary text-primary-foreground rounded-full p-3 md:p-4 shadow-lg hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
          <span className="text-xs md:text-sm font-medium whitespace-nowrap">Serve aiuto?</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] sm:w-96 h-[28rem] md:h-[32rem] bg-background border rounded-xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-primary text-primary-foreground px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold text-sm">Assistente</span>
            </div>
            <button onClick={() => setOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-foreground rounded-bl-sm"
                }`}>
                  {m.role === "assistant" ? renderMessageContent(m.content) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-secondary px-3 py-2 rounded-xl rounded-bl-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-3 flex gap-2 flex-shrink-0">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Scrivi un messaggio..."
              className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm outline-none"
              disabled={loading}
            />
            <Button size="sm" onClick={handleSend} disabled={loading || !input.trim()} className="px-3">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
