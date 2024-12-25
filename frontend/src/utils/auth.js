import Storage from './storage';

export function withAuth(WrappedComponent) {
  return class extends React.Component {
    componentDidMount() {
      this.checkAuth();
    }

    async checkAuth() {
      const token = await Storage.get('token');
      if (!token) {
        window.location.href = '/login';
      }
    }

    render() {
      return <WrappedComponent {...this.props} />;
    }
  };
}
