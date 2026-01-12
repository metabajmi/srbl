import { Button } from "@/components/ui/button";
import { ArrowRight, Home } from "lucide-react";
import { useLocation } from "wouter";

interface BackButtonProps {
  to?: string;
  label?: string;
}

export function BackButton({ to = "/", label = "رجوع للصفحة الرئيسية" }: BackButtonProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (to) {
      setLocation(to);
    } else {
      window.history.back();
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleBack}
      className="mb-6 gap-2 hover-elevate active-elevate-2"
      data-testid="button-back"
    >
      <Home className="w-4 h-4" />
      <span className="font-semibold">{label}</span>
      <ArrowRight className="w-4 h-4" />
    </Button>
  );
}
