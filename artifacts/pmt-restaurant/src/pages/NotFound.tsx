import { useRoute } from "wouter";

export default function NotFound() {
  const [match, params] = useRoute("/:rest*");
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground flex-col">
      <h1 className="text-4xl font-serif text-primary mb-4">404</h1>
      <p className="text-muted-foreground mb-8">Page not found at {params?.["rest*"] || "this path"}</p>
      <a href="/" className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium">Return Home</a>
    </div>
  );
}