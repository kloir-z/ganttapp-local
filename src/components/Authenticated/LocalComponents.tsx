// LocalComponents.tsx
import React from 'react';
import Gantt from '../Gantt/Gantt';
import SettingsModalBasic from '../Setting/Basic/SettingsModalBasics';
import SettingsModalChart from '../Setting/Chart/SettingsModalChart';
import SettingsModalTable from '../Setting/Table/SettingsModalTable';
import SettingsModalDaysOff from '../Setting/DaysOff/SettingsModalDaysOff';
import NotesModal from '../Topbar/Notes/NotesModal';
import WelcomeModal from '../Welcome/WelcomeModal';
import HistoryModal from '../History/HistoryModal';

const LocalComponents: React.FC = () => (
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

export default LocalComponents;