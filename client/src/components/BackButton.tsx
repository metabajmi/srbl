import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
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
      variant="ghost"
      onClick={handleBack}
      className="mb-4"
      data-testid="button-back"
    >
      <ArrowRight className="ml-2 h-4 w-4" />
      {label}
    </Button>
  );
}
