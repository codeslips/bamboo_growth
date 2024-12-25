import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Alert, Tabs, Tab } from '@mui/material';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import LessonContentEnglishWord from './lessonContent/LessonContentEnglishWord';
import LessonContentJudgeProblems from './lessonContent/LessonContentJudgeProblems';

// Map of content keys to their display names
const CONTENT_TYPE_COMPONENTS = {
  'englishWord': {
    label: 'English Word',
    component: LessonContentEnglishWord
  },
  'judgeProblems': {
    label: 'Judge Problems',
    component: LessonContentJudgeProblems
  }
  // Add more content types here as needed
  // 'otherType': { label: 'Other Type', component: OtherTypeComponent }
};

const LessonContentViewer = ({ lessonType, lessonContent }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState(null);
  const [availableTabs, setAvailableTabs] = useState(['raw']);
  const [activeTab, setActiveTab] = useState('raw');

  useEffect(() => {
    try {
      const parsedContent = typeof lessonContent === 'string' 
        ? JSON.parse(lessonContent) 
        : lessonContent;
      
      setContent(parsedContent);

      // Determine available tabs based on content keys
      const contentKeys = Object.keys(parsedContent || {});
      const tabs = ['raw'];
      contentKeys.forEach(key => {
        if (CONTENT_TYPE_COMPONENTS[key]) {
          tabs.push(key);
        }
      });
      setAvailableTabs(tabs);
      
      // If current tab is not available, switch to raw
      if (!tabs.includes(activeTab)) {
        setActiveTab('raw');
      }
    } catch (err) {
      console.error('Error parsing lesson content:', err);
      setError('Invalid JSON content');
      setContent(lessonContent || '');
      setAvailableTabs(['raw']);
      setActiveTab('raw');
    }
  }, [lessonContent]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const renderContent = () => {
    if (activeTab === 'raw') {
      return (
        <Paper 
          elevation={3} 
          sx={{ 
            flexGrow: 1,
            width: '98%',
            overflow: 'auto',
            '& .cm-editor': {
              height: '100%',
              minHeight: 'calc(100vh - 200px)'
            }
          }}
        >
          <CodeMirror
            value={typeof content === 'string' ? content : JSON.stringify(content, null, 2)}
            height="100%"
            extensions={[json()]}
            theme="light"
            editable={false}
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              dropCursor: false,
              allowMultipleSelections: false,
              indentOnInput: false,
            }}
          />
        </Paper>
      );
    }

    // Render specific component based on active tab
    const ComponentToRender = CONTENT_TYPE_COMPONENTS[activeTab]?.component;
    if (ComponentToRender && content[activeTab]) {
      return <ComponentToRender content={content[activeTab]} />;
    }

    return null;
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2,
      p: 2,
    }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6">
          Lesson Content ({lessonType})
        </Typography>
        
        <Tabs value={activeTab} onChange={handleTabChange}>
          {availableTabs.map(tab => (
            <Tab 
              key={tab}
              label={tab === 'raw' ? 'Raw JSON' : CONTENT_TYPE_COMPONENTS[tab]?.label || tab}
              value={tab}
            />
          ))}
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {renderContent()}
    </Box>
  );
};

export default LessonContentViewer;
