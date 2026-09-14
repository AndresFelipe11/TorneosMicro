import { redirect } from "next/navigation";

export default async function DisciplinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/torneos/${id}`);
}
