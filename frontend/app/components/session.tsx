"use client";

import { useRouter } from "next/navigation";

export function getCurrentCustomer() {
  try {
    const raw = localStorage.getItem("current_customer");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export function setSelectedRecipe(recipe: any) {
  try {
    sessionStorage.setItem("selected_recipe", JSON.stringify(recipe));
  } catch (_) {}
}

export function getSelectedRecipe() {
  try {
    const raw = sessionStorage.getItem("selected_recipe");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function logout(navigate?: (path: string) => void) {
  try {
    localStorage.removeItem("current_customer");
    localStorage.removeItem("api_token");
    sessionStorage.removeItem("selected_recipe");
  } catch (_) {}
  if (navigate) navigate("/login");
  else {
    // best-effort
    if (typeof window !== "undefined") window.location.href = "/login";
  }
}
