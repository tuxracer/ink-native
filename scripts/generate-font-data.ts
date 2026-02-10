/**
 * BDF Font Data Generator
 *
 * Parses a BDF bitmap font file and generates a TypeScript module
 * containing glyph bitmap data as a Map<number, Uint8Array>.
 *
 * Usage: npx tsx scripts/generate-font-data.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(CURRENT_DIR, "..");
const BDF_PATH = resolve(PROJECT_ROOT, "fonts/Cozette.bdf");
const OUTPUT_PATH = resolve(
  PROJECT_ROOT,
  "src/BitmapFont/glyphData.ts"
);

/** Cell dimensions for the monospace font */
const CELL_WIDTH = 6;

/** Double the standard cell width for wide (DWIDTH >= 12) glyphs */
const WIDE_CELL_WIDTH = CELL_WIDTH * 2;

interface BdfGlyph {
  encoding: number;
  dwidth: number;
  bbxW: number;
  bbxH: number;
  bbxXOff: number;
  bbxYOff: number;
  bitmapHex: string[];
}

interface BdfFont {
  ascent: number;
  descent: number;
  glyphs: BdfGlyph[];
}

const parseBdf = (content: string): BdfFont => {
  const lines = content.split("\n");
  let ascent = 10;
  let descent = 3;
  const glyphs: BdfGlyph[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!.trim();

    if (line.startsWith("FONT_ASCENT ")) {
      ascent = parseInt(line.split(" ")[1]!, 10);
    } else if (line.startsWith("FONT_DESCENT ")) {
      descent = parseInt(line.split(" ")[1]!, 10);
    } else if (line === "STARTCHAR") {
      // Skip unnamed chars
    } else if (line.startsWith("STARTCHAR ")) {
      // Parse a glyph
      let encoding = -1;
      let dwidth = CELL_WIDTH;
      let bbxW = 0,
        bbxH = 0,
        bbxXOff = 0,
        bbxYOff = 0;
      const bitmapHex: string[] = [];
      let inBitmap = false;

      i++;
      while (i < lines.length) {
        const gLine = lines[i]!.trim();

        if (gLine === "ENDCHAR") {
          break;
        }

        if (inBitmap) {
          if (gLine.length > 0) {
            bitmapHex.push(gLine);
          }
        } else if (gLine.startsWith("ENCODING ")) {
          encoding = parseInt(gLine.split(" ")[1]!, 10);
        } else if (gLine.startsWith("DWIDTH ")) {
          dwidth = parseInt(gLine.split(" ")[1]!, 10);
        } else if (gLine.startsWith("BBX ")) {
          const parts = gLine.split(" ");
          bbxW = parseInt(parts[1]!, 10);
          bbxH = parseInt(parts[2]!, 10);
          bbxXOff = parseInt(parts[3]!, 10);
          bbxYOff = parseInt(parts[4]!, 10);
        } else if (gLine === "BITMAP") {
          inBitmap = true;
        }

        i++;
      }

      if (encoding >= 0) {
        glyphs.push({ encoding, dwidth, bbxW, bbxH, bbxXOff, bbxYOff, bitmapHex });
      }
    }

    i++;
  }

  return { ascent, descent, glyphs };
};

/**
 * Rasterize a BDF glyph into a fixed-size cell.
 *
 * Narrow glyphs (DWIDTH < 12): 1 byte per row, cellHeight bytes total.
 * Wide glyphs (DWIDTH >= 12): 2 bytes per row, cellHeight * 2 bytes total.
 *
 * Bit layout is MSB-first: byte0 bit7 = col 0, byte0 bit0 = col 7,
 * byte1 bit7 = col 8, byte1 bit4 = col 11.
 */
const rasterizeGlyph = (
  glyph: BdfGlyph,
  cellHeight: number,
  ascent: number
): Uint8Array => {
  const isWide = glyph.dwidth >= WIDE_CELL_WIDTH;
  const cellWidth = isWide ? WIDE_CELL_WIDTH : CELL_WIDTH;
  const bytesPerRow = isWide ? 2 : 1;
  const cell = new Uint8Array(cellHeight * bytesPerRow);

  const topRow = ascent - glyph.bbxYOff - glyph.bbxH;

  for (let row = 0; row < glyph.bbxH && row < glyph.bitmapHex.length; row++) {
    const cellRow = topRow + row;
    if (cellRow < 0 || cellRow >= cellHeight) {
      continue;
    }

    const hexStr = glyph.bitmapHex[row]!;
    const hexValue = parseInt(hexStr, 16);
    const totalBits = hexStr.length * 4;

    // Extract pixels and place in cell bytes
    let byte0 = 0;
    let byte1 = 0;
    for (let bit = 0; bit < glyph.bbxW; bit++) {
      const pixelOn = (hexValue >> (totalBits - 1 - bit)) & 1;
      const cellCol = glyph.bbxXOff + bit;
      if (cellCol >= 0 && cellCol < cellWidth && pixelOn) {
        if (cellCol < 8) {
          byte0 |= 1 << (7 - cellCol);
        } else {
          byte1 |= 1 << (15 - cellCol);
        }
      }
    }

    const idx = cellRow * bytesPerRow;
    cell[idx] = byte0;
    if (isWide) {
      cell[idx + 1] = byte1;
    }
  }

  return cell;
};

const generateOutput = (font: BdfFont): string => {
  const cellHeight = font.ascent + font.descent;
  const entries: string[] = [];

  // Include all printable glyphs from the font
  const includedGlyphs = font.glyphs.filter((g) => g.encoding >= 32);

  for (const glyph of includedGlyphs) {
    const cell = rasterizeGlyph(glyph, cellHeight, font.ascent);

    // Format as comma-separated hex values
    const bytes = Array.from(cell)
      .map((b) => `0x${b.toString(16).padStart(2, "0")}`)
      .join(", ");

    entries.push(`  [${glyph.encoding}, new Uint8Array([${bytes}])]`);
  }

  return `/**
 * Generated Bitmap Font Data
 *
 * Auto-generated from Cozette.bdf by scripts/generate-font-data.ts
 * DO NOT EDIT MANUALLY
 *
 * @generated
 * Narrow glyphs: ${cellHeight} bytes (1 byte/row, ${CELL_WIDTH}px wide).
 * Wide glyphs: ${cellHeight * 2} bytes (2 bytes/row, ${CELL_WIDTH * 2}px wide).
 * Bit layout is MSB-first: byte bit 7 = leftmost pixel.
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

export const GLYPH_DATA: Map<number, Uint8Array> = new Map([
${entries.join(",\n")},
]);
`;
};

// Main
const bdfContent = readFileSync(BDF_PATH, "utf8");
const font = parseBdf(bdfContent);
const output = generateOutput(font);
writeFileSync(OUTPUT_PATH, output, "utf8");

const cellHeight = font.ascent + font.descent;
const includedGlyphs = font.glyphs.filter((g) => g.encoding >= 32);
const wideCount = includedGlyphs.filter((g) => g.dwidth >= CELL_WIDTH * 2).length;
console.log(
  `Generated ${OUTPUT_PATH}:\n` +
    `  Cell: ${CELL_WIDTH}x${cellHeight} (wide: ${CELL_WIDTH * 2}x${cellHeight})\n` +
    `  Glyphs: ${includedGlyphs.length} (${wideCount} wide)\n` +
    `  Font ascent: ${font.ascent}, descent: ${font.descent}`
);
