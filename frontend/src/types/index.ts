export type StatusType = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  date_joined?: string;
}

export interface Subtopic {
  id: number;
  topic: number;
  title: string;
  status: 'NOT_STARTED' | 'COMPLETED';
  order: number;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Resource {
  id: number;
  topic: number;
  title: string;
  resource_type: 'LINK' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  url: string;
  file?: string | null;
  file_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type CanvasObjectType = 
  | 'text' 
  | 'heading' 
  | 'image' 
  | 'video' 
  | 'audio' 
  | 'pdf' 
  | 'document' 
  | 'link' 
  | 'file' 
  | 'embed';

export interface CanvasObject {
  id: string;
  type: CanvasObjectType;
  posX: number;
  posY: number;
  width: number;
  height?: number;
  zIndex: number;
  textContent?: string;
  url?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  title?: string;
  caption?: string;
  fontSize?: number;
}

export type BlockType = CanvasObjectType;
export type NoteBlock = CanvasObject;

export interface Note {
  id: number;
  user: number;
  topic?: number | null;
  study_goal?: number | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: number;
  user: number;
  topic: number;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  notes?: string;
  created_at: string;
}

export interface Topic {
  id: number;
  module: number;
  module_title?: string;
  goal_id?: number;
  goal_title?: string;
  title: string;
  description: string;
  status: StatusType;
  order: number;
  completed_at?: string | null;
  subtopics: Subtopic[];
  completed_subtopics_count: number;
  total_subtopics_count: number;
  progress_percentage: number;
  total_study_time_seconds: number;
  created_at?: string;
  updated_at?: string;
}

export interface Module {
  id: number;
  study_goal: number;
  title: string;
  description: string;
  order: number;
  topics: Topic[];
  completed_topics_count: number;
  total_topics_count: number;
  progress_percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface StudyGoal {
  id: number;
  user: number;
  title: string;
  description: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  modules: Module[];
  completed_topics_count: number;
  total_topics_count: number;
  progress_percentage: number;
  original_text?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoadmapStructureItem {
  title: string;
  subtopics?: (string | { title: string })[];
}

export interface RoadmapStructureModule {
  title: string;
  description?: string;
  topics: {
    title: string;
    description?: string;
    subtopics?: (string | { title: string })[];
  }[];
}

export interface RoadmapStructure {
  title: string;
  modules: RoadmapStructureModule[];
}
