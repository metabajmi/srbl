import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface BackButtonProps {
  to?: string;
  label?: string;
}

export function BackButton({ to = "/", label = "الرئيسية" }: BackButtonProps) {
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
      variant="ghost"
      size="sm"
      onClick={handleBack}
      data-testid="button-back"
    >
      <ArrowRight className="w-4 h-4 ml-2" />
      {label}
    </Button>
  );
}
