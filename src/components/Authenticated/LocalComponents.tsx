// LocalComponents.tsx
import React from 'react';
import { useJsonExport } from '../../hooks/useJsonExport';
import { useProjectSave } from '../../hooks/useProjectSave';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import Gantt from '../Gantt/Gantt';
import SettingsModalBasic from '../Setting/Basic/SettingsModalBasics';
import SettingsModalChart from '../Setting/Chart/SettingsModalChart';
import SettingsModalTable from '../Setting/Table/SettingsModalTable';
import SettingsModalDaysOff from '../Setting/DaysOff/SettingsModalDaysOff';
import NotesModal from '../Topbar/Notes/NotesModal';
import WelcomeModal from '../Welcome/WelcomeModal';
import HelpModal from '../Help/HelpModal';
import DraftsDialog from '../Drafts/DraftsDialog';

const LocalComponents: React.FC = () => {
    const { exportAndCopyJson } = useJsonExport();
    const { save, saveAs } = useProjectSave();

    useKeyboardShortcuts([
        {
            key: 'J',
            ctrlKey: true,
            shiftKey: true,
            callback: exportAndCopyJson
        },
        // ブラウザの「ページを保存」ではなく、プロジェクトを上書き保存する
        {
            key: 's',
            ctrlKey: true,
            callback: () => { void save(); }
        },
        {
            key: 'S',
            ctrlKey: true,
            shiftKey: true,
            callback: () => { void saveAs(); }
        }
    ]);

    return (
        <>
            <Gantt />
            <SettingsModalBasic />
            <SettingsModalChart />
            <SettingsModalTable />
            <SettingsModalDaysOff />
            <NotesModal />
            <WelcomeModal />
            <HelpModal />
            <DraftsDialog />
        </>
    );
};

export default LocalComponents;