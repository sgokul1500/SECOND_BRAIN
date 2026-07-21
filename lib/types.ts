export type ParaCategory = 'project' | 'area' | 'resource' | 'archive';
export type Item = { id: string; user_id: string; type: 'note'|'link'|'file'|'pdf'; title: string | null; raw_content: string | null; source_url: string | null; file_path: string | null; para_category: ParaCategory | null; para_reasoning: string | null; tags: string[] | null; summary: string | null; created_at: string };
export type BrainLink = { id: string; source_id: string; target_id: string; similarity: number; relation_reasoning: string | null };

