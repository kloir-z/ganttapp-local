// LocalComponents.tsx
import React from 'react';
import { useJsonExport } from '../../hooks/useJsonExport';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import Gantt from '../Gantt/Gantt';
import SettingsModalBasic from '../Setting/Basic/SettingsModalBasics';
import SettingsModalChart from '../Setting/Chart/SettingsModalChart';
import SettingsModalTable from '../Setting/Table/SettingsModalTable';
import SettingsModalDaysOff from '../Setting/DaysOff/SettingsModalDaysOff';
import NotesModal from '../Topbar/Notes/NotesModal';
import WelcomeModal from '../Welcome/WelcomeModal';
import HistoryModal from '../History/HistoryModal';

const LocalComponents: React.FC = () => {
    const { exportAndCopyJson } = useJsonExport();

    useKeyboardShortcuts([
        {
            key: 'J',
            ctrlKey: true,
            shiftKey: true,
            callback: exportAndCopyJson
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
            <HistoryModal />
        </>
    );
};

export default LocalComponents;