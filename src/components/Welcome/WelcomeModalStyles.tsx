import styled from 'styled-components';
import { css, keyframes } from 'styled-components';

const createFadeAnimation = (fromOpacity: number, toOpacity: number) => keyframes`
  from { opacity: ${fromOpacity}};
  to { opacity: ${toOpacity}};
`;

const fadeAnimation = (fromOpacity: number, toOpacity: number) => css`
  animation: ${createFadeAnimation(fromOpacity, toOpacity)} 0.2s ease-out forwards;
`;

export const WelcomeOverlay = styled.div<{ $fadeStatus: 'in' | 'out' }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.163);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 11;
  ${props => props.$fadeStatus === 'out' ? fadeAnimation(1, 0) : fadeAnimation(0, 1)}
  border: none;
  color: #ebebeb;
`;

export const WelcomeModalContainer = styled.div<{ $fadeStatus: 'in' | 'out' }>`
  will-change: transform;
  display: flex;
  flex-direction: column;
  max-width: 800px;
  max-height: 80vh;
  overflow-y: auto;
  background: #ffffff;
  border: solid 1px rgb(83 87 97);
  border-radius: 5px;
  z-index: 15;
  ${props => props.$fadeStatus === 'out' ? fadeAnimation(1, 0) : fadeAnimation(0, 1)}
  color: #1b1b1b;
`;

export const WelcomeModalDragBar = styled.div`
  position: relative;
  width: 100%;
  height: 25px;
  padding: 5px;
  border-bottom: 1px solid #eeeeee;
  border-radius: 5px 5px 0px 0px;
  background-color: #f8f8f8;
`;

export const WelcomeModalCloseButton = styled.button`
  position: absolute;
  display: flex;
  right: 0px;
  top: 0px;
  padding: 2.5px;
  border: none;
  border-radius: 0px 5px 0px 0px;
  cursor: pointer;
  background-color: transparent;
  
  &:hover {
    background-color: #e0e0e0;
  }
`;

export const WelcomeModalHeader = styled.div`
  text-align: center;
  padding: 24px 24px 16px 24px;
  
  h2 {
    color: #1b1b1b;
    margin: 0 0 8px 0;
    font-size: 1.5em;
  }
  
  p {
    color: #666666;
    margin: 0;
    font-size: 1em;
  }
`;

export const WelcomeModalContent = styled.div`
  padding: 0 24px 24px 24px;
`;

export const SampleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

export const SampleCard = styled.div<{ $disabled?: boolean }>`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.6 : 1};
  transition: all 0.2s ease;
  background-color: #ffffff;
  
  &:hover {
    ${props => !props.$disabled && css`
      border-color: #007bff;
      box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
    `}
  }
  
  h3 {
    margin: 0 0 8px 0;
    color: #1b1b1b;
    font-size: 1.1em;
  }
  
  p {
    margin: 0;
    color: #666666;
    font-size: 0.9em;
    line-height: 1.4;
  }
`;

export const WelcomeModalFooter = styled.div`
  text-align: center;
  padding: 0 24px 24px 24px;
`;

export const SkipButton = styled.button<{ $disabled?: boolean }>`
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.6 : 1};
  font-size: 0.9em;
  transition: background-color 0.2s ease;
  
  &:hover:not(:disabled) {
    background: #5a6268;
  }
`;