import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ComingSoonProps {
  title: string;
  description?: string;
}

const ComingSoon = ({ title, description }: ComingSoonProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <main className="md:pl-64 min-h-screen">
        <Header />

        <section className="p-6">
          <h1 className="sr-only">{title}</h1>

          <Card className="shadow-card">
            <div className="p-8 md:p-10">
              <div className="max-w-xl">
                <p className="text-sm font-medium text-muted-foreground">Coming soon</p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">
                  {title}
                </h2>
                <p className="mt-3 text-muted-foreground">
                  {description ??
                    "This section is wired in the menu and ready for data—next we can build the full workflow here."}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => navigate(-1)} variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Go back
                  </Button>
                  <Button onClick={() => navigate("/")}>Go to Dashboard</Button>
                </div>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default ComingSoon;
