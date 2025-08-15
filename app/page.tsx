import { redirect } from "next/navigation";

export default function Home() {
  redirect("/auth/signin"); // Automatically redirects to the Sign-In page
  return null;
}
