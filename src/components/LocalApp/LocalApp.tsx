import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../reduxStoreAndSlices/store';
import { setLanguage } from '../../reduxStoreAndSlices/baseSettingsSlice';
import i18n from "i18next";
import { setActiveModal, setIsLoading } from '../../reduxStoreAndSlices/uiFlagSlice';
import LocalComponents from '../Authenticated/LocalComponents';
import { Helmet } from 'react-helmet-async';
import useResetReduxStates from '../../hooks/useResetReduxStates';
import { WelcomeUtils } from '../../utils/WelcomeUtils';

const LocalApp: React.FC = () => {
    const dispatch = useDispatch();
    const resetReduxStates = useResetReduxStates();
    const isLoading = useSelector((state: RootState) => state.uiFlags.isLoading);
    const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);

    useEffect(() => {
        const initializeLocalApp = async () => {
            try {
                dispatch(setLanguage(i18n.language));
                await resetReduxStates({ skipNavigation: true });
                dispatch(setIsLoading(false));
            } catch (error) {
                console.error('Error initializing local app:', error);
            }
        };
        initializeLocalApp();
        if (WelcomeUtils.isFirstLogin() && activeModal !== 'welcome') {
            dispatch(setActiveModal('welcome'));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <>
            <Helmet>
                <meta
                    httpEquiv="Content-Security-Policy"
                    content="default-src 'self' https://fonts.gstatic.com; 
                script-src 'self'; 
                style-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com 'unsafe-inline'; 
                img-src 'self' data:;"
                />
            </Helmet>
            {!isLoading ? <LocalComponents /> : <div style={{ padding: '10px' }}>Loading...</div>}
        </>
    );
};

export default LocalApp;