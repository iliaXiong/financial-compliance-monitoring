import axios, { AxiosError } from 'axios';
import { JSDOM } from 'jsdom';
import {
  WebsiteAnalysisResult,
  DocumentLink,
  DocumentType,
} from '../types';

/**
 * WebsiteAnalyzer interface
 * Defines the contract for analyzing website pages
 */
export interface IWebsiteAnalyzer {
  analyze(websiteUrl: string): Promise<WebsiteAnalysisResult>;
}

/**
 * WebsiteAnalyzer class
 * Analyzes website pages to identify policy content links and document links
 * Implements error handling and retry mechanism with exponential backoff
 */
export class WebsiteAnalyzer implements IWebsiteAnalyzer {
  private readonly maxRetries: number = 3;
  private readonly initialRetryDelay: number = 1000; // 1 second
  private readonly timeout: number = 60000; // 60 seconds (increased for slow websites)

  /**
   * Analyze a website to extract page links and document links
   * @param websiteUrl - The URL of the website to analyze
   * @returns WebsiteAnalysisResult containing page links and document links
   */
  async analyze(websiteUrl: string): Promise<WebsiteAnalysisResult> {
    const startTime = new Date();

    try {
      // Fetch HTML content with retry mechanism
      const html = await this.fetchWithRetry(websiteUrl);

      // Parse HTML and extract links
      const { pageLinks, documentLinks } = this.extractLinks(html, websiteUrl);

      return {
        websiteUrl,
        pageLinks,
        documentLinks,
        analyzedAt: startTime,
      };
    } catch (error) {
      const errorMessage = this.getErrorMessage(error);
      console.error(`[WebsiteAnalyzer] Failed to analyze ${websiteUrl}:`, errorMessage);

      return {
        websiteUrl,
        pageLinks: [],
        documentLinks: [],
        analyzedAt: startTime,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch HTML content with exponential backoff retry mechanism
   * @param url - The URL to fetch
   * @returns HTML content as string
   */
  private async fetchWithRetry(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`[WebsiteAnalyzer] Fetching ${url} (attempt ${attempt + 1}/${this.maxRetries})`);

        const response = await axios.get(url, {
          timeout: this.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FinancialComplianceBot/1.0)',
          },
          maxRedirects: 5,
        });

        return response.data;
      } catch (error) {
        lastError = error as Error;
        const errorMessage = this.getErrorMessage(error);

        console.warn(
          `[WebsiteAnalyzer] Attempt ${attempt + 1} failed for ${url}: ${errorMessage}`
        );

        // Don't retry on client errors (4xx)
        if (axios.isAxiosError(error) && error.response?.status && error.response.status >= 400 && error.response.status < 500) {
          throw new Error(`Client error ${error.response.status}: ${errorMessage}`);
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries - 1) {
          const delay = this.initialRetryDelay * Math.pow(2, attempt);
          console.log(`[WebsiteAnalyzer] Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Failed to fetch URL after retries');
  }

  /**
   * Extract page links and document links from HTML content
   * @param html - HTML content as string
   * @param baseUrl - Base URL for resolving relative links
   * @returns Object containing pageLinks and documentLinks arrays
   */
  private extractLinks(
    html: string,
    baseUrl: string
  ): { pageLinks: string[]; documentLinks: DocumentLink[] } {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const pageLinks: Set<string> = new Set();
    const documentLinks: DocumentLink[] = [];

    // Get all anchor tags
    const anchors = document.querySelectorAll('a[href]');

    anchors.forEach((anchor: Element) => {
      const href = anchor.getAttribute('href');
      if (!href) return;

      try {
        // Resolve relative URLs
        const absoluteUrl = new URL(href, baseUrl).href;

        // Check if it's a document link
        const docType = this.getDocumentType(absoluteUrl);
        if (docType) {
          documentLinks.push({
            url: absoluteUrl,
            type: docType,
            text: anchor.textContent?.trim() || undefined,
          });
        } else if (this.isPolicyRelatedLink(absoluteUrl, anchor.textContent || '')) {
          // Add to page links if it might contain policy content
          pageLinks.add(absoluteUrl);
        }
      } catch (error) {
        // Invalid URL, skip
        console.debug(`[WebsiteAnalyzer] Skipping invalid URL: ${href}`);
      }
    });

    return {
      pageLinks: Array.from(pageLinks),
      documentLinks,
    };
  }

  /**
   * Determine if a URL points to a document and return its type
   * @param url - The URL to check
   * @returns DocumentType if it's a document, null otherwise
   */
  private getDocumentType(url: string): DocumentType | null {
    const urlLower = url.toLowerCase();

    if (urlLower.endsWith('.pdf') || urlLower.includes('.pdf?')) {
      return 'pdf';
    } else if (urlLower.endsWith('.doc') || urlLower.includes('.doc?')) {
      return 'doc';
    } else if (urlLower.endsWith('.docx') || urlLower.includes('.docx?')) {
      return 'docx';
    } else if (urlLower.endsWith('.xls') || urlLower.includes('.xls?')) {
      return 'xls';
    } else if (urlLower.endsWith('.xlsx') || urlLower.includes('.xlsx?')) {
      return 'xlsx';
    }

    return null;
  }

  /**
   * Determine if a link might contain policy-related content
   * @param url - The URL to check
   * @param linkText - The text content of the link
   * @returns true if the link might contain policy content
   */
  private isPolicyRelatedLink(url: string, linkText: string): boolean {
    const policyKeywords = [
      'policy',
      'policies',
      'regulation',
      'compliance',
      'guideline',
      'rule',
      'law',
      'legal',
      '政策',
      '法规',
      '合规',
      '监管',
      '规定',
      '指南',
    ];

    const urlLower = url.toLowerCase();
    const textLower = linkText.toLowerCase();

    // Check if URL or link text contains policy-related keywords
    return policyKeywords.some(
      (keyword) => urlLower.includes(keyword) || textLower.includes(keyword)
    );
  }

  /**
   * Extract error message from various error types
   * @param error - The error object
   * @returns Error message string
   */
  private getErrorMessage(error: unknown): string {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNABORTED') {
        return 'Connection timeout';
      } else if (axiosError.code === 'ENOTFOUND') {
        return 'Domain not found';
      } else if (axiosError.response) {
        return `HTTP ${axiosError.response.status}: ${axiosError.response.statusText}`;
      } else if (axiosError.request) {
        return 'No response received from server';
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unknown error';
  }

  /**
   * Sleep for a specified duration
   * @param ms - Duration in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
