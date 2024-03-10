import { redirect } from "next/navigation";

export default function NoIDPresent() {
  // If we go to just "/game" without any id then it would redirect back to "/"
  return redirect("/");
}
