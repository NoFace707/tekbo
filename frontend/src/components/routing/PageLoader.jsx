import { Card, CardContent } from "../ui/card";

export default function PageLoader() {
  return (
    <main className="app-bg flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-center">
            <div className="inline-flex h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-800" />
          </div>
          <p className="text-center text-sm text-slate-500">Cargando página...</p>
        </CardContent>
      </Card>
    </main>
  );
}
