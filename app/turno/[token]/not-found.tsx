export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Link inválido</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Este link de turno não foi encontrado ou expirou.
        </p>
      </div>
    </div>
  )
}
