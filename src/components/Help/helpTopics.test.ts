import i18n from 'i18next';
import '../../i18n/config';
import { helpTopics, HelpBlock } from './helpTopics';

// helpTopics が参照する翻訳キーをすべて収集する。example の `code` は
// 生のリテラル書式(翻訳キーではない)なので対象外。
const collectKeys = (block: HelpBlock): string[] => {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'code':
      return [block.key];
    case 'example':
      return block.codeKey ? [block.codeKey, block.descKey] : [block.descKey];
    case 'note':
      return block.keys;
  }
};

const allKeys = helpTopics.flatMap((topic) => [
  topic.titleKey,
  ...topic.blocks.flatMap(collectKeys),
]);

describe('helpTopics', () => {
  it('has unique topic ids', () => {
    const ids = helpTopics.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every topic has at least one block', () => {
    for (const topic of helpTopics) {
      expect(topic.blocks.length).toBeGreaterThan(0);
    }
  });

  // fallbackLng ('en') に頼らず言語ごとの実リソースを直接引く。
  // getResource は keySeparator を処理するので 'help.topics.x.y' 形式も辿れる。
  describe.each(['en', 'ja'])('%s translations', (lng) => {
    it.each(allKeys.map((key) => [key]))('resolves "%s"', (key) => {
      const value = i18n.getResource(lng, 'translation', key);
      expect(typeof value).toBe('string');
      expect((value as string).length).toBeGreaterThan(0);
    });
  });
});
