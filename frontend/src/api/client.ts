import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://worshipmanageraapp.onrender.com";
const TOKEN_KEY = "louvor_token";

export async function getToken(): Promise<string | null> {
  return await storage.secureGet(TOKEN_KEY, "");
}

export async function setToken(token: string): Promise<void> {
  await storage.secureSet(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await storage.secureRemove(TOKEN_KEY);
}

type ReqOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  auth?: boolean;
};

export async function api<T = any>(path: string, opts: ReqOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = opts;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  
  // O path já deve chegar aqui com o prefixo necessário (ex: "/login" -> "/api/login")
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  
  if (!res.ok) {
    const msg = data?.detail || data?.message || "Erro de conexão";
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data as T;
}