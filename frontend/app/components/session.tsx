"use client";

export type SessionUser = {
  role?: string;
  [key: string]: unknown;
};

export type SessionRecipe = {
  recipe_name: string;
  price: number;
  video_url?: string;
  [key: string]: unknown;
};

export function getCurrentCustomer(): SessionUser | null {
  try {
    const raw = localStorage.getItem("current_customer");
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function setSelectedRecipe(recipe: SessionRecipe) {
  try {
    sessionStorage.setItem("selected_recipe", JSON.stringify(recipe));
  } catch {
    // Ignore storage failures in kiosk mode
  }
}

export function getSelectedRecipe(): SessionRecipe | null {
  try {
    const raw = sessionStorage.getItem("selected_recipe");
    if (!raw) return null;
    return JSON.parse(raw) as SessionRecipe;
  } catch {
    return null;
  }
}

type LogoutNavigate = (path: string) => void;

type LogoutOptions = {
  navigate?: LogoutNavigate;
  destination?: string;
};

export function logout(arg?: LogoutNavigate | LogoutOptions) {
  try {
    localStorage.removeItem("current_customer");
    localStorage.removeItem("api_token");
    sessionStorage.removeItem("selected_recipe");
  } catch {
    // ignore storage cleanup failures
  }

  const destination = typeof arg === "function" ? "/" : arg?.destination ?? "/";
  const navigate = typeof arg === "function" ? arg : arg?.navigate;

  if (navigate) {
    navigate(destination);
    return;
  }

  if (typeof window !== "undefined") {
    window.location.href = destination;
  }
}
