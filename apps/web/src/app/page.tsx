import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) redirect("/dashboard");
  } catch {
    // Auth/DB not ready – send to login
  }
  redirect("/login");
}
