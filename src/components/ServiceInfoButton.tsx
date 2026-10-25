import { useEffect, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  hasServiceInfo, loadSchede,
  type SchedaPrestazione, type ServiceInfoAudience,
} from "@/lib/serviceInfo";

interface Props {
  name: string;
  /** Defaults to the signed-in role: professionals see their sheet, everyone else the user sheet. */
  audience?: ServiceInfoAudience;
  className?: string;
}

/**
 * Light-grey "?" icon showing the service info sheet on hover (mouse) or tap/click.
 * Renders nothing for services without a sheet.
 */
const ServiceInfoButton = ({ name, audience, className }: Props) => {
  const { profile } = useAuth();
  const who: ServiceInfoAudience = audience ?? (profile?.role === "professionista" ? "professionista" : "utente");
  const [open, setOpen] = useState(false);
  const [scheda, setScheda] = useState<SchedaPrestazione | null | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);
  const canHover = typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

  useEffect(() => {
    if (!open || scheda !== undefined) return;
    let alive = true;
    loadSchede().then((all) => { if (alive) setScheda(all[name] ?? null); }).catch(() => { if (alive) setScheda(null); });
    return () => { alive = false; };
  }, [open, name, scheda]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  if (!hasServiceInfo(name)) return null;

  const enter = () => {
    if (!canHover) return;
    window.clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const leave = () => {
    if (!canHover) return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 180);
  };

  const sezioni = scheda ? (who === "professionista" ? scheda.professionista : scheda.utente) : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Informazioni su «${name}»`}
          className={cn(
            "inline-flex items-center justify-center flex-shrink-0 rounded-full p-1 text-muted-foreground/50 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
            className,
          )}
          onMouseEnter={enter}
          onMouseLeave={leave}
          onClick={(e) => {
            // Never trigger the surrounding card/row action
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => (canHover ? true : !o));
          }}
        >
          <CircleHelp className="w-5 h-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        collisionPadding={12}
        className="w-[min(24rem,calc(100vw-1.5rem))] max-h-[min(70vh,32rem)] overflow-y-auto p-4"
        onMouseEnter={enter}
        onMouseLeave={leave}
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <p className="font-semibold text-base leading-snug">{name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {who === "professionista" ? "Scheda per il professionista" : "Informazioni per te"}
        </p>
        {scheda === undefined ? (
          <p className="text-sm text-muted-foreground mt-3">Caricamento...</p>
        ) : scheda === null ? (
          <p className="text-sm text-muted-foreground mt-3">Informazioni non disponibili al momento.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {scheda.durata && (
              <p className="text-sm"><span className="font-semibold text-primary">Durata indicativa: </span>{scheda.durata}</p>
            )}
            {sezioni.map((s) => (
              <div key={s.titolo}>
                <p className="text-sm font-semibold text-primary">{s.titolo}</p>
                <p className="text-sm leading-relaxed">{s.testo}</p>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default ServiceInfoButton;
