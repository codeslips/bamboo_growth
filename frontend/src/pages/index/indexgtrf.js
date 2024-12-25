import React, { useEffect } from 'react'
import { View, Text } from '@tarojs/components'
import './index.scss'

function Index() {
  useEffect(() => {
    // This replaces componentDidMount, componentDidUpdate, and componentWillUnmount
    console.log('Component mounted or updated')
    return () => {
      console.log('Component will unmount')
    }
  }, [])

  // These would typically be handled by the router or a higher-level component
  // useEffect(() => {
  //   console.log('Component shown')
  // }, [])

  // useEffect(() => {
  //   return () => {
  //     console.log('Component hidden')
  //   }
  // }, [])

  return (
    <View className='index'>
      <Text>Hello Bamboo Language!</Text>
    </View>
  )
}

export default Index