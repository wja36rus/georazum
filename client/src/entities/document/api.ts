import { apiGet } from "@/shared/api/client";

export type Document = {
  id: "offer" | "privacy" | "refunds";
  title: string;
  updatedAt: string;
  text?: string[];
};

export type DocumentMeta = Omit<Document, "text">;

export const getDocuments = () => apiGet<{ documents: DocumentMeta[] }>("/api/documents");

export const getDocument = (id: string) => apiGet<{ document: Document }>("/api/documents/" + encodeURIComponent(id));
