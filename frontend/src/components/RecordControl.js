import React from 'react';
import { Fab, Box, Select, MenuItem } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import { useTranslation } from 'react-i18next';

const RecordControl = ({ onStartRecording, disabled, recordingRate, setRecordingRate }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ 
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 2
    }}>
      <Box sx={{ 
        position: 'absolute',
        right: '100%',
        marginRight: 1,
      }}>
        <Select
          value={recordingRate}
          onChange={(e) => setRecordingRate(e.target.value)}
          variant="standard"
          sx={{
            fontSize: '0.875rem',
            opacity: 0.75,
            transition: 'opacity 0.2s',
            '&:hover': {
              opacity: 1,
            },
            '.MuiSelect-select': {
              padding: '2px 0',
              color: 'text.secondary',
            },
            '.MuiSelect-icon': {
              opacity: 0.5,
              width: '0.8em',
              height: '0.8em',
            },
            '&:before, &:after': {
              display: 'none',
            },
          }}
        >
          <MenuItem value={0.7} sx={{ fontSize: '0.875rem' }}>{t('speed.particularlySlowLabel')}</MenuItem>
          <MenuItem value={0.8} sx={{ fontSize: '0.875rem' }}>{t('speed.slowLabel')}</MenuItem>
          <MenuItem value={0.9} sx={{ fontSize: '0.875rem' }}>{t('speed.normalLabel')}</MenuItem>
        </Select>
      </Box>
      <Fab
        color="primary"
        aria-label="record"
        onClick={onStartRecording}
        disabled={disabled}
      >
        <MicIcon />
      </Fab>
    </Box>
  );
};

export default RecordControl;
