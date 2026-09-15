"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export async function loginAction(
  _prev: { error: string } | null | undefined,
  formData: FormData,
): Promise<{ error: string } | null> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/despues-de-entrar",
    });
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Usuario o contraseña incorrectos." };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
