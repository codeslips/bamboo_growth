import React from 'react';
import Page from './Page';

const LessonPage = ({
  lesson,
  mode,
  setMarkdownContent,
}) => {
  return (
    <Page
      pageHash={lesson.hash}
      mode={mode}
      pageType="lesson"
      setMarkdownContent={setMarkdownContent}
    />
  );
};

export default LessonPage;
