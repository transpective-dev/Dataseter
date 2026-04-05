import { PDFParse } from 'pdf-parse';
import * as pdfjs from 'pdfjs-dist';
import AdmZip from 'adm-zip';
import nodePath from 'path';
import fs from 'fs/promises';
import { isArrayBuffer } from 'util/types';
import { Utils } from '../../utils';
import { getPaths } from '../../get_path';
import { _raw } from '../../general.interface';

const toArrayBuffer = (buffer: Buffer) => {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
};

export class Parser {

  private async factory(path: string) {

    console.log(path)

    const buffer: Buffer | ArrayBuffer = await fs.readFile(path);

    try {

      const arrayBuffer = toArrayBuffer(buffer);

      if (path.endsWith('.pdf')) {

        return await PdfParser(buffer);

      }

      if (isArrayBuffer(arrayBuffer)) {

        if (path.endsWith('.epub')) {

          console.log('welcome to epub')

          return await EpubParser(arrayBuffer);

        }

        if (path.endsWith('.txt') || path.endsWith('.md')) {

          return await TxtParser(buffer);

        }

        throw new Error('this format is not supported');

      }
    } catch (error: any) {
      throw error;
    }

  }

  public async parseFile(path: string): Promise<_raw> {

    const parsedArray = await this.factory(path);

    const form: _raw = {
      id: Utils.generateId(),
      content: parsedArray as string[],
    }

    return form;
  }
}

import path from 'path'

const PdfParser = async (buffer: Buffer) => {

  const arrayBuffer = toArrayBuffer(buffer);

  let pdf: pdfjs.PDFDocumentProxy | null = null

  if (isArrayBuffer(arrayBuffer)) {

    // getDocument from buffer
    let loadingTask = pdfjs.getDocument({ data: arrayBuffer });

    // await loading finished
    pdf = await loadingTask.promise;

    // discriminate pdf type
    const isTxt = await (async () => {

      // count text and image operations
      let textOps = 0;
      let imageOps = 0;

      //  check first 10 pages
      for (let i = 1; i <= 10; i++) {

        const page = await pdf.getPage(i);
        const ops = await page.getOperatorList();

        textOps += ops.fnArray.filter(fn => fn === pdfjs.OPS.showText).length;
        imageOps += ops.fnArray.filter(fn => fn === pdfjs.OPS.paintImageXObject).length;

      }

      // calculate image ratio
      const imageRatio = () => {

        if (textOps + imageOps === 0) {
          console.error('something went wrong with parsing pdf');
        }

        return imageOps / (textOps + imageOps);

      }

      return imageRatio() > 0.9 ? false : true;

    })();

    if (isTxt) {

      const uint8Array: Uint8Array = Uint8Array.from(buffer);
      const parser = new PDFParse(uint8Array as Uint8Array);
      const data = await parser.getText();
      const splited = Utils.lineSplit(data.text)

      const { pretestWrite } = await import('./../../utils');
      pretestWrite(splited, path.join(getPaths().main, 'pretest.md.md'))
      return splited;

    }

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
    const opfPath = rootfileMatch[1];
    const opfDir = nodePath.dirname(opfPath).replace(/\\/g, '/');

    // Step 2: Parse OPF manifest + spine for chapter order
    const opfContent = zip.readAsText(opfPath);

    const itemMap: Record<string, string> = {};
    for (const match of opfContent.matchAll(/<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"/g)) {
      itemMap[match[1]] = match[2];
    }
    // Also handle reversed attribute order: href before id
    for (const match of opfContent.matchAll(/<item[^>]+href="([^"]+)"[^>]+id="([^"]+)"/g)) {
      if (!itemMap[match[2]]) itemMap[match[2]] = match[1];
    }

    const spineHrefs: string[] = [];
    for (const match of opfContent.matchAll(/<itemref[^>]+idref="([^"]+)"/g)) {
      const href = itemMap[match[1]];
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