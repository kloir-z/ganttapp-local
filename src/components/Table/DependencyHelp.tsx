// src/components/Table/DependencyHelp/DependencyHelp.tsx
import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface DependencyHelpProps {
    show: boolean;
    wbsWidth: number;
}

const DependencyHelp: React.FC<DependencyHelpProps> = memo(({ show, wbsWidth }) => {
    const { t } = useTranslation();
    const [isExpanded, setIsExpanded] = useState(false);

    if (!show) return null;

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    const minimize = () => {
        setIsExpanded(false);
    };

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

    // ボタンコンテナのスタイル
    const buttonContainerStyle = {
        position: 'absolute' as const,
        top: '8px',
        right: '8px',
        display: 'flex',
        gap: '4px'
    };

    // 最小化ボタンのスタイル
    const minimizeButtonStyle = {
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

    // 閉じるボタンのスタイル
    const closeButtonStyle = {
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
                onClick={toggleExpanded}
                title={t("Show dependency format help")}
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
            <div style={buttonContainerStyle}>
                <button
                    style={minimizeButtonStyle}
                    onClick={minimize}
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
                <button
                    style={closeButtonStyle}
                    onClick={() => setIsExpanded(false)}
                    title={t("Close")}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e9ecef';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    ×
                </button>
            </div>

            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#007bff' }}>
                ℹ️ {t("Dependency Format")}
            </div>
            <div style={{ marginBottom: '12px' }}>
                <div><strong>{t("Basic Format")}:</strong></div>
                <div style={{ marginLeft: '12px', backgroundColor: '#e9ecef', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>
                    [{t("Relationship Type")}], [{t("Target Row Specification")}], [{t("Offset Days")}]
                </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div><strong>{t("Relationship Type")}:</strong></div>
                <div style={{ marginLeft: '12px' }}>
                    <div>• <strong>{t("after")}:</strong> {t("after_description")}</div>
                    <div>• <strong>{t("sameas")}:</strong> {t("sameas_description")}</div>
                </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div><strong>{t("Target Row Specification")}:</strong></div>
                <div style={{ marginLeft: '12px' }}>
                    <div>• <strong>{t("plus_number")}:</strong> {t("plus_number_description")}</div>
                    <div>• <strong>{t("minus_number")}:</strong> {t("minus_number_description")}</div>
                    <div>• <strong>{t("number_only")}:</strong> {t("number_only_description")}</div>
                </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div><strong>{t("Offset Days")}:</strong></div>
                <div style={{ marginLeft: '12px' }}>
                    <div>• {t("positive_number")}</div>
                    <div>• {t("negative_number")}</div>
                    <div>• {t("default_offset")}</div>
                </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div><strong>{t("Examples")}:</strong></div>
                <div style={{ marginLeft: '12px', backgroundColor: '#e9ecef', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontFamily: 'monospace', marginBottom: '4px' }}>after, -1, 1</div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>→ {t("example_1")}</div>

                    <div style={{ fontFamily: 'monospace', marginBottom: '4px' }}>after, +2, 3</div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>→ {t("example_2")}</div>

                    <div style={{ fontFamily: 'monospace', marginBottom: '4px' }}>sameas, 5</div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>→ {t("example_3")}</div>

                    <div style={{ fontFamily: 'monospace', marginBottom: '4px' }}>after, -1, -2</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>→ {t("example_4")}</div>
                </div>
            </div>

            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fff3cd', borderRadius: '4px', fontSize: '12px' }}>
                <div>• {t("note_1")}</div>
                <div>• {t("note_2")}</div>
                <div>• {t("note_3")}</div>
            </div>
        </div>
    );
});

DependencyHelp.displayName = 'DependencyHelp';

export default DependencyHelp;