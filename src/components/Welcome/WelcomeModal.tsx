import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { handleImport } from '../../utils/ExportImportHandler';
import { setActiveModal, setIsLoading } from '../../reduxStoreAndSlices/uiFlagSlice';
import { WelcomeUtils } from '../../utils/WelcomeUtils';
import { AppDispatch, RootState } from '../../reduxStoreAndSlices/store';
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    Typography,
    Box,
    CircularProgress,
    FormControlLabel,
    Checkbox,
    Button,
    Paper,
    Alert
} from '@mui/material';

interface SampleDefinition {
    id: string;
    titleKey: string;
    descriptionKey: string;
    filename: string;
}

const WelcomeModal: React.FC = () => {
    const dispatch = useDispatch<AppDispatch>();
    const activeModal = useSelector((state: RootState) => state.uiFlags.activeModal);
    const language = useSelector((state: RootState) => state.baseSettings.language);
    const [availableSamples, setAvailableSamples] = useState<SampleDefinition[]>([]);
    const [loading, setLoading] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);
    const [isCheckingSamples, setIsCheckingSamples] = useState(true);
    const { t } = useTranslation();

    const sampleDefinitions = useMemo<SampleDefinition[]>(() => {
        if (language === 'ja') {
            return [
                {
                    id: "corporate-site-renewal",
                    titleKey: "samples.corporateSiteRenewal.title",
                    descriptionKey: "samples.corporateSiteRenewal.description",
                    filename: "[サンプル]コーポレートサイトリニューアルプロジェクト.zip"
                },
                {
                    id: "mobile-app-development",
                    titleKey: "samples.mobileAppDevelopment.title",
                    descriptionKey: "samples.mobileAppDevelopment.description",
                    filename: "[サンプル]スマートフォンアプリ開発プロジェクト.zip"
                },
                {
                    id: "autumn-food-exhibition",
                    titleKey: "samples.autumnFoodExhibition.title",
                    descriptionKey: "samples.autumnFoodExhibition.description",
                    filename: "[サンプル]秋の食品見本市出展プロジェクト.zip"
                }
            ];
        } else {
            return [
                {
                    id: "restaurant-opening",
                    titleKey: "samples.restaurantOpening.title",
                    descriptionKey: "samples.restaurantOpening.description",
                    filename: "[Sample]Restaurant Opening Project.zip"
                },
                {
                    id: "software-product-launch",
                    titleKey: "samples.softwareProductLaunch.title",
                    descriptionKey: "samples.softwareProductLaunch.description",
                    filename: "[Sample]Software Product Launch.zip"
                },
                {
                    id: "wedding-planning",
                    titleKey: "samples.weddingPlanning.title",
                    descriptionKey: "samples.weddingPlanning.description",
                    filename: "[Sample]Wedding Planning Project.zip"
                }
            ];
        }
    }, [language]);

    const handleClose = useCallback(() => {
        if (dontShowAgain) {
            WelcomeUtils.markWelcomeCompleted();
        }
        dispatch(setActiveModal(null));
    }, [dispatch, dontShowAgain]);

    const checkSampleAvailability = useCallback(async () => {
        setIsCheckingSamples(true);
        const availableList: SampleDefinition[] = [];

        for (const sample of sampleDefinitions) {
            try {
                const response = await fetch(`${import.meta.env.BASE_URL}samples/${sample.filename}`, { method: 'HEAD' });
                if (response.ok) {
                    availableList.push(sample);
                }
            } catch (error) {
                console.warn(`Sample file not found: ${sample.filename}`);
            }
        }

        setAvailableSamples(availableList);
        setIsCheckingSamples(false);
    }, [sampleDefinitions]);

    const handleSampleSelect = useCallback(async (sampleDef: SampleDefinition) => {
        setLoading(true);
        dispatch(setIsLoading(true));

        try {
            const response = await fetch(`${import.meta.env.BASE_URL}samples/${sampleDef.filename}`);
            if (!response.ok) {
                throw new Error('Failed to fetch sample data');
            }
            const blob = await response.blob();

            const result = await dispatch(handleImport(blob));

            if (handleImport.rejected.match(result)) {
                throw new Error(result.error?.message || 'Failed to import sample data');
            }

            handleClose();
        } catch (error) {
            console.error('Failed to load sample:', error);
        } finally {
            setLoading(false);
            dispatch(setIsLoading(false));
        }
    }, [dispatch, handleClose]);

    useEffect(() => {
        if (activeModal === 'welcome') {
            checkSampleAvailability();
        }
    }, [checkSampleAvailability, activeModal, dispatch]);

    useEffect(() => {
        if (activeModal === 'welcome') {
            checkSampleAvailability();
        }
    }, [language, checkSampleAvailability, activeModal]);

    return (
        (activeModal === 'welcome') && (
            <Dialog
                open={true}
                onClose={loading ? undefined : handleClose}
                maxWidth="md"
                fullWidth
                disableEscapeKeyDown={loading}
                PaperProps={{
                    sx: { height: '80vh' }
                }}
            >
                <DialogTitle>
                    <Typography variant="h4" component="div" gutterBottom>
                        {t('Welcome to Gantty!')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {t('Would you like to try Gantty features with sample data?')}
                    </Typography>
                </DialogTitle>

                <DialogContent dividers>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                            {t('samples.aiGeneratedNotice')}
                        </Typography>
                    </Alert>

                    {isCheckingSamples ? (
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            py: 6 
                        }}>
                            <CircularProgress size={24} sx={{ mr: 2 }} />
                            <Typography variant="body2" color="text.secondary">
                                {t('Loading sample data...')}
                            </Typography>
                        </Box>
                    ) : availableSamples.length > 0 ? (
                        <Grid container spacing={2}>
                            {availableSamples.map((sampleDef) => (
                                <Grid item xs={12} sm={6} md={4} key={sampleDef.id}>
                                    <Paper 
                                        variant="outlined" 
                                        sx={{ 
                                            p: 2, 
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            opacity: loading ? 0.6 : 1,
                                            transition: 'all 0.2s ease-in-out',
                                            '&:hover': loading ? {} : {
                                                transform: 'translateY(-2px)',
                                                boxShadow: 2,
                                                borderColor: 'primary.main'
                                            }
                                        }}
                                        onClick={() => !loading && handleSampleSelect(sampleDef)}
                                    >
                                        <Typography 
                                            variant="h6" 
                                            component="h3" 
                                            gutterBottom
                                            sx={{ 
                                                fontWeight: 600,
                                                wordBreak: 'break-word',
                                                hyphens: 'auto'
                                            }}
                                        >
                                            {t(sampleDef.titleKey)}
                                        </Typography>
                                        <Typography 
                                            variant="body2" 
                                            color="text.secondary"
                                            sx={{ 
                                                lineHeight: 1.6,
                                                wordBreak: 'break-word',
                                                hyphens: 'auto'
                                            }}
                                        >
                                            {t(sampleDef.descriptionKey)}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 6 }}>
                            <Typography variant="h6" color="text.secondary">
                                {t('No sample data available')}
                            </Typography>
                        </Box>
                    )}

                    {loading && (
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            mt: 4,
                            p: 3,
                            borderRadius: 1,
                            backgroundColor: 'background.paper',
                            border: 1,
                            borderColor: 'divider'
                        }}>
                            <CircularProgress size={24} sx={{ mr: 2 }} />
                            <Typography variant="body2" color="text.secondary">
                                {t('Loading sample data...')}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ justifyContent: 'space-between' }}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                disabled={loading}
                            />
                        }
                        label={
                            <Typography variant="body2" color="text.secondary">
                                {t("Don't show this again")}
                            </Typography>
                        }
                    />
                    <Button onClick={handleClose} disabled={loading}>
                        {t('Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        )
    );
};

export default WelcomeModal;