import { PDFParse } from 'pdf-parse';
import AdmZip from 'adm-zip';
import nodePath from 'path';
import fs from 'fs/promises';
import { isArrayBuffer } from 'util/types';
import { Utils } from '../../utils/utils.ts';
import { paths } from '../../utils/get_path.ts';
import { type _raw } from '../../interface/general.interface.ts';

const toArrayBuffer = (buffer: Buffer) => {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
};

export class Parser {

  private static async factory(path: string) {
    console.log(path);

    try {
      const buffer = await fs.readFile(path);
      const arrayBuffer = toArrayBuffer(buffer);
      const ext = nodePath.extname(path).toLowerCase();

      if (ext === '.pdf') {
        return {
          status: true,
          data: await PdfParser(buffer)
        };
      }

      if (isArrayBuffer(arrayBuffer)) {
        if (ext === '.epub') {
          console.log('welcome to epub');
          return {
            status: true,
            data: await EpubParser(arrayBuffer)
          };
        }

        if (ext === '.txt' || ext === '.md') {
          return {
            status: true,
            data: await TxtParser(buffer)
          };
        }

        throw new Error('this format is not supported');
      }

      throw new Error('Invalid array buffer');
    } catch (error: any) {
      return {
        status: false,
        data: String(error)
      }
    }
  }

  public static async parseFile(path: string): Promise<_raw> {

    const parsedArray = await this.factory(path);

    const form: _raw = {
      id: Utils.generateId(),
      content: parsedArray?.data!,
      status: parsedArray?.status!
    }

    return form;
  }
}

const PdfParser = async (buffer: Buffer) => {
  const uint8Array: Uint8Array = Uint8Array.from(buffer);
  
  try {
    const parser = new PDFParse(uint8Array as Uint8Array);
    const data = await parser.getText();
    
    // Fallback logic to determine if it's an image-only (scanned) PDF:
    // If the entire text extracted is essentially empty or extremely sparse, reject it.
    if (!data.text || data.text.trim().length < 20) {
      throw new Error('PDF contains mainly images and cannot be parsed as text.');
    }

    const splited = Utils.lineSplit(data.text);
    return splited;

  } catch (err: any) {
    if (err.message.includes('mainly images')) throw err;
    throw new Error('Invalid buffer format or failed to load PDF: ' + err.message);
  }
}

const EpubParser = async (buffer: ArrayBuffer): Promise<string[]> => {

  try {

    const nodeBuffer = Buffer.from(buffer);
    const zip = new AdmZip(nodeBuffer);

    // Step 1: Find OPF path via META-INF/container.xml
    const containerXml = zip.readAsText('META-INF/container.xml');
    const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
    if (!rootfileMatch) throw new Error('EPUB: rootfile not found in container.xml');

    const opfPath = rootfileMatch[1]!;
    const opfDir = nodePath.dirname(opfPath).replace(/\\/g, '/');

    // Step 2: Parse OPF manifest + spine for chapter order
    const opfContent = zip.readAsText(opfPath);

    const itemMap: Record<string, string> = {};
    for (const match of opfContent.matchAll(/<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"/g)) {
      itemMap[match[1]!] = match[2]!;
    }
    // Also handle reversed attribute order: href before id
    for (const match of opfContent.matchAll(/<item[^>]+href="([^"]+)"[^>]+id="([^"]+)"/g)) {
      if (!itemMap[match[2]!]) itemMap[match[2]!] = match[1]!;
    }

    const spineHrefs: string[] = [];
    for (const match of opfContent.matchAll(/<itemref[^>]+idref="([^"]+)"/g)) {
      const href = itemMap[match[1]!];
      if (href) {
        const fullHref = opfDir ? `${opfDir}/${href}` : href;
        spineHrefs.push(fullHref);
      }
    }

    // Step 3: Read each chapter and clean HTML -> pure text
    const allLines: string[] = [];
    for (const href of spineHrefs) {
      const entry = zip.getEntry(href);
      if (entry) {
        const html = entry.getData().toString('utf-8');
        const clean = stripHtmlToText(html);
        allLines.push(...Utils.lineSplit(clean));
      }
    }

    return allLines;

  } catch (error: any) {
    throw new Error(`EpubParser: ${error.message}`);
  }

}

/**
 * Strips HTML tags and returns clean plain text.
 * Block-level tags (p, div, h1-h6, li, br) are converted to newlines.
 * Scripts/styles/head content are removed entirely.
 * HTML entities are decoded.
 */
function stripHtmlToText(html: string): string {

  let text = html;

  // Remove script, style, head
  text = text.replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, '');

  // Block tags -> newline
  text = text.replace(/<\/(p|div|li|blockquote|section|article)>/gi, '\n');
  text = text.replace(/<(br|hr)[^>]*\/?>/gi, '\n');
  text = text.replace(/<(h[1-6])[^>]*>[\s\S]*?<\/\1>/gi, (m) =>
    m.replace(/<[^>]+>/g, '').trim() + '\n'
  );

  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode common HTML entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>',
    '&quot;': '"', '&apos;': "'", '&#39;': "'",
    '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
  };
  text = text.replace(/&[a-z0-9#]+;/gi, (m) => entities[m.toLowerCase()] ?? m);

  // Collapse and trim each line, remove empty lines
  return text
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 0)
    .join('\n');
}

const TxtParser = async (buffer: Buffer) => {
  return Utils.lineSplit(buffer.toString('utf-8'));
}