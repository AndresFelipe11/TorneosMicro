import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <h1 className="display mb-2 text-center text-4xl">Entrar</h1>
      <p className="mb-8 text-center text-muted">
        Administradores: correo y contraseña. Capitanes: nombre del equipo y número de WhatsApp.
      </p>
      <LoginForm />
    </div>
  );
}
