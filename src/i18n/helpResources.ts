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
      p3: "The project title sits in the top-center of the screen — click it to edit.",
      p4: "The quickest way to learn is the tutorial project: open the Welcome screen (\"Local Mode\" > \"Show Welcome Screen\" in the top-right corner) and select the tutorial sample.",
    },
    tableEditing: {
      title: "Editing Cells",
      p1: "Click a cell to select it, then simply start typing to edit (F2 and double-click also work). Japanese IME input types directly into the cell, Excel-style.",
      p2: "Date cells accept flexible input such as \"4/1\" and also offer a calendar picker.",
      p3: "Enter either the number of days or the end date — the other one is calculated automatically based on working days.",
      p4: "Enter an integer from 0 to 100 in the Progress cell. It is shown as a tag on the bar, and the tag changes color when the task is running behind its planned dates.",
    },
    tableColumns: {
      title: "Customizing Columns",
      p1: "Setting > Table lists every column with a visibility checkbox and a rename field — rename columns to fit your project (e.g., Text1 → Owner). You can also right-click a column header and choose \"Rename Column\" to rename it on the spot. The free-text columns Text1–7 are general-purpose (Text4–7 are hidden by default; turn them on here when you need them).",
      p2: "Drag a column header's border to resize it, or drag the header itself to reorder columns (No and WBS stay pinned to the front).",
      p3: "The table's right-click menu offers \"Hide Column(s)\" to quickly hide the selected columns, and a \"Show/Hide Column\" submenu to turn columns back on. The CP column can only be toggled from this submenu.",
      p4: "Turn on the hidden \"WBS\" column to get automatic outline numbers such as 1, 1-1, 1-1-2 derived from the separator hierarchy (read-only).",
      p5: "\"Date Cell Format\" in Setting > Table switches the date columns between short (M/d) and long (y/M/d) display.",
    },
    rowOperations: {
      title: "Row Operations",
      p1: "Right-click the table and choose Add Row to insert Chart / Event / Separator rows — one to five at a time, or any count via \"Custom\". New rows are inserted above the clicked (or first selected) row.",
      p2: "Select multiple rows on the No column (Shift+click / drag) to copy, cut and insert them together. When whole rows are selected, Ctrl+C / Ctrl+V also copy and insert.",
      p3: "To reorder rows, select them on the No column and drag.",
      p4: "Separator rows take a hierarchy level (1–5) via right-click > Set Level. Headers indent by level, and collapsing a separator hides all of its descendant rows.",
      p5: "Collapse/expand a section with the triangle on either the table or the chart side, or with the Left/Right arrow keys while the separator's name cell is selected.",
      p6: "Right-click > Functions > \"Convert DisplayName only rows to separators\" turns name-only rows (no dates) into separators in bulk.",
      note1: "A project can hold up to 999 rows.",
    },
    chartBars: {
      title: "Chart Bars",
      p1: "Double-click an empty area of the chart to start drawing a planned bar. Move the mouse to stretch it, then click to fix it.",
      p2: "Hold Shift and double-click to draw an actual bar. Actual bars are drawn over planned bars in a translucent color.",
      p3: "Drag the middle of a bar to move it. Drag either end to change its start or end date.",
      p4: "The task name shown next to a planned bar is editable in place — click it on the chart and type.",
      p5: "Drag an empty part of the chart to pan the view. Scrolling the mouse wheel over the calendar header zooms the day-column width (3–21px) toward the cursor; Shift+wheel scrolls horizontally.",
      note1: "Right-click directly on a bar to delete just that bar (planned or actual) or to edit the row's dependency.",
    },
    eventRows: {
      title: "Event Rows",
      p1: "Event rows hold any number of bars or milestones in a single row — useful for recurring meetings, releases or review dates. Double-click an empty area to add a planned event bar, or Shift+double-click for an actual one.",
      p2: "Each event bar moves and resizes independently, has its own label (click it to edit), and is deleted individually via right-click > Delete Bar.",
    },
    dependencies: {
      title: "Dependencies",
      p1: "Enter a dependency in the Dependency column to chain tasks: when the preceding task moves, the dates of dependent tasks are recalculated automatically.",
      format: "[Relationship Type], [Target Row], [Offset Days]",
      p2: "Editing a dependency cell opens a builder popover: choose the target row (absolute row No or relative ± offset), the relationship (start after end / start same day) and the offset days. While it is open, the source row (blue) and target row (red) are highlighted on the chart and changes apply live.",
      p3: "The builder also opens from a bar's right-click menu (\"Edit dependency\"). To chain many rows at once, select them and use right-click > Functions > \"Create task chain\" — they are linked top to bottom.",
    },
    criticalPath: {
      title: "Critical Path",
      p1: "Enter predecessor row numbers (No) in the CP column to define which tasks logically follow which. This network is independent of the Dependency column and never moves any dates.",
      p2: "Turn on Setting > Show Critical Path (also available in the right-click menu) to highlight critical tasks in red and dim the others. Link arrows are drawn between tasks, and each task's float (slack in working days) is shown next to the bar label.",
      p3: "Right-click > Functions offers bulk CP editing: \"Create critical path chain\" connects the selected rows in order (overwriting their links), \"Add critical path predecessors\" appends the other selected rows as predecessors of the last one (creating a merge), and \"Clear critical path links\" removes links for the selection or for all rows.",
    },
    daysOff: {
      title: "Days Off",
      p1: "Configure public holidays and regular days off (weekdays) in Setting > Days Off. Days off are shaded on the chart and excluded from day counts and dependency calculations.",
      p2: "Holidays are entered as plain text, one date per line. Any text after the date (such as the holiday's name) is kept as a memo.",
      p3: "Regular days off come in two groups, each with its own shading color — for example weekends in one color and company closures in another.",
      p4: "Check a row's IncHol column to let that task run through days off: its day count switches to calendar days and the planned end date is recalculated.",
    },
    colors: {
      title: "Bar Colors",
      p1: "Setting > Chart Setting holds the color palette: each entry pairs a color swatch with its aliases (matching values). Aliases are comma-separated, so one entry can match several words (e.g., \"Team A, Sato\"), and entries can be added or removed freely.",
      p2: "Type an alias into a row's Color column to recolor its planned bar. Values that match no alias fall back to the default color. The actual-bar color is configured on the same screen.",
      p3: "The coloring basis can be switched from the Color column to any text column — color by company, assignee or work type, for example. Switch it from the \"Coloring\" menu in the top bar, from right-click > \"Color Basis\", or from the selector in Chart Setting. Each basis column keeps its own palette, so switching back and forth loses nothing.",
      p4: "When you switch to a column, its values are registered into that palette and colored automatically; adjust individual colors afterwards as you like. Right-click > Functions > \"Auto color setting\" (or \"Auto Assign Colors\" in Chart Setting) re-runs this auto-assignment for new values.",
    },
    notes: {
      title: "Notes",
      p1: "Click Notes in the top bar to open the notes window: a tree of notes on the left and a rich-text editor on the right. Use it for meeting minutes and background information — notes are saved into the project file.",
      p2: "Add, rename and delete notes from the tree pane. Notes can be nested freely, and the window can be moved and resized.",
      p3: "Rows can carry their own notes too: hover over a row on the chart and click the sticky-note icon to open a draggable, resizable note window (several can be open at once). Row notes are also listed under \"Task Notes\" in the notes window, and an arrow points from the task's position on the chart to the note being viewed. Esc closes the frontmost note window.",
    },
    saveExport: {
      title: "Save & Export",
      p1: "File > Download saves the whole project (chart, settings, notes and history) as a single ZIP file, and File > Upload loads it back. Everything runs inside your browser — no data ever leaves your machine.",
      p2: "File > JSON Data lets you view, copy and import the raw project data as JSON. Ctrl+Shift+J copies the same JSON straight to the clipboard.",
      p3: "File > Export offers three formats: PDF (the full chart as an image), Excel (a styled workbook that reproduces the table and chart), and Standalone HTML (a single self-contained file that shows the finished chart in any browser). When the project has notes, the Excel export first asks whether to include the notes sheet.",
      note1: "Nothing is saved automatically. Download your project before closing the tab.",
    },
    historyUndo: {
      title: "Undo & History",
      p1: "Edit > Undo / Redo (or Ctrl+Z / Ctrl+Y) reverts editing operations. Up to 30 steps are kept, and the Edit menu shows how many steps remain in each direction.",
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
      p3: "画面上部中央のプロジェクトタイトルは、クリックしてそのまま編集できます。",
      p4: "一番の近道はチュートリアルプロジェクトです。右上の「ローカルモード」>「ようこそ画面を表示」からようこそ画面を開き、チュートリアルサンプルを選択してください。",
    },
    tableEditing: {
      title: "セルの編集",
      p1: "セルはクリックして選択し、そのまま入力を始めると編集できます(F2キーやダブルクリックでも編集開始)。日本語入力もExcelのようにセルへ直接入力できます。",
      p2: "日付セルは「4/1」のような柔軟な入力に対応し、カレンダーからの選択もできます。",
      p3: "日数または終了日のどちらかを入力すると、もう一方は稼働日ベースで自動計算されます。",
      p4: "進捗セルには0〜100の整数を入力します。バー上のタグとして表示され、予定より遅れているタスクはタグの色が変わります。",
    },
    tableColumns: {
      title: "列のカスタマイズ",
      p1: "「設定 > 表設定」に全列の表示チェックボックスと列名の入力欄があり、プロジェクトに合わせて列名を自由に変更できます(例: Text1 → 担当者)。列のヘッダーを右クリックして「列名を変更」を選ぶと、その場で列名を変更することもできます。Text1〜7は自由に使えるフリーテキスト列です(Text4〜7は既定で非表示なので、必要になったらここで表示してください)。",
      p2: "列幅は列ヘッダの境界をドラッグして変更できます。列ヘッダ自体をドラッグすると列の並び替えができます(No列とWBS列は先頭に固定)。",
      p3: "テーブルの右クリックメニューの「列を非表示」で選択中の列をすばやく隠せます。再表示は「列表示」サブメニューから。CP列の表示/非表示はこのサブメニューでのみ切り替えられます。",
      p4: "既定で非表示の「WBS」列を表示すると、セパレータの階層から 1、1-1、1-1-2 のようなアウトライン番号が自動で振られます(読み取り専用)。",
      p5: "「設定 > 表設定」の「日付セル表示形式」で、日付列の表示を短(M/d)と長(y/M/d)で切り替えられます。",
    },
    rowOperations: {
      title: "行の操作",
      p1: "テーブルの右クリック >「行追加」から、チャート行 / イベント行 / セパレータ行を追加できます。1〜5行、または「カスタム」で任意の行数をまとめて追加できます。新しい行は右クリックした行(または選択範囲の先頭行)の上に挿入されます。",
      p2: "No列で複数行を選択(Shift+クリックやドラッグ)すると、コピー・切り取り・挿入をまとめて行えます。行全体を選択していれば Ctrl+C / Ctrl+V でもコピー・挿入できます。",
      p3: "行を並べ替えるには、No列で行を選択してドラッグします。",
      p4: "セパレータ行は右クリック >「階層設定」で1〜5段階の階層を設定できます。見出しは階層に応じてインデントされ、折りたたむと配下の行がすべて隠れます。",
      p5: "折りたたみ/展開は、テーブル側・チャート側どちらの見出しの三角クリックでも、セパレータの表示名セルを選択して左右矢印キーでも操作できます。",
      p6: "右クリック >「機能」>「表示名のみ行をセパレーターに変換」で、日付を持たない名前だけの行を一括でセパレータに変換できます。",
      note1: "1プロジェクトの行数は最大999行です。",
    },
    chartBars: {
      title: "チャートバーの操作",
      p1: "チャートの空いている場所をダブルクリックすると予定バーの作成が始まります。マウスを動かして期間を決め、クリックで確定します。",
      p2: "Shiftキーを押しながらダブルクリックすると実績バーを作成できます。実績バーは予定バーに半透明で重なって表示されます。",
      p3: "バーの中央をドラッグすると移動、両端をドラッグすると開始日・終了日を変更できます。",
      p4: "予定バーの横に表示されるタスク名は、チャート上でクリックしてそのまま編集できます。",
      p5: "チャートの何もない場所を左ドラッグすると画面をスクロールできます。カレンダー(日付ヘッダ)の上でマウスホイールを回すと、カーソル位置を中心に日付列の幅をズームできます(3〜21px)。Shift+ホイールで横スクロールします。",
      note1: "バーの上で直接右クリックすると、そのバー(予定または実績)だけの削除や、依存関係の編集ができます。",
    },
    eventRows: {
      title: "イベント行",
      p1: "イベント行は1行に何個でもバーやマイルストーンを置ける行で、定例会議・リリース・レビュー日などに便利です。空きエリアをダブルクリックすると予定イベントバーが、Shift+ダブルクリックで実績イベントバーが追加されます。",
      p2: "それぞれのバーは個別にドラッグ移動・伸縮でき、名前もバーごとに付けられます(クリックで編集)。削除はバーの右クリック >「削除」で1つずつ行えます。",
    },
    dependencies: {
      title: "依存関係",
      p1: "依存関係列に入力するとタスク同士が連動し、先行タスクを動かすと後続タスクの日付が自動で再計算されます。",
      format: "[関係タイプ], [対象行], [オフセット日数]",
      p2: "依存関係セルの編集を始めると設定ビルダーが開きます。対象行の指定(絶対=行番号 / 相対=±行数)、関係(終了後に開始 / 同じ日に開始)、オフセット日数をGUIで選べます。編集中は依存元の行(青)と依存先の行(赤)がチャート上でハイライトされ、変更は即座に反映されます。",
      p3: "ビルダーはチャートのバーを右クリック >「依存関係を編集」からも開けます。複数行をまとめてつなぐには、行を選択して右クリック >「機能」>「タスクチェーンを作成」を使うと、上から順に依存関係で連結されます。",
    },
    criticalPath: {
      title: "クリティカルパス",
      p1: "CP列に先行タスクの行番号(No)を入力して、タスクの論理的なつながり(CPネットワーク)を定義します。このネットワークは依存関係列とは独立しており、日付を動かすことはありません。",
      p2: "「設定 > クリティカルパスを表示」(右クリックメニューにもあります)をONにすると、クリティカルなタスクが赤く強調され、他のタスクは淡色表示になります。タスク間にはリンクの矢印が描かれ、各タスクの余裕日数(フロート)がバーのラベル横に表示されます。",
      p3: "右クリック >「機能」にはCP編集の一括操作があります。「CPチェーンを作成」は選択行を順に接続(リンクを上書き)、「CP先行に追加」は選択行を末尾行の先行として追記(合流の作成)、「CP先行をクリア」は選択行または全行のリンクを解除します。",
    },
    daysOff: {
      title: "休日設定",
      p1: "祝日と定休日(曜日)は「設定 > 休日設定」で設定します。休日はチャート上で色付けされ、日数計算や依存関係の計算から除外されます。",
      p2: "祝日はテキストで1行に1日付ずつ入力します。日付の後ろには祝日名などのメモを自由に書けます。",
      p3: "定休日は2つのグループに分けて設定でき、それぞれに別の背景色を割り当てられます(例: 土日と会社の休業日を色分け)。",
      p4: "特定のタスクだけ休日も含めて実施したい場合は、その行の「含休日」列にチェックを入れます。日数の数え方が暦日ベースに切り替わり、予定終了日が再計算されます。",
    },
    colors: {
      title: "バーの色",
      p1: "「設定 > チャート設定」にはカラーパレットがあり、各エントリに色とその意味(エイリアス)を設定できます。エイリアスはカンマ区切りで複数登録でき、1つのエントリに複数の語を対応させられます(例:「チームA, 佐藤」)。エントリは自由に追加・削除できます。",
      p2: "行の色列にエイリアス名を入力すると、その行の予定バーの色が変わります。どのエイリアスにも一致しない値はデフォルト色になります。実績バーの色も同じ画面で設定できます。",
      p3: "色分けの基準は色列だけでなく任意のテキスト列に切り替えられます。担当会社・担当者・作業種別などで色分けしたいときは、トップバーの「色分け」メニュー、右クリック >「色分け基準」、またはチャート設定のセレクタから切り替えてください。基準列ごとに独立したパレットが保持されるので、切り替えても設定は失われません。",
      p4: "基準列を切り替えると、その列の値がパレットへ自動登録されて色が割り当てられます。個々の色は後から自由に調整できます。値が増えたときは右クリック >「機能」>「自動カラー設定」(チャート設定の「値から自動割り当て」でも同じ)で再割り当てできます。",
    },
    notes: {
      title: "メモ帳",
      p1: "トップバーの「メモ帳」をクリックすると、左にメモのツリー、右にリッチテキストエディタを備えたメモウィンドウが開きます。議事録や補足情報の記録に使え、メモはプロジェクトファイルと一緒に保存されます。",
      p2: "ツリーペインでメモの追加・名前変更・削除ができます。メモは自由に階層化でき、ウィンドウは移動やサイズ変更が可能です。",
      p3: "行ごとのメモも書けます。チャート側で行にマウスを乗せると付箋アイコンが表示され、クリックするとドラッグ移動・リサイズ可能なメモウィンドウが開きます(同時に複数開けます)。行メモはメモ帳の「タスクメモ」一覧からも開け、表示中はチャート上のタスク位置からメモへ矢印が表示されます。最前面のメモウィンドウはEscキーで閉じられます。",
    },
    saveExport: {
      title: "保存とエクスポート",
      p1: "「ファイル > プロジェクトZIPファイルをダウンロード」でプロジェクト全体(チャート・設定・メモ・履歴)を1つのZIPファイルとして保存し、「プロジェクトZIPファイルをアップロード」で読み込みます。処理はすべてブラウザ内で行われ、データが外部に送信されることはありません。",
      p2: "「ファイル > JSONデータ」ではプロジェクトの生データをJSON形式で表示・コピー・読み込みできます。Ctrl+Shift+J で同じJSONを直接クリップボードにコピーすることもできます。",
      p3: "「ファイル > エクスポート」からPDF(チャート全体を画像化)、Excel(表とチャートを再現したワークブック)、単体HTML(どのブラウザでも完成形のチャートを表示できる自己完結型ファイル)の3形式で出力できます。メモがあるプロジェクトでは、Excel出力時にメモシートを含めるかどうかを選択できます。",
      note1: "データは自動保存されません。タブを閉じる前にプロジェクトをダウンロードしてください。",
    },
    historyUndo: {
      title: "元に戻す・履歴",
      p1: "「編集 > 元に戻す / やり直す」(または Ctrl+Z / Ctrl+Y)で編集操作を取り消せます。最大30ステップまで保持され、残り回数は「編集」メニューに表示されます。",
      p2: "「履歴」ボタンからプロジェクト全体のスナップショットをコメント付きで保存し、後からその時点の状態を確認できます。過去の状態を表示中は「最新に戻る」で現在に戻ります。スナップショットはプロジェクトZIPに含まれます。",
    },
  },
};
