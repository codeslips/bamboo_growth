import React, { useState, useEffect } from 'react';
import { IconButton, AppBar, Toolbar, Tooltip, Paper, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import LanguageIcon from '@mui/icons-material/Language';

function Footer() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  const supportedLocales = Object.keys(i18n.options.resources);

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('preferredLanguage', lang);
    setOpen(false);
  };

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{
        top: 'auto',
        bottom: 0,
        backgroundColor: (theme) => theme.palette.background.paper,
      }}
    >
      <Toolbar sx={{ justifyContent: 'flex-end' }}>
        <Tooltip
          title={
            <Paper sx={{ display: 'flex', flexDirection: 'column' }}>
              {supportedLocales.map((lang) => (
                <Button
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  disabled={lang === i18n.language}
                  size="small"
                >
                  {lang.toUpperCase()}
                </Button>
              ))}
            </Paper>
          }
          open={open}
          onClose={() => setOpen(false)}
          onOpen={() => setOpen(true)}
          disableFocusListener
          disableTouchListener
        >
          <IconButton
            onClick={() => setOpen(!open)}
            color="primary"
            size="small"
            aria-label="change language"
          >
            <LanguageIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}

export default Footer;
