import { redirect } from "next/navigation";
import { getAdminUser, isCaptain } from "@/lib/authz";

export default async function AfterLoginPage() {
  const user = await getAdminUser();
  if (!user) redirect("/login");
  if (isCaptain(user)) redirect("/mi-equipo");
  redirect("/admin");
}
