import React, { ReactNode, memo } from 'react';

interface SettingChildDivProps {
  text: string;
  children?: ReactNode;
}

const SettingChildDiv: React.FC<SettingChildDivProps> = memo(({ text, children }) => {
  const boxStyle: React.CSSProperties = {
    border: '1px solid #ccc',
    borderRadius: '5px',
    margin: '10px 25px',
    padding: '20px 25px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minWidth: '330px',
    maxWidth: '1000px',
  };

  const titleStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-10px',
    left: '10px',
    margin: 0,
    padding: '0px 5px',
    background: '#FFF',
  };

  return (
    <>
      <div style={{ height: '15px' }}></div>
      <div style={boxStyle}>
        <h3 style={titleStyle}>{text}</h3>
        {children}
      </div>
    </>
  );
});

export default SettingChildDiv;