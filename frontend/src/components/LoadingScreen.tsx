import logoUrl from "../assets/favicon-32.png";

export function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <img src={logoUrl} alt="" className="h-12 w-12 rounded" />
      <h1 className="text-2xl font-bold">flowrite</h1>
      <span className="loading loading-spinner loading-lg" />
    </div>
  );
}
