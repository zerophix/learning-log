export interface LearningEntry {
  id: number;
  topic: string;
  path: string;
  tags: Tag[];
  energy: number;
  ahaMoment: boolean;
}

export interface Tag {
  label: string;
  type: 'design' | 'visual' | 'arch' | 'tech';
}

export interface FilterCategory {
  label: string;
  color: string;
  count: number;
}
