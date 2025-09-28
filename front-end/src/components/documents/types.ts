// src/components/documents/types.ts
export interface Document {
  id: number;
  document_name: string;
  document_type: string;
  entity_type: string | null;
  entity_id: number | null;
  file_size: number;
  uploaded_by_name: string;
  created_at: string;
  category_name: string;
}

export interface Category {
  id: number;
  name: string;
  is_system: boolean;
}