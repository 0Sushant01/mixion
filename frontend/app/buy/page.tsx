import { redirect } from "next/navigation";

export default function BuyRedirectPage() {
  // redirect server-side to the products route
  redirect("/products");
}
