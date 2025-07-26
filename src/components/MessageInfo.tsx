import { memo, useCallback, useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { clearMessageInfo, RootState } from '../reduxStoreAndSlices/store';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

const MessageInfo = memo(() => {
  const messageInfo = useSelector((state: RootState) => state.wbsData.messageInfo);
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
    if (messageInfo.message) {
      setOpen(true);
    }
  }, [messageInfo.message]);

  const handleClose = useCallback((_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
    dispatch(clearMessageInfo());
  }, [dispatch]);

  return (
    <>
      {open && (
        <Snackbar open={open} autoHideDuration={10000} onClose={handleClose}>
          <Alert variant="filled" onClose={handleClose} severity={messageInfo.severity} sx={{ width: '100%' }}>
            {messageInfo.message}
          </Alert>
        </Snackbar>
      )}
    </>
  );
});

export default MessageInfo;