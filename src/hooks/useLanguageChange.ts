// src/hooks/useLanguageChange.ts
import { useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, setColumns } from "../reduxStoreAndSlices/store";
import { setLanguage } from "../reduxStoreAndSlices/baseSettingsSlice";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { initialColumns } from "../reduxStoreAndSlices/initialColumns";

export const useLanguageChange = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const columns = useSelector((state: RootState) => state.wbsData.columns);

  const handleLanguageChange = useCallback((newLanguage: string) => {
    const columnsToTranslate = columns.map((column) => {
      const defaultColumn = initialColumns.find((c) => c.columnId === column.columnId);
      const shouldTranslate = defaultColumn && column.columnName === t(defaultColumn.columnName);
      return {
        ...column,
        defaultColumnName: defaultColumn ? defaultColumn.columnName : column.columnName,
        shouldTranslate,
      };
    });

    i18n.changeLanguage(newLanguage).then(() => {
      const translatedColumns = columnsToTranslate.map((column) => ({
        ...column,
        columnName: column.shouldTranslate ? t(column.defaultColumnName) : column.columnName,
      }));

      dispatch(setColumns(translatedColumns));
      dispatch(setLanguage(newLanguage));
    });
  },
    [columns, dispatch, t]
  );

  return handleLanguageChange;
};
