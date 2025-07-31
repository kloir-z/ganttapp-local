import { AppDispatch, RootState } from "../reduxStoreAndSlices/store";
import { addSnapshot } from "../reduxStoreAndSlices/historySlice";
import { handleImport } from "./ExportImportHandler";
import { compressData, decompressData, isCompressedData } from "./CompressionUtils";

export const createSnapshot = async (
  commitMessage: string,
  dispatch: AppDispatch,
  state: RootState
) => {
  try {
    // Create project data directly as JSON (not ZIP)
    const projectData = {
      colors: state.color.colors,
      fallbackColor: state.color.fallbackColor,
      columns: state.wbsData.columns,
      data: state.wbsData.data,
      holidayInput: state.baseSettings.holidayInput,
      regularDaysOffSetting: state.wbsData.regularDaysOffSetting,
      title: state.baseSettings.title,
      dateFormat: state.wbsData.dateFormat,
      treeData: state.notes.treeData,
      noteData: state.notes.noteData,
    };



    const jsonString = JSON.stringify(projectData, null, 2);
    
    // データを圧縮
    const compressedData = await compressData(jsonString);

    dispatch(addSnapshot({
      commitMessage,
      projectDataSnapshot: compressedData,
    }));

    return true;
  } catch (error) {
    console.error('Failed to create snapshot:', error);
    return false;
  }
};

export const getCurrentProjectDataAsJson = (state: RootState): string => {
  const projectData = {
    colors: state.color.colors,
    fallbackColor: state.color.fallbackColor,
    columns: state.wbsData.columns,
    data: state.wbsData.data,
    holidayInput: state.baseSettings.holidayInput,
    regularDaysOffSetting: state.wbsData.regularDaysOffSetting,
    title: state.baseSettings.title,
    dateFormat: state.wbsData.dateFormat,
    treeData: state.notes.treeData,
    noteData: state.notes.noteData,
  };

  return JSON.stringify(projectData, null, 2);
};

// Get preview data for a specific snapshot ID
export const getPreviewData = async (state: RootState, snapshotId: string) => {
  const snapshot = state.history?.snapshots?.find(s => s.id === snapshotId);
  if (!snapshot) return null;
  
  try {
    let jsonString: string;
    
    // 圧縮データかどうかをチェック
    if (isCompressedData(snapshot.projectDataSnapshot)) {
      // 圧縮データを展開
      jsonString = await decompressData(snapshot.projectDataSnapshot);
    } else {
      // 文字列データ（後方互換）
      jsonString = snapshot.projectDataSnapshot as string;
    }
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse snapshot data:', error);
    return null;
  }
};

// Restore application state from a snapshot
export const restoreFromSnapshot = async (
  snapshotData: string,
  dispatch: AppDispatch
): Promise<boolean> => {
  try {
    // Create a JSON blob from the snapshot data
    const jsonBlob = new Blob([snapshotData], { 
      type: 'application/json' 
    });
    
    // Use existing import logic to restore state (skip history import to avoid overwriting)
    await dispatch(handleImport({ file: jsonBlob, skipHistoryImport: true }));
    
    return true;
  } catch (error) {
    console.error('Failed to restore from snapshot:', error);
    return false;
  }
};