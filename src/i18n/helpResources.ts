// src/i18n/helpResources.ts
// ヘルプモーダル本文の翻訳リソース。config.ts の resources に "help" として
// ネストされる(参照は t('help.topics.gettingStarted.title') 形式)。
// 依存関係・CP列の書式説明は config.ts 側の既存平坦キー
// (after_description / cp_basic_format 等)を helpTopics.ts が直接参照するため
// ここには持たない。

export const helpEn = {
  title: "How to Use",
  topics: {
    gettingStarted: {
      title: "Getting Started",
      p1: "The screen consists of the WBS table on the left and the Gantt chart on the right. Drag the boundary between them to resize the table.",
      p2: "There are three row types. Chart rows are ordinary task rows with planned and actual bars. Separator rows are section headers that can be collapsed and indented. Event rows can hold multiple bars or milestones in a single row.",
      p3: "To add, copy, cut or delete rows, right-click on the table and choose from the context menu. Multiple rows can be inserted at once.",
      p4: "The quickest way to learn is the tutorial project: open the Welcome screen (\"Local Mode\" > \"Show Welcome Screen\" in the top-right corner) and select the tutorial sample.",
    },
    tableEditing: {
      title: "Editing the Table",
      p1: "Click a cell and type to edit it directly. Date cells accept flexible input such as \"4/1\" and also offer a calendar picker.",
      p2: "Enter either the number of days or the end date — the other one is calculated automatically based on working days.",
      p3: "To reorder rows, select them on the No column and drag.",
      p4: "Column visibility and header names can be changed in Setting > Table. You can also hide the selected columns from the table's right-click menu.",
    },
    chartBars: {
      title: "Chart Bars",
      p1: "Double-click an empty area of the chart to start drawing a planned bar. Move the mouse to stretch it, then click to fix it.",
      p2: "Hold Shift and double-click to draw an actual bar. Actual bars are drawn over planned bars in a translucent color.",
      p3: "Drag the middle of a bar to move it. Drag either end to change its start or end date.",
      p4: "Enter a percentage in the Progress column to overlay a progress indicator on the bar.",
      note1: "Right-click on the chart to delete bars or edit dependencies.",
    },
    dependencies: {
      title: "Dependencies",
      p1: "Enter a dependency in the Dependency column to chain tasks: when the preceding task moves, the dates of dependent tasks are recalculated automatically.",
      format: "[Relationship Type], [Target Row], [Offset Days]",
      p2: "You can also set dependencies visually: editing a dependency cell opens a helper popover, and right-clicking a bar on the chart offers \"Edit dependency\".",
    },
    criticalPath: {
      title: "Critical Path",
      p1: "Enter predecessor row numbers (No) in the CP column to define which tasks logically follow which. This network is independent of the Dependency column and never moves any dates.",
      p2: "Turn on Setting > Show Critical Path (also available in the right-click menu) to highlight critical tasks in red and dim the others. Link arrows are drawn between tasks, and each task's float (slack in working days) is shown next to the bar label.",
    },
    daysOff: {
      title: "Days Off",
      p1: "Configure public holidays and regular days off (weekdays) in Setting > Days Off. Days off are shaded on the chart and excluded from day counts and dependency calculations.",
      p2: "Holidays are entered as plain text, one date per line. Any text after the date (such as the holiday's name) is kept as a memo.",
      p3: "To let a specific task run through days off, check its IncHol column.",
    },
    colors: {
      title: "Bar Colors",
      p1: "Define colors and their aliases (meanings) in Setting > Chart Setting — for example \"Team A\" or \"High priority\". The color of actual bars can be changed there as well.",
      p2: "Type an alias into the Color column of a row to change the color of its planned bar.",
    },
    notes: {
      title: "Notes",
      p1: "Click Notes in the top bar to open the notes window: a tree of notes on the left and a rich-text editor on the right. Use it for meeting minutes and background information — notes are saved into the project file.",
      p2: "Add, rename and delete notes from the tree pane. Notes can be nested freely, and the window can be moved and resized.",
    },
    saveExport: {
      title: "Save & Export",
      p1: "File > Download saves the whole project (chart, settings, notes and history) as a single ZIP file, and File > Upload loads it back. Everything runs inside your browser — no data ever leaves your machine.",
      p2: "File > JSON Data lets you view, copy and import the raw project data as JSON.",
      p3: "File > Export offers three formats: PDF (the full chart as an image), Excel (a styled workbook that reproduces the table and chart), and Standalone HTML (a single self-contained file that shows the finished chart in any browser).",
      note1: "Nothing is saved automatically. Download your project before closing the tab.",
    },
    historyUndo: {
      title: "Undo & History",
      p1: "Edit > Undo / Redo (or Ctrl+Z / Ctrl+Y) reverts editing operations. Up to 30 steps are kept.",
      p2: "The History button saves named snapshots of the whole project so you can review any of them later. While viewing a past state, click \"Return to Latest\" to come back. Snapshots are stored in the project ZIP.",
    },
  },
};

export const helpJa: typeof helpEn = {
  title: "使い方",
  topics: {
    gettingStarted: {
      title: "はじめに",
      p1: "画面は左のWBSテーブルと右のガントチャートで構成されています。境界線をドラッグするとテーブルの幅を変更できます。",
      p2: "行には3つのタイプがあります。チャート行は予定・実績バーを持つ通常のタスク行、セパレータ行は折りたたみと階層化ができるセクション見出し、イベント行は1行に複数のバーやマイルストーンを置ける行です。",
      p3: "行の追加・コピー・切り取り・削除は、テーブル上で右クリックして表示されるメニューから行います。複数行の一括挿入もできます。",
      p4: "一番の近道はチュートリアルプロジェクトです。右上の「ローカルモード」>「ようこそ画面を表示」からようこそ画面を開き、チュートリアルサンプルを選択してください。",
    },
    tableEditing: {
      title: "テーブルの編集",
      p1: "セルをクリックして直接入力できます。日付セルは「4/1」のような柔軟な入力に対応し、カレンダーからの選択もできます。",
      p2: "日数または終了日のどちらかを入力すると、もう一方は稼働日ベースで自動計算されます。",
      p3: "行を並べ替えるには、No列で行を選択してドラッグします。",
      p4: "列の表示/非表示やヘッダ名は「設定 > 表設定」で変更できます。テーブルの右クリックメニューから選択列を非表示にすることもできます。",
    },
    chartBars: {
      title: "チャートバーの操作",
      p1: "チャートの空いている場所をダブルクリックすると予定バーの作成が始まります。マウスを動かして期間を決め、クリックで確定します。",
      p2: "Shiftキーを押しながらダブルクリックすると実績バーを作成できます。実績バーは予定バーに半透明で重なって表示されます。",
      p3: "バーの中央をドラッグすると移動、両端をドラッグすると開始日・終了日を変更できます。",
      p4: "進捗列に%を入力するとバーの上に進捗が表示されます。",
      note1: "チャート上で右クリックすると、バーの削除や依存関係の編集ができます。",
    },
    dependencies: {
      title: "依存関係",
      p1: "依存関係列に入力するとタスク同士が連動し、先行タスクを動かすと後続タスクの日付が自動で再計算されます。",
      format: "[関係タイプ], [対象行], [オフセット日数]",
      p2: "GUIでの設定もできます。依存関係セルの編集時に補助ポップオーバーが開くほか、チャートのバーを右クリックして「依存関係を編集」を選ぶこともできます。",
    },
    criticalPath: {
      title: "クリティカルパス",
      p1: "CP列に先行タスクの行番号(No)を入力して、タスクの論理的なつながり(CPネットワーク)を定義します。このネットワークは依存関係列とは独立しており、日付を動かすことはありません。",
      p2: "「設定 > クリティカルパスを表示」(右クリックメニューにもあります)をONにすると、クリティカルなタスクが赤く強調され、他のタスクは淡色表示になります。タスク間にはリンクの矢印が描かれ、各タスクの余裕日数(フロート)がバーのラベル横に表示されます。",
    },
    daysOff: {
      title: "休日設定",
      p1: "祝日と定休日(曜日)は「設定 > 休日設定」で設定します。休日はチャート上で色付けされ、日数計算や依存関係の計算から除外されます。",
      p2: "祝日はテキストで1行に1日付ずつ入力します。日付の後ろには祝日名などのメモを自由に書けます。",
      p3: "特定のタスクだけ休日も含めて実施したい場合は、その行の「含休日」列にチェックを入れます。",
    },
    colors: {
      title: "バーの色",
      p1: "バーの色とその意味(エイリアス)は「設定 > チャート設定」で定義します(例:「チームA」「優先度高」)。実績バーの色もここで変更できます。",
      p2: "行の色列にエイリアス名を入力すると、その行の予定バーの色が変わります。",
    },
    notes: {
      title: "メモ帳",
      p1: "トップバーの「メモ帳」をクリックすると、左にメモのツリー、右にリッチテキストエディタを備えたメモウィンドウが開きます。議事録や補足情報の記録に使え、メモはプロジェクトファイルと一緒に保存されます。",
      p2: "ツリーペインでメモの追加・名前変更・削除ができます。メモは自由に階層化でき、ウィンドウは移動やサイズ変更が可能です。",
    },
    saveExport: {
      title: "保存とエクスポート",
      p1: "「ファイル > プロジェクトZIPファイルをダウンロード」でプロジェクト全体(チャート・設定・メモ・履歴)を1つのZIPファイルとして保存し、「プロジェクトZIPファイルをアップロード」で読み込みます。処理はすべてブラウザ内で行われ、データが外部に送信されることはありません。",
      p2: "「ファイル > JSONデータ」ではプロジェクトの生データをJSON形式で表示・コピー・読み込みできます。",
      p3: "「ファイル > エクスポート」からPDF(チャート全体を画像化)、Excel(表とチャートを再現したワークブック)、単体HTML(どのブラウザでも完成形のチャートを表示できる自己完結型ファイル)の3形式で出力できます。",
      note1: "データは自動保存されません。タブを閉じる前にプロジェクトをダウンロードしてください。",
    },
    historyUndo: {
      title: "元に戻す・履歴",
      p1: "「編集 > 元に戻す / やり直す」(または Ctrl+Z / Ctrl+Y)で編集操作を取り消せます。最大30ステップまで保持されます。",
      p2: "「履歴」ボタンからプロジェクト全体のスナップショットをコメント付きで保存し、後からその時点の状態を確認できます。過去の状態を表示中は「最新に戻る」で現在に戻ります。スナップショットはプロジェクトZIPに含まれます。",
    },
  },
};
