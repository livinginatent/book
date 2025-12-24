// Google Books API response types

export interface GoogleBooksSearchResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksVolume[];
}

export interface GoogleBooksVolume {
  kind: string;
  id: string; // Google Books volume ID
  etag: string;
  selfLink: string;
  volumeInfo: GoogleBooksVolumeInfo;
  saleInfo?: {
    country: string;
    saleability: string;
    isEbook: boolean;
  };
  accessInfo?: {
    country: string;
    viewability: string;
    embeddable: boolean;
    publicDomain: boolean;
    textToSpeechPermission: string;
    epub: {
      isAvailable: boolean;
    };
    pdf: {
      isAvailable: boolean;
    };
    webReaderLink: string;
    accessViewStatus: string;
    quoteSharingAllowed: boolean;
  };
  searchInfo?: {
    textSnippet: string;
  };
}

export interface GoogleBooksVolumeInfo {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: Array<{
    type: string; // "ISBN_10" or "ISBN_13"
    identifier: string;
  }>;
  readingModes?: {
    text: boolean;
    image: boolean;
  };
  pageCount?: number;
  printedPageCount?: number;
  dimensions?: {
    height: string;
    width: string;
    thickness: string;
  };
  printType?: string;
  categories?: string[];
  maturityRating?: string;
  allowAnonLogging?: boolean;
  contentVersion?: string;
  panelizationSummary?: {
    containsEpubBubbles: boolean;
    containsImageBubbles: boolean;
  };
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
  language?: string;
  previewLink?: string;
  infoLink?: string;
  canonicalVolumeLink?: string;
  averageRating?: number;
  ratingsCount?: number;
}

// Normalized book data for our application
// Compatible with the existing NormalizedBook interface
export interface NormalizedBook {
  googleBooksId: string;
  openLibraryId?: string; // For backward compatibility
  openLibraryEditionId?: string;
  title: string;
  subtitle?: string;
  authors: string[];
  description?: string;
  subjects: string[];
  publishDate?: string;
  publishers: string[];
  isbn10: string[];
  isbn13: string[];
  pageCount?: number;
  coverUrlSmall?: string;
  coverUrlMedium?: string;
  coverUrlLarge?: string;
  language?: string;
}

