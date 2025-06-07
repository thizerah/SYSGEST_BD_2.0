
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-4 p-4">
        <h1 className="text-6xl font-bold text-sysgest-blue">404</h1>
        <h2 className="text-2xl font-semibold">Página não encontrada</h2>
        <p className="text-muted-foreground">
          A página que você está procurando não existe ou foi removida.
        </p>
        <Button asChild className="mt-4 bg-sysgest-blue hover:bg-sysgest-teal">
          <Link to="/">Voltar para o início</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
