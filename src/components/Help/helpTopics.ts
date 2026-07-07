// src/components/Help/helpTopics.ts
// ヘルプモーダルのトピック定義。UI(HelpModal/HelpTopicContent)とコンテンツを
// 分離するためのデータ。key はすべて i18n の翻訳キーで、help.* は
// helpResources.ts、平坦キー(after_description / cp_basic_format 等)は
// config.ts の既存キー(旧 DependencyHelp / CpHelp と共有)を参照する。
// example の code だけは翻訳キーではなく生のリテラル書式。

export type HelpBlock =
  | { type: 'heading'; key: string }
  | { type: 'paragraph'; key: string }
  | { type: 'code'; key: string }
  | { type: 'example'; code?: string; codeKey?: string; descKey: string }
  | { type: 'note'; keys: string[] };

export interface HelpTopic {
  id: string;
  titleKey: string;
  blocks: HelpBlock[];
}

export const helpTopics: HelpTopic[] = [
  {
    id: 'gettingStarted',
    titleKey: 'help.topics.gettingStarted.title',
    blocks: [
      { type: 'paragraph', key: 'help.topics.gettingStarted.p1' },
      { type: 'paragraph', key: 'help.topics.gettingStarted.p2' },
      { type: 'paragraph', key: 'help.topics.gettingStarted.p3' },
      { type: 'paragraph', key: 'help.topics.gettingStarted.p4' },
    ],
  },
  {
    id: 'tableEditing',
    titleKey: 'help.topics.tableEditing.title',
    blocks: [
      { type: 'paragraph', key: 'help.topics.tableEditing.p1' },
      { type: 'paragraph', key: 'help.topics.tableEditing.p2' },
      { type: 'paragraph', key: 'help.topics.tableEditing.p3' },
      { type: 'paragraph', key: 'help.topics.tableEditing.p4' },
    ],
  },
  {
    id: 'chartBars',
    titleKey: 'help.topics.chartBars.title',
    blocks: [
      { type: 'paragraph', key: 'help.topics.chartBars.p1' },
      { type: 'paragraph', key: 'help.topics.chartBars.p2' },
      { type: 'paragraph', key: 'help.topics.chartBars.p3' },
      { type: 'paragraph', key: 'help.topics.chartBars.p4' },
      { type: 'note', keys: ['help.topics.chartBars.note1'] },
    ],
  },
  {
    id: 'dependencies',
    titleKey: 'help.topics.dependencies.title',
    blocks: [
      { type: 'paragraph', key: 'help.topics.dependencies.p1' },
      { type: 'heading', key: 'Basic Format' },
      { type: 'code', key: 'help.topics.dependencies.format' },
      { type: 'example', codeKey: 'after', descKey: 'after_description' },
      { type: 'example', codeKey: 'sameas', descKey: 'sameas_description' },
      { type: 'example', codeKey: 'plus_number', descKey: 'plus_number_description' },
      { type: 'example', codeKey: 'minus_number', descKey: 'minus_number_description' },
      { type: 'example', codeKey: 'number_only', descKey: 'number_only_description' },
      { type: 'heading', key: 'Examples' },
      { type: 'example', code: 'after, -1, 1', descKey: 'example_1' },
      { type: 'example', code: 'after, +2, 3', descKey: 'example_2' },
      { type: 'example', code: 'sameas, 5', descKey: 'example_3' },
      { type: 'example', code: 'after, -1, -2', descKey: 'example_4' },
      { type: 'paragraph', key: 'help.topics.dependencies.p2' },
      { type: 'note', keys: ['note_1', 'note_2', 'note_3'] },
    ],
  },
  {
    id: 'criticalPath',
    titleKey: 'help.topics.criticalPath.title',
    blocks: [
      { type: 'paragraph', key: 'help.topics.criticalPath.p1' },
      { type: 'heading', key: 'Basic Format' },
      { type: 'code', key: 'cp_basic_format' },
      { type: 'heading', key: 'Examples' },
      { type: 'example', code: '3', descKey: 'cp_example_1' },
      { type: 'example', code: '3, 5', descKey: 'cp_example_2' },
      { type: 'example', code: '5+2', descKey: 'cp_example_3' },
      { type: 'example', code: '5-1', descKey: 'cp_example_4' },
      { type: 'paragraph', key: 'help.topics.criticalPath.p2' },
      { type: 'note', keys: ['cp_note_1', 'cp_note_2', 'cp_note_3'] },
    ],
  },
  {
    id: 'daysOff',
    titleKey: 'help.topics.daysOff.title',
    blocks: [
      { type: 'paragraph', key: 'help.topics.daysOff.p1' },
      { type: 'paragraph', key: 'help.topics.daysOff.p2' },
      { type: 'paragraph', key: 'help.topics.daysOff.p3' },
    ],
  },
  {
    id: 'colors',
    titleKey: 'help.topics.colors.title',
    blocks: [
      { type: 'paragraph', key: 'help.topics.colors.p1' },
      { type: 'paragraph', key: 'help.topics.colors.p2' },
    ],
  },
  {
    id: 'notes',
    titleKey: 'help.topics.notes.title',
    blocks: [
      { type: 'paragraph', key: 'help.topics.notes.p1' },
      { type: 'paragraph', key: 'help.topics.notes.p2' },
    ],
  },
  {
    id: 'saveExport',
    titleKey: 'help.topics.saveExport.title',
    blocks: [
      { type: 'paragraph', key: 'help.topics.saveExport.p1' },
      { type: 'paragraph', key: 'help.topics.saveExport.p2' },
      { type: 'paragraph', key: 'help.topics.saveExport.p3' },
      { type: 'note', keys: ['help.topics.saveExport.note1'] },
    ],
  },
  {
    id: 'historyUndo',
    titleKey: 'help.topics.historyUndo.title',
    blocks: [
      { type: 'paragraph', key: 'help.topics.historyUndo.p1' },
      { type: 'paragraph', key: 'help.topics.historyUndo.p2' },
    ],
  },
];
