export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
}

export type BookFormat = 'pdf' | 'epub' | 'txt' | 'md';

export interface Book {
  id: string;
  title: string;
  author?: string;
  description?: string;
  file_type: BookFormat;
  format?: BookFormat;
  total_pages: number;
  current_page: number;
  progress_percent?: number;
  cover_url?: string;
  file_url?: string;
  file_size?: number;
  epub_cfi?: string;
  last_read_at?: string;
  created_at: string;
  updated_at?: string;
  upload_status?: string;
}

export type ReaderTheme = 'plum' | 'sepia' | 'amoled' | 'light';
export type ReadingMode = 'standard' | 'readthrough';
export type FontFamily = 'serif' | 'sans' | 'mono';

export interface ReaderSettings {
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
  fontFamily: FontFamily;
  readingMode: ReadingMode;
  bionicIntensity: number;
  continuousScroll: boolean;
}

export interface Bookmark {
  id: string;
  book_id: string;
  page_number: number;
  title?: string;
  snippet?: string;
  created_at: string;
}

export interface DefinitionInfo {
  definition: string;
  example?: string;
}

export interface PartOfSpeechInfo {
  partOfSpeech: string;
  definitions: DefinitionInfo[];
}

export interface TranslationData {
  translatedText: string;
  isWord: boolean;
  phonetic?: string;
  audioUrl?: string;
  partsOfSpeech?: PartOfSpeechInfo[];
}
