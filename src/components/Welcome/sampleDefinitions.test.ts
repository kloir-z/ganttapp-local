import * as fs from 'fs';
import * as path from 'path';
import i18n from 'i18next';
import '../../i18n/config';
import { allSampleDefinitions, getSampleDefinitions } from './sampleDefinitions';

const samplesDir = path.resolve(__dirname, '../../../public/samples');

describe('sampleDefinitions', () => {
  it('every defined sample file exists under public/samples/', () => {
    for (const sample of allSampleDefinitions) {
      const filePath = path.join(samplesDir, sample.filename);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it('ids are unique within each language list', () => {
    for (const language of ['ja', 'en']) {
      const ids = getSampleDefinitions(language).map((sample) => sample.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  // サンプル定義は言語別リストで、UI はその言語のリストしか表示しない。
  // よって翻訳キーは「自分の言語で」解決できればよい(片側のみの既存キーが多数)。
  it('title/description keys resolve in their own language', () => {
    for (const lng of ['en', 'ja']) {
      for (const sample of getSampleDefinitions(lng)) {
        for (const key of [sample.titleKey, sample.descriptionKey]) {
          const value = i18n.getResource(lng, 'translation', key);
          expect(typeof value).toBe('string');
        }
      }
    }
  });
});
