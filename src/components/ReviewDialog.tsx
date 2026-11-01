import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { italianError } from "@/lib/italianErrors";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  booking: { id: string; professional_id: string; patient_id: string; service_name: string } | null;
  onDone: () => void;
};

/** Recensione dopo una prestazione effettuata: da 1 a 5 stelle e un commento facoltativo. */
const ReviewDialog = ({ open, onOpenChange, booking, onDone }: Props) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!booking || rating < 1) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      booking_id: booking.id, patient_id: booking.patient_id, professional_id: booking.professional_id,
      rating, text: text.trim() || null,
    } as any);
    setSaving(false);
    if (error) {
      const dup = (error as any).code === "23505";
      toast({
        title: dup ? "Hai già lasciato una recensione" : "Impossibile salvare la recensione",
        description: dup ? undefined : italianError(error, "booking"),
        variant: dup ? "default" : "destructive",
      });
      if (dup) { onDone(); onOpenChange(false); }
      return;
    }
    toast({ title: "Grazie per la recensione" });
    setRating(0); setText("");
    onDone();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Com'è andata?</DialogTitle>
          <DialogDescription>{booking?.service_name}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1" role="radiogroup" aria-label="Valutazione">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stelle`} onClick={() => setRating(n)} className="p-1">
              <Star className={`w-8 h-8 ${n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
        <Textarea placeholder="Vuoi aggiungere un commento? (facoltativo)" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} />
        <Button onClick={submit} disabled={rating < 1 || saving} className="w-full py-5">{saving ? "Invio…" : "Invia recensione"}</Button>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
