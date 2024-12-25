import React from 'react';
import LessonContentEditor from './LessonContentEditor';
import LessonContentViewer from './LessonContentViewer';

const LessonContent = ({ lessonHash, lessonType, lessonContent, onSave, mode }) => {
  console.log('mode', mode);

  return (
    <>
      {mode === 'edit' && <LessonContentEditor
        lessonType={lessonType}
        lessonContent={lessonContent}
        onSave={onSave}
        />
      }
      {mode === 'learn' && <LessonContentViewer
        lessonType={lessonType}
        lessonContent={lessonContent}
      />}
    </>
  );
};

export default LessonContent;