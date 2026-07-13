export type WorkspaceSectionId =
  | 'overview'
  | 'days'
  | 'flights'
  | 'hotels'
  | 'budget'
  | 'packing'
  | 'documents'
  | 'gallery'
  | 'settings';

export interface WorkspaceSection {
  id: WorkspaceSectionId;
  label: string;
}

export const WORKSPACE_SECTIONS: WorkspaceSection[] = [
  { id: 'overview', label: 'Trip Overview' },
  { id: 'days', label: 'Days' },
  { id: 'flights', label: 'Flights' },
  { id: 'hotels', label: 'Hotels' },
  { id: 'budget', label: 'Budget' },
  { id: 'packing', label: 'Packing' },
  { id: 'documents', label: 'Documents' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'settings', label: 'Settings' },
];
