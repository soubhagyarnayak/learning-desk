export const TaskType = {
  LECTURE_NOTE: 'lecture_note',
  LECTURE_VIDEO: 'lecture_video',
  CODING_ASSIGNMENT: 'coding_assignment',
  READING_ASSIGNMENT: 'reading_assignment',
  WRITING_ASSIGNMENT: 'writing_assignment',
  LAB_ASSIGNMENT: 'lab_assignment',
} as const;
export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const TaskTypeLabel: Record<TaskType, string> = {
  lecture_note: 'Lecture note',
  lecture_video: 'Lecture video',
  coding_assignment: 'Coding assignment',
  reading_assignment: 'Reading assignment',
  writing_assignment: 'Writing assignment',
  lab_assignment: 'Lab assignment',
};

// How a piece of content is stored: an uploaded file, inline text, or an external link.
export const ContentType = {
  PDF: 'pdf',
  MARKDOWN: 'markdown',
  TEXT: 'text',
  URL: 'url',
} as const;
export type ContentType = (typeof ContentType)[keyof typeof ContentType];

export const ContentTypeLabel: Record<ContentType, string> = {
  pdf: 'PDF',
  markdown: 'Markdown',
  text: 'Text document',
  url: 'External URL',
};

export const SessionStatus = {
  PLANNED: 'planned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];
