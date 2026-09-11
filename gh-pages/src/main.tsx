import React from "react";
import { createRoot } from "react-dom/client";
import Home from "@/app/page";
import "@/app/globals.css";
import "./pages.css";
import { initial, type RecordItem } from "@/lib/vita-data";

declare global {
  interface Window { __VITA_PAGES__?: boolean }
}

window.__VITA_PAGES__ = true;
document.body.classList.add("pages-demo");

const storageKey = "vita-pages-records-v1";
const loadRecords = (): RecordItem[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]") as RecordItem[];
    const merged = new Map(initial.map((record) => [record.id, record]));
    saved.forEach((record) => merged.set(record.id, record));
    return [...merged.values()];
  } catch {
    return initial;
  }
};

const persist = (records: RecordItem[]) => {
  localStorage.setItem(storageKey, JSON.stringify(records.filter((record) => !initial.some((item) => item.id === record.id) || JSON.stringify(initial.find((item) => item.id === record.id)) !== JSON.stringify(record))));
};

const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  if (!url.startsWith("/api/workspace")) return originalFetch(input, init);

  if (!init?.method || init.method === "GET") {
    return Response.json({ records: loadRecords() });
  }

  const records = loadRecords();
  if (init.body instanceof FormData) {
    const file = init.body.get("file");
    if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) {
      return Response.json({ error: "Selecione um arquivo de até 10 MB." }, { status: 400 });
    }
    const record: RecordItem = {
      id: crypto.randomUUID(), kind: "document", client: String(init.body.get("client") || "helena"),
      name: file.name, size: file.size, category: String(init.body.get("category") || "Outros"),
      date: new Date().toISOString().slice(0, 10), status: "Recebido",
    };
    persist([...records, record]);
    return Response.json({ record });
  }

  const payload = JSON.parse(String(init.body || "{}"));
  const record = { ...payload.record, id: payload.record?.id || crypto.randomUUID() } as RecordItem;
  persist([...records.filter((item) => item.id !== record.id), record]);
  return Response.json({ record });
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><Home /></React.StrictMode>,
);
