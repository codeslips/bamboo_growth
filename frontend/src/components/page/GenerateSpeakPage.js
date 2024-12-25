import React from 'react';
import GenerateSentences from '../course/GenerateSentences';

export default function GenerateSpeakPage({ onGenerateContent }) {
  return (
    <GenerateSentences onGenerateContent={onGenerateContent} />
  );
}
