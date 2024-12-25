import React from 'react';
import { View } from '@tarojs/components';
import { withAuth } from '../../utils/auth';

function CourseList() {
  return (
    <View>Course List</View>
  );
}

export default withAuth(CourseList);
