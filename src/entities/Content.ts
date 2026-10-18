import { ContentType } from './constants';
import { isHttpUrl } from './validation';

export interface ContentProps {
  id?: number | null;
  taskId?: number | null;
  contentType: ContentType;
  filePath?: string | null;
  body?: string | null;
  url?: string | null;
}

export interface ContentRow {
  id: number;
  task_id: number;
  content_type: ContentType;
  file_path: string | null;
  body: string | null;
  url: string | null;
}

/**
 * Content for a lecture note or reading assignment.
 * - pdf:             filePath points to the stored PDF
 * - markdown / text: body holds the text (or filePath points to an uploaded document)
 * - url:             url points to external content
 */
export class Content {
  id: number | null;
  taskId: number | null;
  contentType: ContentType;
  filePath: string | null;
  body: string | null;
  url: string | null;

  constructor({ id = null, taskId = null, contentType, filePath = null, body = null, url = null }: ContentProps) {
    if (!Object.values(ContentType).includes(contentType)) {
      throw new Error(`Invalid content type: ${contentType}`);
    }
    if (contentType === ContentType.URL && !isHttpUrl(url)) {
      throw new Error('URL content requires a valid http(s) url');
    }
    if (contentType === ContentType.PDF && !filePath) {
      throw new Error('PDF content requires a filePath');
    }
    if ((contentType === ContentType.MARKDOWN || contentType === ContentType.TEXT) && !body && !filePath) {
      throw new Error(`${contentType} content requires a body or filePath`);
    }

    this.id = id;
    this.taskId = taskId;
    this.contentType = contentType;
    this.filePath = filePath;
    this.body = body;
    this.url = url;
  }

  static fromRow(row: ContentRow): Content {
    return new Content({
      id: row.id,
      taskId: row.task_id,
      contentType: row.content_type,
      filePath: row.file_path,
      body: row.body,
      url: row.url,
    });
  }
}
