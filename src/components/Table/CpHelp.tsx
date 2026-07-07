// src/components/Table/CpHelp.tsx
// CP列(クリティカルパス先行)の書式ヘルプ。CP列が選択されている間だけ
// 「?」アイコンを出し、クリックでパネルに展開する(旧 DependencyHelp と同パターン)。
import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CpHelpProps {
    show: boolean;
    wbsWidth: number;
}

const CpHelp: React.FC<CpHelpProps> = memo(({ show, wbsWidth }) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!show) return null;

    const iconButtonStyle = {
        position: 'fixed' as const,
        top: '8px',
        left: `${wbsWidth - 36}px`,
        width: '32px',
        height: '32px',
        backgroundColor: '#007bff',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        transition: 'all 0.2s ease'
    };

    const expandedStyle = {
        position: 'fixed' as const,
        top: '70px',
        left: `${wbsWidth + 20}px`,
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        maxWidth: '650px',
        fontSize: '14px',
        lineHeight: '1.5'
    };

    const smallButtonStyle = {
        width: '24px',
        height: '24px',
        backgroundColor: 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        color: '#6c757d',
        transition: 'background-color 0.2s ease'
    };

    if (!isExpanded) {
        return (
            <button
                style={iconButtonStyle}
                onClick={() => setIsExpanded(true)}
                title={t("Show CP format help")}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0056b3';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#007bff';
                }}
            >
                ?
            </button>
        );
    }

    return (
        <div style={expandedStyle}>
            <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                <button
                    style={smallButtonStyle}
                    onClick={() => setIsExpanded(false)}
                    title={t("Minimize")}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e9ecef';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    −
                </button>
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#007bff' }}>
                ℹ️ {t("CP Predecessors Format")}
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div><strong>{t("Basic Format")}:</strong></div>
                <div style={{ marginLeft: '12px', backgroundColor: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                    {t("cp_basic_format")}
                </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div><strong>{t("Examples")}:</strong></div>
                <div style={{ marginLeft: '12px', backgroundColor: '#e9ecef', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontFamily: 'monospace', marginBottom: '4px' }}>3</div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>→ {t("cp_example_1")}</div>

                    <div style={{ fontFamily: 'monospace', marginBottom: '4px' }}>3, 5</div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>→ {t("cp_example_2")}</div>

                    <div style={{ fontFamily: 'monospace', marginBottom: '4px' }}>5+2</div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>→ {t("cp_example_3")}</div>

                    <div style={{ fontFamily: 'monospace', marginBottom: '4px' }}>5-1</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>→ {t("cp_example_4")}</div>
                </div>
            </div>

            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '12px' }}>
                <div>• {t("cp_note_1")}</div>
                <div>• {t("cp_note_2")}</div>
                <div>• {t("cp_note_3")}</div>
            </div>
        </div>
    );
});

CpHelp.displayName = 'CpHelp';

export default CpHelp;
