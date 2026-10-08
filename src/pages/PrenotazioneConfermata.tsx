import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import { CheckCircle } from "lucide-react";

const PrenotazioneConfermata = () => (
  <div className="min-h-screen flex flex-col">
    <AuthHeader />
    <main className="flex-1 bg-background py-16 flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 md:mx-6 text-center">
        <CardContent className="p-6 md:p-8">
          <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-xl md:text-senior-2xl font-bold mb-2">Prenotazione avvenuta</h1>
          <p className="text-base md:text-senior-base text-muted-foreground mb-6">
            La tua prenotazione è stata registrata con successo. Verrai ricontattato al più presto dal nostro team.
            Per qualsiasi problema contattaci su <a href="mailto:comunicaresanita@gmail.com" className="text-primary underline break-all">comunicaresanita@gmail.com</a>
          </p>
          <Link to="/">
            <Button className="w-full py-5">Torna alla home</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
    <Footer />
  </div>
);

export default PrenotazioneConfermata;
